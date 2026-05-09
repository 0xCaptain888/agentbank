// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

interface IAgentBankVault {
    function executeOperation(address target, bytes calldata data, uint256 amount, string calldata operationType, bytes32 signalId) external returns (bool);
    function logBlockedOperation(address executorAgent, string calldata reason, uint256 riskScore, bytes32 signalId) external;
    function distributeYield(uint256 yieldAmount) external;
    function setPaused(bool _paused) external;
    function totalAssets() external view returns (uint256);
    function getVaultStats() external view returns (uint256, uint256, uint256, uint256, bool);
}
