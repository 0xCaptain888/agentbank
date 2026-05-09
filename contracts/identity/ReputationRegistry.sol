// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "./IdentityRegistry.sol";

/**
 * @title ReputationRegistry
 * @notice ERC-8004 §2 — Pre-authorized clients give feedback
 *         that linearly affects an agent's reputation, with time decay.
 */
contract ReputationRegistry {

    IdentityRegistry public immutable identity;

    struct Feedback {
        uint256 agentId;
        address client;
        int256  score;
        bytes32 contextHash;
        string  reason;
        uint256 timestamp;
    }

    Feedback[] public feedbacks;

    mapping(uint256 => int256) public rawReputation;
    mapping(uint256 => uint256) public lastUpdate;
    mapping(uint256 => mapping(address => bool)) public authorized;

    uint256 public constant DECAY_HALFLIFE = 30 days;

    event FeedbackAuthorized(uint256 indexed agentId, address indexed client);
    event FeedbackRevoked(uint256 indexed agentId, address indexed client);
    event FeedbackSubmitted(uint256 indexed agentId, address indexed client, int256 score, bytes32 contextHash);

    constructor(address _identity) { identity = IdentityRegistry(_identity); }

    function authorize(uint256 agentId, address client) external {
        require(identity.getAgent(agentId).agentAddress == msg.sender, "not agent");
        authorized[agentId][client] = true;
        emit FeedbackAuthorized(agentId, client);
    }

    function revoke(uint256 agentId, address client) external {
        require(identity.getAgent(agentId).agentAddress == msg.sender, "not agent");
        authorized[agentId][client] = false;
        emit FeedbackRevoked(agentId, client);
    }

    function submitFeedback(
        uint256 agentId,
        int256 score,
        bytes32 contextHash,
        string calldata reason
    ) external {
        require(authorized[agentId][msg.sender], "not authorized client");
        require(score >= -100 && score <= 100, "score range");

        int256 decayed = _decayed(agentId);
        rawReputation[agentId] = decayed + score;
        lastUpdate[agentId] = block.timestamp;

        feedbacks.push(Feedback({
            agentId: agentId,
            client: msg.sender,
            score: score,
            contextHash: contextHash,
            reason: reason,
            timestamp: block.timestamp
        }));

        emit FeedbackSubmitted(agentId, msg.sender, score, contextHash);
    }

    function getReputation(uint256 agentId) external view returns (int256) {
        return _decayed(agentId);
    }

    function _decayed(uint256 agentId) internal view returns (int256) {
        if (lastUpdate[agentId] == 0) return 0;
        uint256 elapsed = block.timestamp - lastUpdate[agentId];
        int256 raw = rawReputation[agentId];
        if (elapsed >= DECAY_HALFLIFE) {
            uint256 halflives = elapsed / DECAY_HALFLIFE;
            for (uint256 i = 0; i < halflives && i < 32; i++) {
                raw = raw / 2;
            }
        }
        return raw;
    }

    function getFeedbackCount() external view returns (uint256) { return feedbacks.length; }
}
