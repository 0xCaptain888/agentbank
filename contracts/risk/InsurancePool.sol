// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract InsurancePool is AccessControl {
    using SafeERC20 for IERC20;

    bytes32 public constant CLAIMER_ROLE = keccak256("CLAIMER_ROLE");

    IERC20 public immutable usdc;
    uint256 public totalCollected;
    uint256 public totalPaidOut;

    struct Claim {
        address user;
        uint256 amount;
        string  reason;
        uint256 timestamp;
    }
    Claim[] public claims;

    event PremiumDeposited(uint256 amount, address from);
    event ClaimPaid(address indexed user, uint256 amount, string reason);

    constructor(address admin, address _usdc) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        usdc = IERC20(_usdc);
    }

    receive() external payable {}

    function depositPremium(uint256 amount) external {
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        totalCollected += amount;
        emit PremiumDeposited(amount, msg.sender);
    }

    function payClaim(address user, uint256 amount, string calldata reason)
        external onlyRole(CLAIMER_ROLE)
    {
        require(usdc.balanceOf(address(this)) >= amount, "insufficient pool");
        usdc.safeTransfer(user, amount);
        totalPaidOut += amount;
        claims.push(Claim(user, amount, reason, block.timestamp));
        emit ClaimPaid(user, amount, reason);
    }

    function poolBalance() external view returns (uint256 mnt, uint256 usdcBal) {
        mnt = address(this).balance;
        usdcBal = usdc.balanceOf(address(this));
    }

    function totalClaims() external view returns (uint256) { return claims.length; }
}
