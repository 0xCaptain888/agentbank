// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title AgentBankVaultV2
 * @notice ERC-4626 vault with hardened agent execution.
 *         Fixes V1's broken yield closure, arbitrary calldata risk,
 *         and missing balance assertions.
 *         Yield is realized via share price appreciation.
 */
contract AgentBankVaultV2 is ERC4626, AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    bytes32 public constant EXECUTOR_ROLE   = keccak256("EXECUTOR_ROLE");
    bytes32 public constant GUARD_ROLE      = keccak256("GUARD_ROLE");
    bytes32 public constant ALLOCATOR_ROLE  = keccak256("ALLOCATOR_ROLE");
    bytes32 public constant TIMELOCK_ROLE   = keccak256("TIMELOCK_ROLE");

    uint256 public maxOperationBps   = 1000;
    uint256 public maxDailyLossBps   = 500;
    uint256 public withdrawCooldown  = 24 hours;
    mapping(address => uint256) public lastDeposit;

    mapping(bytes32 => bool) public allowedCall;
    mapping(address => bool) public allowedToken;

    uint256 public totalOpsExecuted;
    uint256 public totalOpsBlocked;
    uint256 public totalYieldEarned;
    uint256 public lastResetTimestamp;
    int256  public dailyPnL;

    event OperationExecuted(
        address indexed executorAgent,
        address indexed target,
        bytes4  selector,
        uint256 assetsBefore,
        uint256 assetsAfter,
        int256  pnl,
        bytes32 signalId,
        bytes32 reasoningHash
    );
    event OperationBlocked(
        address indexed guardAgent,
        bytes32 signalId,
        uint256 riskScore,
        string  reason
    );
    event AllowedCallUpdated(address target, bytes4 selector, bool allowed);
    event RewardHarvested(address protocol, address token, uint256 amount);
    event CircuitBreakerTripped(int256 dailyPnL, uint256 timestamp);

    error CallNotAllowed(address target, bytes4 selector);
    error InsufficientPostBalance(uint256 expected, uint256 actual);
    error AmountExceedsLimit(uint256 amount, uint256 limit);
    error CooldownActive(uint256 until);
    error LossExceedsMax(int256 dailyPnL, int256 limit);

    constructor(
        IERC20 _asset,
        address _executor,
        address _guard,
        address _allocator,
        address _timelock
    )
        ERC4626(_asset)
        ERC20("AgentBank Vault V2", "ABV2")
    {
        _grantRole(DEFAULT_ADMIN_ROLE, _timelock);
        _grantRole(TIMELOCK_ROLE,      _timelock);
        _grantRole(EXECUTOR_ROLE,      _executor);
        _grantRole(GUARD_ROLE,         _guard);
        _grantRole(ALLOCATOR_ROLE,     _allocator);
        lastResetTimestamp = block.timestamp;
    }

    function deposit(uint256 assets, address receiver)
        public override whenNotPaused nonReentrant returns (uint256 shares)
    {
        shares = super.deposit(assets, receiver);
        lastDeposit[receiver] = block.timestamp;
    }

    function redeem(uint256 shares, address receiver, address owner)
        public override whenNotPaused nonReentrant returns (uint256 assets)
    {
        if (block.timestamp < lastDeposit[owner] + withdrawCooldown) {
            revert CooldownActive(lastDeposit[owner] + withdrawCooldown);
        }
        assets = super.redeem(shares, receiver, owner);
    }

    function executeOperation(
        address target,
        bytes calldata data,
        uint256 amountIn,
        uint256 expectedMinOut,
        bytes32 signalId,
        bytes32 reasoningHash
    )
        external
        onlyRole(EXECUTOR_ROLE)
        whenNotPaused
        nonReentrant
        returns (bool, int256 pnl)
    {
        _resetDailyIfNeeded();

        bytes4 selector = bytes4(data[:4]);
        bytes32 callKey = keccak256(abi.encodePacked(target, selector));
        if (!allowedCall[callKey]) revert CallNotAllowed(target, selector);

        uint256 limit = (totalAssets() * maxOperationBps) / 10_000;
        if (amountIn > limit) revert AmountExceedsLimit(amountIn, limit);

        IERC20 assetToken = IERC20(asset());
        uint256 assetsBefore = assetToken.balanceOf(address(this));

        assetToken.forceApprove(target, amountIn);
        (bool success, ) = target.call(data);
        require(success, "External call failed");
        assetToken.forceApprove(target, 0);

        uint256 assetsAfter = assetToken.balanceOf(address(this));

        if (assetsAfter + amountIn < assetsBefore + expectedMinOut) {
            revert InsufficientPostBalance(assetsBefore + expectedMinOut - amountIn, assetsAfter);
        }

        pnl = int256(assetsAfter) - int256(assetsBefore);
        dailyPnL += pnl;

        if (pnl > 0) totalYieldEarned += uint256(pnl);

        int256 lossLimit = -int256((assetsBefore * maxDailyLossBps) / 10_000);
        if (dailyPnL < lossLimit) {
            _pause();
            emit CircuitBreakerTripped(dailyPnL, block.timestamp);
            revert LossExceedsMax(dailyPnL, lossLimit);
        }

        totalOpsExecuted++;
        emit OperationExecuted(msg.sender, target, selector, assetsBefore, assetsAfter, pnl, signalId, reasoningHash);
        return (true, pnl);
    }

    function logBlockedOperation(
        bytes32 signalId,
        uint256 riskScore,
        string calldata reason
    ) external onlyRole(GUARD_ROLE) {
        totalOpsBlocked++;
        emit OperationBlocked(msg.sender, signalId, riskScore, reason);
    }

    function setAllowedCall(address target, bytes4 selector, bool allowed)
        external onlyRole(TIMELOCK_ROLE)
    {
        allowedCall[keccak256(abi.encodePacked(target, selector))] = allowed;
        emit AllowedCallUpdated(target, selector, allowed);
    }

    function setMaxOperationBps(uint256 bps) external onlyRole(TIMELOCK_ROLE) {
        require(bps <= 5000, "max 50%");
        maxOperationBps = bps;
    }

    function setMaxDailyLossBps(uint256 bps) external onlyRole(TIMELOCK_ROLE) {
        require(bps <= 5000, "max 50%");
        maxDailyLossBps = bps;
    }

    function emergencyPause() external onlyRole(GUARD_ROLE) { _pause(); }
    function unpause() external onlyRole(TIMELOCK_ROLE) { _unpause(); }

    function getVaultStats() external view returns (
        uint256 tvl, uint256 opsExecuted, uint256 opsBlocked,
        uint256 yieldEarned, bool isPaused
    ) {
        return (totalAssets(), totalOpsExecuted, totalOpsBlocked, totalYieldEarned, paused());
    }

    function _resetDailyIfNeeded() internal {
        if (block.timestamp >= lastResetTimestamp + 24 hours) {
            dailyPnL = 0;
            lastResetTimestamp = block.timestamp;
        }
    }
}
