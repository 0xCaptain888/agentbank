// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IDEXAdapter {
    function swap1inch(bytes calldata swapData, address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut, uint256 deadline) external returns (uint256 amountOut);
    function swapMMoe(address[] calldata path, uint256 amountIn, uint256 minAmountOut, uint256 deadline) external returns (uint256 amountOut);
}
