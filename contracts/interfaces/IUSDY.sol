// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IUSDY {
    function deposit(uint256 usdcAmount) external returns (uint256 shares);
    function withdraw(uint256 shares) external returns (uint256 usdcAmount);
    function balanceOf(address account) external view returns (uint256);
    function usdcPerShare() external view returns (uint256);
    function currentAPY() external view returns (uint256);
    function totalAssets() external view returns (uint256);
}
