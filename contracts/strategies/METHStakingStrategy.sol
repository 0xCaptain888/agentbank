// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IMETH.sol";
import "../interfaces/IStrategy.sol";

/**
 * @title METHStakingStrategy
 * @notice Strategy that stakes ETH into mETH for liquid staking yield on Mantle.
 *         Vault deposits ETH (bridged from USDC via DEX), receives mETH.
 *         Yield comes from mETH appreciation vs ETH.
 */
contract METHStakingStrategy is IStrategy, Ownable {
    using SafeERC20 for IERC20;

    IMETH public immutable meth;
    address public immutable vault;

    uint256 public totalStaked;
    uint256 public lastNav;

    event Staked(uint256 ethIn, uint256 methOut);
    event Unstaked(uint256 methIn, uint256 ethOut);
    event Harvested(uint256 yield);

    constructor(address _meth, address _vault) Ownable(msg.sender) {
        meth = IMETH(_meth);
        vault = _vault;
    }

    modifier onlyVault() {
        require(msg.sender == vault, "vault only");
        _;
    }

    function deposit(uint256 amount) external onlyVault returns (uint256 sharesOut) {
        sharesOut = meth.stake{value: amount}();
        totalStaked += amount;
        lastNav = nav();
        emit Staked(amount, sharesOut);
    }

    function withdraw(uint256 shares) external onlyVault returns (uint256 amount) {
        uint256 requestId = meth.unstakeRequest(shares);
        meth.claimUnstakeRequest(requestId);
        amount = meth.mETHToETH(shares);
        emit Unstaked(shares, amount);
    }

    function harvest() external onlyVault returns (uint256 yield) {
        uint256 currentNav = nav();
        if (currentNav > lastNav) {
            yield = currentNav - lastNav;
            lastNav = currentNav;
            emit Harvested(yield);
        }
    }

    function nav() public view returns (uint256) {
        uint256 methBalance = meth.balanceOf(address(this));
        return meth.mETHToETH(methBalance);
    }

    receive() external payable {}
}
