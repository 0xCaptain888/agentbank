// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IMETH {
    function stake() external payable returns (uint256 mETHAmount);
    function unstakeRequest(uint256 mETHAmount) external returns (uint256 requestId);
    function claimUnstakeRequest(uint256 requestId) external;
    function balanceOf(address account) external view returns (uint256);
    function mETHToETH(uint256 mETHAmount) external view returns (uint256);
    function ethToMETH(uint256 ethAmount) external view returns (uint256);
    function totalAssets() external view returns (uint256);
}
