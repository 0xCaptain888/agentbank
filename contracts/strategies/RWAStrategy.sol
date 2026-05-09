// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract RWAStrategy is Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;
    address public immutable vault;
    uint256 public totalDeposited;
    uint256 public simulatedYieldBps = 500; // 5% APY simulated

    event Deposited(uint256 amount);
    event Withdrawn(uint256 amount);
    event Harvested(uint256 yield_amount);

    constructor(address _usdc, address _vault) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
        vault = _vault;
    }

    modifier onlyVault() { require(msg.sender == vault, "vault only"); _; }

    function deposit(uint256 amount) external onlyVault returns (uint256) {
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        totalDeposited += amount;
        emit Deposited(amount);
        return amount;
    }

    function withdraw(uint256 amount) external onlyVault returns (uint256) {
        require(usdc.balanceOf(address(this)) >= amount, "insufficient");
        usdc.safeTransfer(msg.sender, amount);
        totalDeposited = totalDeposited > amount ? totalDeposited - amount : 0;
        emit Withdrawn(amount);
        return amount;
    }

    function harvest() external onlyVault returns (uint256 yieldAmount) {
        yieldAmount = (totalDeposited * simulatedYieldBps) / (10_000 * 365);
        if (yieldAmount > 0 && usdc.balanceOf(address(this)) >= yieldAmount) {
            usdc.safeTransfer(msg.sender, yieldAmount);
            emit Harvested(yieldAmount);
        } else {
            yieldAmount = 0;
        }
    }

    function nav() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }
}
