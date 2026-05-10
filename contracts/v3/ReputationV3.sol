// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ReputationV3
 * @notice V3 reputation hardening (M28 Hole 3+6+7).
 *
 *  - Client reliability weighting (spec S11.4)
 *  - Per-client-per-agent rate limit: max 1 feedback per 24 h
 *  - Reputation floor at -1000
 *  - 30-day all-positive recovery pathway (+5/day auto)
 *  - "Disputed" tag for feedback far from vault PnL assessment
 *  - Requester-stake for validation (Hole 7)
 */
contract ReputationV3 is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ── Roles ────────────────────────────────────────────────────────────
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    bytes32 public constant ADMIN_ROLE  = keccak256("ADMIN_ROLE");

    // ── Constants ────────────────────────────────────────────────────────
    int256  public constant REPUTATION_FLOOR       = -1000;
    int256  public constant RECOVERY_BONUS_PER_DAY = 5;
    uint256 public constant RECOVERY_QUALIFYING_DAYS = 30;
    uint256 public constant RATE_LIMIT_WINDOW      = 24 hours;
    uint256 public constant DISPUTE_DEVIATION_BPS  = 2000; // 20% deviation triggers dispute
    uint256 public constant BPS_BASE               = 10_000;

    // ── Structs ──────────────────────────────────────────────────────────

    struct Feedback {
        uint256 agentId;
        address client;
        int256  rawScore;
        int256  weightedScore;
        bytes32 contextHash;
        uint256 timestamp;
        bool    disputed;
    }

    struct RecoveryTracker {
        uint256 positiveStreakStart; // timestamp when current all-positive streak began
        uint256 lastRecoveryApplied; // last day recovery was applied
    }

    // ── State ────────────────────────────────────────────────────────────

    /// @notice Client reliability in basis points (0-10_000). Higher = more reliable.
    mapping(address => uint256) public clientReliabilityBps;

    /// @notice Accumulated reputation per agent.
    mapping(uint256 => int256) public reputation;

    /// @notice Last feedback timestamp per (client, agent) pair for rate limiting.
    mapping(address => mapping(uint256 => uint256)) public lastFeedbackTime;

    /// @notice Recovery tracking per agent.
    mapping(uint256 => RecoveryTracker) public recoveryTrackers;

    /// @notice Whether a client is authorised to give feedback on an agent.
    mapping(uint256 => mapping(address => bool)) public authorizedClients;

    /// @notice All feedback records.
    Feedback[] public feedbacks;

    /// @notice Vault-assessed PnL per context (set by oracle). In BPS (+500 = +5%).
    mapping(bytes32 => int256) public vaultPnlBps;

    // ── Validation stake (Hole 7) ────────────────────────────────────────

    IERC20  public stakeToken;
    uint256 public requiredStake;

    /// @notice Stakes held per (requester, contextHash).
    mapping(address => mapping(bytes32 => uint256)) public validationStakes;

    // ── Events ───────────────────────────────────────────────────────────

    event ClientReliabilitySet(address indexed client, uint256 bps);
    event FeedbackSubmitted(
        uint256 indexed agentId,
        address indexed client,
        int256  rawScore,
        int256  weightedScore,
        bool    disputed
    );
    event RecoveryApplied(uint256 indexed agentId, int256 bonus);
    event ValidationStaked(address indexed requester, bytes32 contextHash, uint256 amount);
    event ValidationStakeReturned(address indexed requester, bytes32 contextHash, uint256 amount);
    event VaultPnlSet(bytes32 indexed contextHash, int256 pnlBps);
    event ClientAuthorized(uint256 indexed agentId, address indexed client);
    event ClientRevoked(uint256 indexed agentId, address indexed client);

    // ── Constructor ──────────────────────────────────────────────────────

    constructor(address admin, address _stakeToken, uint256 _requiredStake) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        stakeToken = IERC20(_stakeToken);
        requiredStake = _requiredStake;
    }

    // ── Admin ────────────────────────────────────────────────────────────

    /// @notice Set a client's historical reliability score (spec S11.4).
    function setClientReliability(address client, uint256 bps) external onlyRole(ADMIN_ROLE) {
        require(bps <= BPS_BASE, "bps > 10000");
        clientReliabilityBps[client] = bps;
        emit ClientReliabilitySet(client, bps);
    }

    /// @notice Authorize a client to give feedback on an agent.
    function authorizeClient(uint256 agentId, address client) external onlyRole(ADMIN_ROLE) {
        authorizedClients[agentId][client] = true;
        emit ClientAuthorized(agentId, client);
    }

    /// @notice Revoke a client's feedback authorization.
    function revokeClient(uint256 agentId, address client) external onlyRole(ADMIN_ROLE) {
        authorizedClients[agentId][client] = false;
        emit ClientRevoked(agentId, client);
    }

    /// @notice Oracle sets the vault-assessed PnL for a context (used for dispute detection).
    function setVaultPnl(bytes32 contextHash, int256 pnlBps) external onlyRole(ORACLE_ROLE) {
        vaultPnlBps[contextHash] = pnlBps;
        emit VaultPnlSet(contextHash, pnlBps);
    }

    /// @notice Update the required validation stake.
    function setRequiredStake(uint256 _requiredStake) external onlyRole(ADMIN_ROLE) {
        requiredStake = _requiredStake;
    }

    // ── Client reliability getter (spec S11.4) ──────────────────────────

    /// @notice Returns the client reliability in BPS. Defaults to 5000 (50%) if unset.
    function _clientReliabilityBps(address client) public view returns (uint256) {
        uint256 r = clientReliabilityBps[client];
        return r == 0 ? 5000 : r;
    }

    // ── Core: submit feedback ────────────────────────────────────────────

    /**
     * @notice Submit feedback for an agent. Score is weighted by client reliability.
     * @param agentId  The agent receiving feedback.
     * @param score    Raw score in [-100, 100].
     * @param contextHash  Hash identifying the operation context.
     */
    function submitFeedback(
        uint256 agentId,
        int256  score,
        bytes32 contextHash
    ) external nonReentrant {
        require(authorizedClients[agentId][msg.sender], "not authorized");
        require(score >= -100 && score <= 100, "score out of range");

        // ── Rate limit: 1 per 24h per (client, agent) pair ──────────
        require(
            block.timestamp >= lastFeedbackTime[msg.sender][agentId] + RATE_LIMIT_WINDOW,
            "rate limited: 1 per 24h"
        );
        lastFeedbackTime[msg.sender][agentId] = block.timestamp;

        // ── Weight by client reliability ─────────────────────────────
        uint256 reliability = _clientReliabilityBps(msg.sender);
        int256 weightedScore = (score * int256(reliability)) / int256(BPS_BASE);

        // ── Dispute detection ────────────────────────────────────────
        bool disputed = _isDisputed(score, contextHash);

        // ── Apply to reputation (skip disputed feedback) ─────────────
        if (!disputed) {
            int256 newRep = reputation[agentId] + weightedScore;
            // Enforce floor
            if (newRep < REPUTATION_FLOOR) {
                newRep = REPUTATION_FLOOR;
            }
            reputation[agentId] = newRep;

            // Update recovery tracker
            _updateRecoveryTracker(agentId, weightedScore);
        }

        feedbacks.push(Feedback({
            agentId: agentId,
            client: msg.sender,
            rawScore: score,
            weightedScore: weightedScore,
            contextHash: contextHash,
            timestamp: block.timestamp,
            disputed: disputed
        }));

        emit FeedbackSubmitted(agentId, msg.sender, score, weightedScore, disputed);
    }

    // ── Recovery pathway ─────────────────────────────────────────────────

    /**
     * @notice Apply automatic reputation recovery for an agent.
     *         Callable by anyone. Adds +5 per eligible day if the agent has had
     *         30 consecutive days of all-positive vault outcomes.
     */
    function applyRecovery(uint256 agentId) external {
        RecoveryTracker storage rt = recoveryTrackers[agentId];
        require(rt.positiveStreakStart > 0, "no positive streak");

        uint256 streakDays = (block.timestamp - rt.positiveStreakStart) / 1 days;
        require(streakDays >= RECOVERY_QUALIFYING_DAYS, "streak < 30 days");

        // Calculate eligible recovery days since last application
        uint256 lastApplied = rt.lastRecoveryApplied;
        if (lastApplied < rt.positiveStreakStart + (RECOVERY_QUALIFYING_DAYS * 1 days)) {
            lastApplied = rt.positiveStreakStart + (RECOVERY_QUALIFYING_DAYS * 1 days);
        }

        uint256 eligibleDays = (block.timestamp - lastApplied) / 1 days;
        require(eligibleDays > 0, "no new recovery days");

        int256 bonus = int256(eligibleDays) * RECOVERY_BONUS_PER_DAY;
        reputation[agentId] += bonus;
        rt.lastRecoveryApplied = block.timestamp;

        emit RecoveryApplied(agentId, bonus);
    }

    // ── Validation stake (Hole 7) ────────────────────────────────────────

    /**
     * @notice Requester stakes tokens before requesting a validation.
     *         The stake must match `requiredStake`.
     */
    function stakeForValidation(bytes32 contextHash) external nonReentrant {
        require(requiredStake > 0, "staking not required");
        require(validationStakes[msg.sender][contextHash] == 0, "already staked");

        stakeToken.safeTransferFrom(msg.sender, address(this), requiredStake);
        validationStakes[msg.sender][contextHash] = requiredStake;

        emit ValidationStaked(msg.sender, contextHash, requiredStake);
    }

    /**
     * @notice Return stake to requester after validation completes.
     *         Only callable by ADMIN (or could be hooked into validation flow).
     */
    function returnStake(address requester, bytes32 contextHash) external onlyRole(ADMIN_ROLE) nonReentrant {
        uint256 amount = validationStakes[requester][contextHash];
        require(amount > 0, "no stake");

        validationStakes[requester][contextHash] = 0;
        stakeToken.safeTransfer(requester, amount);

        emit ValidationStakeReturned(requester, contextHash, amount);
    }

    // ── View helpers ─────────────────────────────────────────────────────

    function getReputation(uint256 agentId) external view returns (int256) {
        return reputation[agentId];
    }

    function getFeedbackCount() external view returns (uint256) {
        return feedbacks.length;
    }

    function getRecoveryTracker(uint256 agentId) external view returns (uint256 streakStart, uint256 lastApplied) {
        RecoveryTracker storage rt = recoveryTrackers[agentId];
        return (rt.positiveStreakStart, rt.lastRecoveryApplied);
    }

    // ── Internal ─────────────────────────────────────────────────────────

    /**
     * @dev Check if feedback deviates too far from the vault's actual PnL assessment.
     *      If vault PnL is set for this context and the score direction diverges
     *      by more than DISPUTE_DEVIATION_BPS, the feedback is marked disputed.
     */
    function _isDisputed(int256 score, bytes32 contextHash) internal view returns (bool) {
        int256 pnl = vaultPnlBps[contextHash];
        // If no vault PnL data, cannot dispute
        if (pnl == 0) return false;

        // Normalize score to BPS scale (-100..100 → -10000..10000)
        int256 scoreBps = score * 100;

        // Check if they disagree in sign significantly
        int256 diff = scoreBps - pnl;
        if (diff < 0) diff = -diff;

        // Disputed if deviation exceeds threshold
        return diff > int256(DISPUTE_DEVIATION_BPS);
    }

    /**
     * @dev Update the recovery tracker based on new feedback.
     *      Positive feedback continues the streak; negative resets it.
     */
    function _updateRecoveryTracker(uint256 agentId, int256 weightedScore) internal {
        RecoveryTracker storage rt = recoveryTrackers[agentId];
        if (weightedScore > 0) {
            // Start streak if not already running
            if (rt.positiveStreakStart == 0) {
                rt.positiveStreakStart = block.timestamp;
            }
        } else if (weightedScore < 0) {
            // Negative feedback resets the streak
            rt.positiveStreakStart = 0;
            rt.lastRecoveryApplied = 0;
        }
    }
}
