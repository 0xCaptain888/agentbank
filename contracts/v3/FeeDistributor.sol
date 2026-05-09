// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IDEXAdapter} from "../interfaces/IDEXAdapter.sol";

/**
 * @title FeeDistributor
 * @notice M21 - Buys ABNK with USDC revenue on a weekly epoch and sends to veABNK holders.
 */
contract FeeDistributor is Ownable {
    using SafeERC20 for IERC20;

    uint256 public constant EPOCH = 7 days;

    IERC20 public immutable usdc;
    IERC20 public immutable abnk;
    IDEXAdapter public dexAdapter;
    address public veABNK;

    uint256 public lastDistribution;
    uint256 public minSwapAmount;

    event Distributed(uint256 usdcAmount, uint256 abnkReceived, uint256 timestamp);
    event DEXAdapterUpdated(address indexed newAdapter);
    event VeABNKUpdated(address indexed newVeABNK);

    constructor(
        address _usdc,
        address _abnk,
        address _dexAdapter,
        address _veABNK
    ) Ownable(msg.sender) {
        require(_usdc != address(0), "FeeDistributor: zero usdc");
        require(_abnk != address(0), "FeeDistributor: zero abnk");
        require(_dexAdapter != address(0), "FeeDistributor: zero dex");
        require(_veABNK != address(0), "FeeDistributor: zero veABNK");

        usdc = IERC20(_usdc);
        abnk = IERC20(_abnk);
        dexAdapter = IDEXAdapter(_dexAdapter);
        veABNK = _veABNK;
        lastDistribution = block.timestamp;
        minSwapAmount = 100e6; // 100 USDC minimum
    }

    /**
     * @notice Distribute accumulated USDC fees by swapping to ABNK and sending to veABNK.
     *         Can only be called once per EPOCH.
     */
    function distribute() external {
        require(block.timestamp >= lastDistribution + EPOCH, "FeeDistributor: epoch not elapsed");

        uint256 usdcBalance = usdc.balanceOf(address(this));
        require(usdcBalance >= minSwapAmount, "FeeDistributor: insufficient balance");

        lastDistribution = block.timestamp;

        // Approve DEX adapter
        usdc.safeIncreaseAllowance(address(dexAdapter), usdcBalance);

        // Build swap path: USDC -> ABNK
        address[] memory path = new address[](2);
        path[0] = address(usdc);
        path[1] = address(abnk);

        uint256 abnkReceived = dexAdapter.swapMMoe(
            path,
            usdcBalance,
            0, // min amount out - in production use oracle price with slippage
            block.timestamp
        );

        // Transfer ABNK to veABNK contract
        abnk.safeTransfer(veABNK, abnkReceived);

        emit Distributed(usdcBalance, abnkReceived, block.timestamp);
    }

    /**
     * @notice Update the DEX adapter address.
     */
    function setDEXAdapter(address _dexAdapter) external onlyOwner {
        require(_dexAdapter != address(0), "FeeDistributor: zero address");
        dexAdapter = IDEXAdapter(_dexAdapter);
        emit DEXAdapterUpdated(_dexAdapter);
    }

    /**
     * @notice Update the veABNK recipient address.
     */
    function setVeABNK(address _veABNK) external onlyOwner {
        require(_veABNK != address(0), "FeeDistributor: zero address");
        veABNK = _veABNK;
        emit VeABNKUpdated(_veABNK);
    }

    /**
     * @notice Update minimum swap amount.
     */
    function setMinSwapAmount(uint256 _minSwapAmount) external onlyOwner {
        minSwapAmount = _minSwapAmount;
    }

    /**
     * @notice Recover accidentally sent tokens (not USDC or ABNK).
     */
    function recoverToken(address tokenAddress, uint256 amount) external onlyOwner {
        require(tokenAddress != address(usdc) && tokenAddress != address(abnk), "FeeDistributor: cannot recover core tokens");
        IERC20(tokenAddress).safeTransfer(msg.sender, amount);
    }
}
