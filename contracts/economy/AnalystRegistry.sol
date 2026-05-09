// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../identity/IdentityRegistry.sol";
import "../identity/ReputationRegistry.sol";

contract AnalystRegistry is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant ALLOCATOR_ROLE = keccak256("ALLOCATOR_ROLE");

    IdentityRegistry public immutable identity;
    ReputationRegistry public immutable reputation;
    IERC20 public immutable rewardToken;

    uint256 public minStake = 100 ether;
    uint256 public unstakeDelay = 7 days;
    uint256 public performanceFeeBps = 500;

    struct Analyst {
        uint256 agentId;
        uint256 stakedMNT;
        uint256 unstakeRequestedAt;
        uint256 totalSignalsChosen;
        uint256 totalSignalsExecuted;
        int256  totalPnLAttributed;
        uint256 unclaimedRewards;
        bool    active;
    }

    mapping(uint256 => Analyst) public analysts;
    uint256[] public activeAnalysts;
    mapping(uint256 => uint256) private activeIndex;

    event AnalystRegistered(uint256 indexed agentId, uint256 stake);
    event StakeIncreased(uint256 indexed agentId, uint256 newStake);
    event UnstakeRequested(uint256 indexed agentId, uint256 requestedAt);
    event UnstakeExecuted(uint256 indexed agentId, uint256 amount);
    event SignalChosen(uint256 indexed agentId, bytes32 signalId);
    event SignalAttributed(uint256 indexed agentId, bytes32 signalId, int256 pnl, uint256 fee);
    event AnalystSlashed(uint256 indexed agentId, uint256 amount, string reason);
    event RewardsClaimed(uint256 indexed agentId, uint256 amount);

    constructor(address _identity, address _reputation, address _rewardToken) {
        identity = IdentityRegistry(_identity);
        reputation = ReputationRegistry(_reputation);
        rewardToken = IERC20(_rewardToken);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function register(string calldata domain, bytes32 metadataHash) external payable nonReentrant {
        require(msg.value >= minStake, "stake below min");
        uint256 agentId = identity.agentByAddress(msg.sender);
        if (agentId == 0) {
            agentId = identity.registerAgent(msg.sender, domain, "third_party_analyst", metadataHash);
        }
        require(!analysts[agentId].active, "already registered");

        analysts[agentId] = Analyst({
            agentId: agentId,
            stakedMNT: msg.value,
            unstakeRequestedAt: 0,
            totalSignalsChosen: 0,
            totalSignalsExecuted: 0,
            totalPnLAttributed: 0,
            unclaimedRewards: 0,
            active: true
        });
        activeIndex[agentId] = activeAnalysts.length;
        activeAnalysts.push(agentId);
        emit AnalystRegistered(agentId, msg.value);
    }

    function increaseStake() external payable {
        uint256 agentId = identity.agentByAddress(msg.sender);
        require(analysts[agentId].active, "not registered");
        analysts[agentId].stakedMNT += msg.value;
        emit StakeIncreased(agentId, analysts[agentId].stakedMNT);
    }

    function requestUnstake() external {
        uint256 agentId = identity.agentByAddress(msg.sender);
        require(analysts[agentId].active, "not registered");
        analysts[agentId].unstakeRequestedAt = block.timestamp;
        emit UnstakeRequested(agentId, block.timestamp);
    }

    function executeUnstake() external nonReentrant {
        uint256 agentId = identity.agentByAddress(msg.sender);
        Analyst storage a = analysts[agentId];
        require(a.unstakeRequestedAt > 0, "no request");
        require(block.timestamp >= a.unstakeRequestedAt + unstakeDelay, "delay");
        uint256 amount = a.stakedMNT;
        a.stakedMNT = 0;
        a.active = false;
        _removeFromActive(agentId);
        payable(msg.sender).transfer(amount);
        emit UnstakeExecuted(agentId, amount);
    }

    function recordSignalChosen(uint256 agentId, bytes32 signalId)
        external onlyRole(ALLOCATOR_ROLE)
    {
        analysts[agentId].totalSignalsChosen++;
        emit SignalChosen(agentId, signalId);
    }

    function attributeOutcome(
        uint256 agentId,
        bytes32 signalId,
        int256 pnl,
        uint256 grossUsdcAmount
    ) external onlyRole(ALLOCATOR_ROLE) {
        Analyst storage a = analysts[agentId];
        a.totalSignalsExecuted++;
        a.totalPnLAttributed += pnl;

        uint256 fee = 0;
        if (pnl > 0) {
            fee = (uint256(pnl) * performanceFeeBps) / 10_000;
            a.unclaimedRewards += fee;
            rewardToken.safeTransferFrom(msg.sender, address(this), fee);
        } else if (pnl < 0) {
            uint256 slashAmount = a.stakedMNT / 100;
            if (slashAmount > 0) {
                a.stakedMNT -= slashAmount;
                emit AnalystSlashed(agentId, slashAmount, "loss_attributed");
            }
        }
        emit SignalAttributed(agentId, signalId, pnl, fee);

        if (a.stakedMNT < minStake / 2) {
            a.active = false;
            _removeFromActive(agentId);
        }
    }

    function claimRewards() external nonReentrant {
        uint256 agentId = identity.agentByAddress(msg.sender);
        uint256 amount = analysts[agentId].unclaimedRewards;
        require(amount > 0, "nothing to claim");
        analysts[agentId].unclaimedRewards = 0;
        rewardToken.safeTransfer(msg.sender, amount);
        emit RewardsClaimed(agentId, amount);
    }

    function getActiveAnalysts() external view returns (uint256[] memory) { return activeAnalysts; }

    function weight(uint256 agentId) external view returns (uint256) {
        Analyst memory a = analysts[agentId];
        if (!a.active) return 0;
        int256 rep = reputation.getReputation(agentId);
        int256 repAdj = int256(a.stakedMNT) * (100 + rep) / 100;
        if (repAdj <= 0) return 0;
        return uint256(repAdj);
    }

    function _removeFromActive(uint256 agentId) internal {
        uint256 idx = activeIndex[agentId];
        uint256 lastId = activeAnalysts[activeAnalysts.length - 1];
        activeAnalysts[idx] = lastId;
        activeIndex[lastId] = idx;
        activeAnalysts.pop();
        delete activeIndex[agentId];
    }
}
