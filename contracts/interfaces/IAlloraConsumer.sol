// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IAlloraConsumer {
    struct AlloraConsumerNetworkInferenceData {
        uint256 topicId;
        int256 networkInference;
        uint256[] confidenceIntervalPercentiles;
        address[] workers;
    }

    function getNetworkInference(uint256 topicId) external view returns (AlloraConsumerNetworkInferenceData memory);
}
