// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title MockDeFiProtocol
 * @notice Mock DeFi protocol for testing agent operations.
 *         Simulates a simple swap router.
 */
contract MockDeFiProtocol {

    event SwapExecuted(
        address indexed sender,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );

    /**
     * @notice Simulate a swap. Always succeeds and emits an event.
     */
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address recipient
    ) external returns (uint256 amountOut) {
        // Transfer tokenIn from sender
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);

        // Simulate 1:1 swap (for testing)
        amountOut = amountIn;
        require(amountOut >= minAmountOut, "Slippage too high");

        // Transfer tokenOut to recipient
        IERC20(tokenOut).transfer(recipient, amountOut);

        emit SwapExecuted(msg.sender, tokenIn, tokenOut, amountIn, amountOut);
        return amountOut;
    }

    /**
     * @notice Always-succeeding function for basic executeOperation tests
     */
    function mockOperation() external pure returns (bool) {
        return true;
    }
}
