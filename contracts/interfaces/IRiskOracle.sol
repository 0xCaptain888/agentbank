// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IRiskOracle {
    function checkAnomaly(address token) external view returns (bool anomaly, int64 spot, int64 twap1h, uint256 deviationBps);
    function snapshot(address token) external;
    function setPriceId(address token, bytes32 priceId) external;
}
