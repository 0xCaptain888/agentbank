// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ICircuitBreaker {
    function isOpen() external view returns (bool);
    function trip(uint256 magnitude, uint256 timestamp) external;
    function reset() external;
}
