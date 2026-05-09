// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IAlloraConsumer} from "../interfaces/IAlloraConsumer.sol";

/**
 * @title AlloraConsumer
 * @notice M19 - Reads Allora Network topic predictions on-chain and stores latest snapshots.
 */
contract AlloraConsumer {
    struct TopicSnapshot {
        uint256 topicId;
        int256 prediction;
        uint256 confidence;
        uint256 timestamp;
        address[] workers;
    }

    IAlloraConsumer public immutable allora;

    /// @notice Latest snapshot per topic
    mapping(uint256 => TopicSnapshot) public latestSnapshots;

    event SnapshotUpdated(uint256 indexed topicId, int256 prediction, uint256 confidence, uint256 timestamp);

    constructor(address _allora) {
        require(_allora != address(0), "AlloraConsumer: zero address");
        allora = IAlloraConsumer(_allora);
    }

    /**
     * @notice Pull latest inference data from Allora for a given topic and store the snapshot.
     * @param topicId The Allora topic ID to query.
     */
    function pullTopicData(uint256 topicId) external {
        IAlloraConsumer.AlloraConsumerNetworkInferenceData memory data = allora.getNetworkInference(topicId);

        uint256 confidence = 0;
        if (data.confidenceIntervalPercentiles.length > 0) {
            confidence = data.confidenceIntervalPercentiles[data.confidenceIntervalPercentiles.length / 2];
        }

        TopicSnapshot storage snapshot = latestSnapshots[topicId];
        snapshot.topicId = topicId;
        snapshot.prediction = data.networkInference;
        snapshot.confidence = confidence;
        snapshot.timestamp = block.timestamp;
        snapshot.workers = data.workers;

        emit SnapshotUpdated(topicId, data.networkInference, confidence, block.timestamp);
    }

    /**
     * @notice Returns a directional view (bullish/bearish/neutral) based on the latest prediction.
     * @param topicId The Allora topic ID.
     * @return direction 1 = bullish, -1 = bearish, 0 = neutral/no data
     */
    function getDirectionalView(uint256 topicId) external view returns (int8 direction) {
        TopicSnapshot storage snapshot = latestSnapshots[topicId];
        if (snapshot.timestamp == 0) {
            return 0;
        }
        if (snapshot.prediction > 0) {
            return 1;
        } else if (snapshot.prediction < 0) {
            return -1;
        }
        return 0;
    }

    /**
     * @notice Get the full latest snapshot for a topic.
     */
    function getSnapshot(uint256 topicId) external view returns (TopicSnapshot memory) {
        return latestSnapshots[topicId];
    }
}
