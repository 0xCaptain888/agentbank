// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/interfaces/IERC4626.sol";
import "./SolverRegistry.sol";

/// @title IntentRouter
/// @notice M24 intent-based architecture for matching user intents with solver bids
contract IntentRouter is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum Status { Open, Filled, Expired, Cancelled }

    struct Intent {
        uint256 id;
        address user;
        address asset;
        uint256 amount;
        uint256 minApyBps;
        uint256 maxDrawdownBps;
        uint256 duration;
        uint256 deadline;
        Status status;
        uint256 winningBid;
        uint256 createdAt;
    }

    struct Bid {
        uint256 id;
        uint256 intentId;
        address solver;
        address tierVault;
        uint256 promisedApy;
        uint256 bondPosted;
        uint256 timestamp;
    }

    uint256 public constant AUCTION_DURATION = 30 minutes;

    IERC20 public immutable mntToken;
    SolverRegistry public immutable solverRegistry;

    uint256 public nextIntentId;
    uint256 public nextBidId;

    mapping(uint256 => Intent) public intents;
    mapping(uint256 => Bid) public bids;
    mapping(uint256 => uint256[]) public intentBids;

    event IntentPosted(uint256 indexed intentId, address indexed user, address asset, uint256 amount);
    event BidSubmitted(uint256 indexed bidId, uint256 indexed intentId, address indexed solver, uint256 promisedApy);
    event AuctionSettled(uint256 indexed intentId, uint256 indexed winningBidId, address solver, address vault);
    event IntentCancelled(uint256 indexed intentId);
    event BondSlashed(uint256 indexed bidId, address solver, uint256 amount);

    error IntentNotOpen();
    error AuctionNotEnded();
    error AuctionEnded();
    error NotIntentOwner();
    error NoBidsReceived();
    error SolverNotRegistered();
    error InsufficientBond();
    error DeadlinePassed();

    constructor(address _mntToken, address _solverRegistry) {
        mntToken = IERC20(_mntToken);
        solverRegistry = SolverRegistry(_solverRegistry);
    }

    /// @notice Post a new intent to the router, starting a 30-minute auction
    /// @param asset The ERC20 token to deposit
    /// @param amount The amount to deposit
    /// @param minApyBps Minimum acceptable APY in basis points
    /// @param maxDrawdownBps Maximum acceptable drawdown in basis points
    /// @param duration The duration for the investment
    /// @param deadline The deadline for the intent to be filled
    function postIntent(
        address asset,
        uint256 amount,
        uint256 minApyBps,
        uint256 maxDrawdownBps,
        uint256 duration,
        uint256 deadline
    ) external nonReentrant returns (uint256 intentId) {
        if (deadline <= block.timestamp) revert DeadlinePassed();

        intentId = nextIntentId++;
        intents[intentId] = Intent({
            id: intentId,
            user: msg.sender,
            asset: asset,
            amount: amount,
            minApyBps: minApyBps,
            maxDrawdownBps: maxDrawdownBps,
            duration: duration,
            deadline: deadline,
            status: Status.Open,
            winningBid: 0,
            createdAt: block.timestamp
        });

        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        emit IntentPosted(intentId, msg.sender, asset, amount);
    }

    /// @notice Submit a bid for an open intent, must post MNT bond
    /// @param intentId The intent to bid on
    /// @param tierVault The ERC4626 vault to deposit into
    /// @param promisedApy The promised APY in basis points
    /// @param bondAmount The amount of MNT to post as bond
    function submitBid(
        uint256 intentId,
        address tierVault,
        uint256 promisedApy,
        uint256 bondAmount
    ) external nonReentrant returns (uint256 bidId) {
        Intent storage intent = intents[intentId];
        if (intent.status != Status.Open) revert IntentNotOpen();
        if (block.timestamp > intent.createdAt + AUCTION_DURATION) revert AuctionEnded();
        if (!solverRegistry.isSolverActive(msg.sender)) revert SolverNotRegistered();
        if (bondAmount == 0) revert InsufficientBond();

        bidId = nextBidId++;
        bids[bidId] = Bid({
            id: bidId,
            intentId: intentId,
            solver: msg.sender,
            tierVault: tierVault,
            promisedApy: promisedApy,
            bondPosted: bondAmount,
            timestamp: block.timestamp
        });

        intentBids[intentId].push(bidId);
        mntToken.safeTransferFrom(msg.sender, address(this), bondAmount);

        emit BidSubmitted(bidId, intentId, msg.sender, promisedApy);
    }

    /// @notice Settle the auction for an intent, picking the highest APY bid
    /// @param intentId The intent to settle
    function settleAuction(uint256 intentId) external nonReentrant {
        Intent storage intent = intents[intentId];
        if (intent.status != Status.Open) revert IntentNotOpen();
        if (block.timestamp <= intent.createdAt + AUCTION_DURATION) revert AuctionNotEnded();

        uint256[] storage bidIds = intentBids[intentId];
        if (bidIds.length == 0) {
            intent.status = Status.Expired;
            IERC20(intent.asset).safeTransfer(intent.user, intent.amount);
            return;
        }

        uint256 winningBidId = bidIds[0];
        uint256 highestApy = bids[bidIds[0]].promisedApy;

        for (uint256 i = 1; i < bidIds.length; i++) {
            if (bids[bidIds[i]].promisedApy > highestApy) {
                highestApy = bids[bidIds[i]].promisedApy;
                winningBidId = bidIds[i];
            }
        }

        intent.status = Status.Filled;
        intent.winningBid = winningBidId;

        Bid storage winBid = bids[winningBidId];

        // Deposit into the winning vault via ERC4626
        IERC20(intent.asset).safeIncreaseAllowance(winBid.tierVault, intent.amount);
        IERC4626(winBid.tierVault).deposit(intent.amount, intent.user);

        // Refund losing bidders' bonds
        for (uint256 i = 0; i < bidIds.length; i++) {
            if (bidIds[i] != winningBidId) {
                Bid storage losingBid = bids[bidIds[i]];
                mntToken.safeTransfer(losingBid.solver, losingBid.bondPosted);
            }
        }

        emit AuctionSettled(intentId, winningBidId, winBid.solver, winBid.tierVault);
    }

    /// @notice Check and settle bond if solver underperformed
    /// @param bidId The bid whose bond to check
    function checkAndSettleBond(uint256 bidId) external nonReentrant {
        Bid storage bid = bids[bidId];
        Intent storage intent = intents[bid.intentId];

        if (intent.status != Status.Filled || intent.winningBid != bidId) return;

        // Bond settlement logic: in production, would check actual vault performance
        // For now, allows the intent owner to slash the bond if underperformance is proven
        if (msg.sender == intent.user) {
            uint256 bondAmount = bid.bondPosted;
            bid.bondPosted = 0;
            mntToken.safeTransfer(intent.user, bondAmount);
            emit BondSlashed(bidId, bid.solver, bondAmount);
        }
    }

    /// @notice Cancel an intent before auction ends (only intent owner)
    /// @param intentId The intent to cancel
    function cancelIntent(uint256 intentId) external nonReentrant {
        Intent storage intent = intents[intentId];
        if (intent.user != msg.sender) revert NotIntentOwner();
        if (intent.status != Status.Open) revert IntentNotOpen();

        intent.status = Status.Cancelled;
        IERC20(intent.asset).safeTransfer(msg.sender, intent.amount);

        // Refund all bidders' bonds
        uint256[] storage bidIds = intentBids[intentId];
        for (uint256 i = 0; i < bidIds.length; i++) {
            Bid storage bid = bids[bidIds[i]];
            mntToken.safeTransfer(bid.solver, bid.bondPosted);
        }

        emit IntentCancelled(intentId);
    }

    /// @notice Get all bid IDs for an intent
    function getIntentBids(uint256 intentId) external view returns (uint256[] memory) {
        return intentBids[intentId];
    }
}
