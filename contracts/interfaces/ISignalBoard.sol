// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

interface ISignalBoard {
    enum SignalStatus { Pending, Executed, Blocked, Expired }
    function postSignal(string calldata signalType, string calldata targetProtocol, address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut, uint256 confidence, string calldata reasoning) external returns (bytes32);
    function updateSignalStatus(bytes32 signalId, SignalStatus newStatus, bytes32 executionTxHash) external;
    function getPendingSignals() external view returns (bytes32[] memory);
}
