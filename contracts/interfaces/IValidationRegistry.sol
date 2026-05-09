// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IValidationRegistry {
    enum Status { Pending, Valid, Invalid, Expired }
    function requestValidation(address requesterAddr, address validatorAddr, bytes32 dataHash, uint256 stake) external payable returns (bytes32 id);
    function respondValidation(bytes32 id, Status status, bytes32 responseHash, string calldata evidenceURI) external;
    function getValidationStats(uint256 agentId) external view returns (uint256 requested, uint256 passed, uint256 failed, uint256 passRate);
}
