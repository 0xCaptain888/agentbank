// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/**
 * @title SignalBoard
 * @notice On-chain message bus for agent-to-agent communication.
 *         Analyst posts strategy signals. Executor reads and acts on them.
 *         All signals are permanently stored on Mantle.
 */
contract SignalBoard {

    enum SignalStatus { Pending, Executed, Blocked, Expired }

    struct Signal {
        bytes32     id;
        address     from;           // Analyst agent wallet
        string      signalType;     // "rebalance" | "swap" | "addLiquidity" | "removeLiquidity"
        string      targetProtocol; // "merchant_moe" | "agni_finance" | "fluxion"
        address     tokenIn;
        address     tokenOut;
        uint256     amountIn;
        uint256     minAmountOut;
        uint256     confidence;     // 0-100, LLM confidence score
        string      reasoning;      // LLM reasoning (stored on-chain for transparency)
        SignalStatus status;
        uint256     createdAt;
        uint256     executedAt;
        bytes32     executionTxHash;
    }

    Signal[]                        public signals;
    mapping(bytes32 => uint256)     public signalIndex;   // id → array index
    mapping(address => bool)        public authorizedPosters;
    mapping(address => bool)        public authorizedExecutors;

    address public owner;

    event SignalPosted(
        bytes32 indexed id,
        address indexed from,
        string  signalType,
        string  targetProtocol,
        uint256 confidence,
        uint256 timestamp
    );

    event SignalStatusUpdated(
        bytes32 indexed id,
        SignalStatus    oldStatus,
        SignalStatus    newStatus,
        address         updatedBy,
        uint256         timestamp
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function postSignal(
        string  calldata signalType,
        string  calldata targetProtocol,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        uint256 confidence,
        string  calldata reasoning
    ) external returns (bytes32) {
        require(authorizedPosters[msg.sender], "Not authorized poster");
        require(confidence <= 100, "Confidence must be 0-100");

        bytes32 id = keccak256(abi.encodePacked(
            msg.sender, block.timestamp, block.number, signals.length
        ));

        signals.push(Signal({
            id:              id,
            from:            msg.sender,
            signalType:      signalType,
            targetProtocol:  targetProtocol,
            tokenIn:         tokenIn,
            tokenOut:        tokenOut,
            amountIn:        amountIn,
            minAmountOut:    minAmountOut,
            confidence:      confidence,
            reasoning:       reasoning,
            status:          SignalStatus.Pending,
            createdAt:       block.timestamp,
            executedAt:      0,
            executionTxHash: bytes32(0)
        }));

        signalIndex[id] = signals.length - 1;

        emit SignalPosted(id, msg.sender, signalType, targetProtocol, confidence, block.timestamp);

        return id;
    }

    function updateSignalStatus(
        bytes32     signalId,
        SignalStatus newStatus,
        bytes32     executionTxHash
    ) external {
        require(authorizedExecutors[msg.sender], "Not authorized executor");

        uint256 idx = signalIndex[signalId];
        Signal storage signal = signals[idx];

        SignalStatus oldStatus = signal.status;
        signal.status = newStatus;

        if (newStatus == SignalStatus.Executed) {
            signal.executedAt = block.timestamp;
            signal.executionTxHash = executionTxHash;
        }

        emit SignalStatusUpdated(signalId, oldStatus, newStatus, msg.sender, block.timestamp);
    }

    // ─── View Functions ───────────────────────────────────────────────────────

    function getPendingSignals() external view returns (Signal[] memory) {
        uint256 count;
        for (uint256 i = 0; i < signals.length; i++) {
            if (signals[i].status == SignalStatus.Pending) count++;
        }

        Signal[] memory pending = new Signal[](count);
        uint256 j;
        for (uint256 i = 0; i < signals.length; i++) {
            if (signals[i].status == SignalStatus.Pending) {
                pending[j++] = signals[i];
            }
        }
        return pending;
    }

    function getLatestSignal() external view returns (Signal memory) {
        require(signals.length > 0, "No signals");
        return signals[signals.length - 1];
    }

    function getSignalById(bytes32 id) external view returns (Signal memory) {
        return signals[signalIndex[id]];
    }

    function getTotalSignals() external view returns (uint256) {
        return signals.length;
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    function setAuthorizedPoster(address poster, bool authorized) external onlyOwner {
        authorizedPosters[poster] = authorized;
    }

    function setAuthorizedExecutor(address executor, bool authorized) external onlyOwner {
        authorizedExecutors[executor] = authorized;
    }
}
