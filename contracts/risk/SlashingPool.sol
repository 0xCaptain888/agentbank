// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract SlashingPool is AccessControl, ReentrancyGuard {
    bytes32 public constant SLASHER_ROLE = keccak256("SLASHER_ROLE");

    address public insurancePool;
    mapping(address => uint256) public stakeOf;
    uint256 public constant MIN_STAKE = 1 ether;
    uint256 public constant UNSTAKE_DELAY = 14 days;
    mapping(address => uint256) public unstakeRequestedAt;

    event Staked(address indexed agent, uint256 amount);
    event UnstakeQueued(address indexed agent, uint256 amount, uint256 readyAt);
    event UnstakeExecuted(address indexed agent, uint256 amount);
    event Slashed(address indexed agent, uint256 amount, string reason);

    constructor(address admin, address _insurance) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        insurancePool = _insurance;
    }

    function stake() external payable {
        require(msg.value > 0, "zero");
        stakeOf[msg.sender] += msg.value;
        emit Staked(msg.sender, msg.value);
    }

    function requestUnstake() external {
        require(stakeOf[msg.sender] > 0, "no stake");
        unstakeRequestedAt[msg.sender] = block.timestamp;
        emit UnstakeQueued(msg.sender, stakeOf[msg.sender], block.timestamp + UNSTAKE_DELAY);
    }

    function executeUnstake() external nonReentrant {
        require(unstakeRequestedAt[msg.sender] > 0, "not requested");
        require(block.timestamp >= unstakeRequestedAt[msg.sender] + UNSTAKE_DELAY, "delay");
        uint256 amount = stakeOf[msg.sender];
        stakeOf[msg.sender] = 0;
        unstakeRequestedAt[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
        emit UnstakeExecuted(msg.sender, amount);
    }

    function slash(address agent, uint256 amount, string calldata reason)
        external onlyRole(SLASHER_ROLE) nonReentrant
    {
        require(stakeOf[agent] >= amount, "insufficient stake");
        stakeOf[agent] -= amount;
        payable(insurancePool).transfer(amount / 2);
        emit Slashed(agent, amount, reason);
    }

    function isOperational(address agent) external view returns (bool) {
        return stakeOf[agent] >= MIN_STAKE && unstakeRequestedAt[agent] == 0;
    }
}
