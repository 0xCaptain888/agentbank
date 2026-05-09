// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title DEXAdapter
 * @notice Routes swaps through Mantle DEXes. Vault calls adapter; adapter holds no funds.
 */
contract DEXAdapter {
    using SafeERC20 for IERC20;

    address public constant ONEINCH = 0x111111125421cA6dc452d289314280a0f8842A65;
    address public constant MMOE_ROUTER = 0xeaEE7EE68874218c3558b40063c42B82D3E7232a;

    event SwapExecuted(address indexed caller, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut);

    function swap1inch(
        bytes calldata swapData,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        uint256 deadline
    ) external returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "deadline");
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).forceApprove(ONEINCH, amountIn);

        uint256 balBefore = IERC20(tokenOut).balanceOf(address(this));
        (bool ok, ) = ONEINCH.call(swapData);
        require(ok, "1inch swap failed");
        uint256 balAfter = IERC20(tokenOut).balanceOf(address(this));

        amountOut = balAfter - balBefore;
        require(amountOut >= minAmountOut, "slippage exceeded");

        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);
        emit SwapExecuted(msg.sender, tokenIn, tokenOut, amountIn, amountOut);
    }

    function swapMMoe(
        address[] calldata path,
        uint256 amountIn,
        uint256 minAmountOut,
        uint256 deadline
    ) external returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "deadline");
        address tokenIn = path[0];
        address tokenOut = path[path.length - 1];
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).forceApprove(MMOE_ROUTER, amountIn);

        uint256 balBefore = IERC20(tokenOut).balanceOf(msg.sender);
        (bool ok, ) = MMOE_ROUTER.call(
            abi.encodeWithSignature(
                "swapExactTokensForTokens(uint256,uint256,address[],address,uint256)",
                amountIn, minAmountOut, path, msg.sender, deadline
            )
        );
        require(ok, "MMoe swap failed");
        uint256 balAfter = IERC20(tokenOut).balanceOf(msg.sender);
        amountOut = balAfter - balBefore;
        emit SwapExecuted(msg.sender, tokenIn, tokenOut, amountIn, amountOut);
    }
}
