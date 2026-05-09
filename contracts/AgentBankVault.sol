// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title AgentBankVault
 * @notice ERC-4626 vault managed by four AI agents.
 *         Executor agent executes DeFi operations.
 *         Guard agent can block operations and log risk events.
 *         Allocator agent distributes yield to depositors.
 * @dev Deployed on Mantle (chainId 5000) and Mantle Sepolia (chainId 5003)
 */
contract AgentBankVault is ERC4626, AccessControl, ReentrancyGuard {

    // ─── Roles ───────────────────────────────────────────────────────────────
    bytes32 public constant EXECUTOR_ROLE  = keccak256("EXECUTOR_ROLE");
    bytes32 public constant GUARD_ROLE     = keccak256("GUARD_ROLE");
    bytes32 public constant ALLOCATOR_ROLE = keccak256("ALLOCATOR_ROLE");

    // ─── State ────────────────────────────────────────────────────────────────
    bool    public paused;
    uint256 public maxOperationBps = 1000;          // 10% of totalAssets per tx
    uint256 public totalYieldDistributed;
    uint256 public totalOperationsExecuted;
    uint256 public totalOperationsBlocked;

    address public agentIdentityContract;           // ERC-8004 contract address

    // ─── Events ───────────────────────────────────────────────────────────────
    event OperationExecuted(
        address indexed executorAgent,
        address indexed target,
        string  operationType,
        uint256 amount,
        bytes32 signalId,
        uint256 timestamp
    );

    event OperationBlocked(
        address indexed guardAgent,
        address indexed executorAgent,
        string  reason,
        uint256 riskScore,
        bytes32 signalId,
        uint256 timestamp
    );

    event YieldDistributed(
        address indexed allocatorAgent,
        uint256 totalAmount,
        uint256 timestamp
    );

    event VaultPaused(address indexed by, uint256 timestamp);
    event VaultResumed(address indexed by, uint256 timestamp);

    // ─── Errors ───────────────────────────────────────────────────────────────
    error VaultIsPaused();
    error ExceedsMaxOperationLimit(uint256 requested, uint256 maximum);
    error OperationFailed(address target, bytes data);
    error ZeroAmount();

    // ─── Constructor ──────────────────────────────────────────────────────────
    constructor(
        IERC20  _asset,
        address _executorAgent,
        address _guardAgent,
        address _allocatorAgent,
        address _agentIdentityContract
    )
        ERC4626(_asset)
        ERC20("AgentBank Vault Share", "ABV")
    {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(EXECUTOR_ROLE,      _executorAgent);
        _grantRole(GUARD_ROLE,         _guardAgent);
        _grantRole(ALLOCATOR_ROLE,     _allocatorAgent);
        agentIdentityContract = _agentIdentityContract;
    }

    // ─── Modifiers ────────────────────────────────────────────────────────────
    modifier whenNotPaused() {
        if (paused) revert VaultIsPaused();
        _;
    }

    // ─── Executor Functions ───────────────────────────────────────────────────

    /**
     * @notice Execute a DeFi operation on behalf of the vault.
     * @param target       Contract to call (e.g. Merchant Moe router)
     * @param data         Encoded function call
     * @param amount       Asset amount involved (for limit check only)
     * @param operationType Human-readable label ("swap", "addLiquidity", etc.)
     * @param signalId     The SignalBoard signal ID this execution corresponds to
     */
    function executeOperation(
        address target,
        bytes   calldata data,
        uint256 amount,
        string  calldata operationType,
        bytes32 signalId
    )
        external
        onlyRole(EXECUTOR_ROLE)
        whenNotPaused
        nonReentrant
        returns (bool)
    {
        if (amount == 0) revert ZeroAmount();

        uint256 maxAllowed = (totalAssets() * maxOperationBps) / 10_000;
        if (amount > maxAllowed)
            revert ExceedsMaxOperationLimit(amount, maxAllowed);

        (bool success, ) = target.call(data);
        if (!success) revert OperationFailed(target, data);

        totalOperationsExecuted++;

        emit OperationExecuted(
            msg.sender,
            target,
            operationType,
            amount,
            signalId,
            block.timestamp
        );

        return true;
    }

    // ─── Guard Functions ──────────────────────────────────────────────────────

    /**
     * @notice Log a blocked operation. Called by Guard agent when risk check fails.
     */
    function logBlockedOperation(
        address executorAgent,
        string  calldata reason,
        uint256 riskScore,
        bytes32 signalId
    )
        external
        onlyRole(GUARD_ROLE)
    {
        totalOperationsBlocked++;

        emit OperationBlocked(
            msg.sender,
            executorAgent,
            reason,
            riskScore,
            signalId,
            block.timestamp
        );
    }

    // ─── Allocator Functions ──────────────────────────────────────────────────

    /**
     * @notice Distribute accumulated yield to all depositors pro-rata.
     * @param yieldAmount Total yield to distribute (must be pre-funded in vault)
     */
    function distributeYield(uint256 yieldAmount)
        external
        onlyRole(ALLOCATOR_ROLE)
        whenNotPaused
        nonReentrant
    {
        if (yieldAmount == 0) revert ZeroAmount();

        totalYieldDistributed += yieldAmount;

        emit YieldDistributed(msg.sender, yieldAmount, block.timestamp);
    }

    // ─── Admin Functions ──────────────────────────────────────────────────────

    function setPaused(bool _paused) external onlyRole(DEFAULT_ADMIN_ROLE) {
        paused = _paused;
        if (_paused) emit VaultPaused(msg.sender, block.timestamp);
        else         emit VaultResumed(msg.sender, block.timestamp);
    }

    function setMaxOperationBps(uint256 bps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(bps <= 5000, "Max 50%");
        maxOperationBps = bps;
    }

    function setAgentIdentityContract(address addr) external onlyRole(DEFAULT_ADMIN_ROLE) {
        agentIdentityContract = addr;
    }

    // ─── View Functions ───────────────────────────────────────────────────────

    function getVaultStats() external view returns (
        uint256 tvl,
        uint256 ops_executed,
        uint256 ops_blocked,
        uint256 yield_distributed,
        bool    is_paused
    ) {
        return (
            totalAssets(),
            totalOperationsExecuted,
            totalOperationsBlocked,
            totalYieldDistributed,
            paused
        );
    }
}
