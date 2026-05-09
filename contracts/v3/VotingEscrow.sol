// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title VotingEscrow
 * @notice M21 - Curve-style vote escrow. Lock ABNK tokens for voting power.
 *         Voting power decays linearly: amount * timeRemaining / MAX_LOCK.
 */
contract VotingEscrow is ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;

    uint256 public constant MIN_LOCK = 7 days;
    uint256 public constant MAX_LOCK = 4 * 365 days; // ~4 years

    struct Lock {
        uint128 amount;
        uint128 end;
    }

    mapping(address => Lock) public locks;

    event LockCreated(address indexed user, uint128 amount, uint128 end);
    event AmountIncreased(address indexed user, uint128 additionalAmount);
    event LockTimeIncreased(address indexed user, uint128 newEnd);
    event Withdrawn(address indexed user, uint128 amount);

    constructor(address _token) {
        require(_token != address(0), "VotingEscrow: zero address");
        token = IERC20(_token);
    }

    /**
     * @notice Create a new lock.
     * @param amount Amount of ABNK to lock.
     * @param duration Lock duration in seconds.
     */
    function createLock(uint128 amount, uint256 duration) external nonReentrant {
        require(amount > 0, "VotingEscrow: zero amount");
        require(locks[msg.sender].amount == 0, "VotingEscrow: lock exists");
        require(duration >= MIN_LOCK, "VotingEscrow: duration < MIN_LOCK");
        require(duration <= MAX_LOCK, "VotingEscrow: duration > MAX_LOCK");

        uint128 end = uint128(block.timestamp + duration);
        locks[msg.sender] = Lock({amount: amount, end: end});

        token.safeTransferFrom(msg.sender, address(this), amount);

        emit LockCreated(msg.sender, amount, end);
    }

    /**
     * @notice Increase the locked amount without changing the unlock time.
     * @param additionalAmount Additional ABNK to add to the lock.
     */
    function increaseAmount(uint128 additionalAmount) external nonReentrant {
        Lock storage lock = locks[msg.sender];
        require(lock.amount > 0, "VotingEscrow: no lock");
        require(lock.end > block.timestamp, "VotingEscrow: lock expired");
        require(additionalAmount > 0, "VotingEscrow: zero amount");

        lock.amount += additionalAmount;
        token.safeTransferFrom(msg.sender, address(this), additionalAmount);

        emit AmountIncreased(msg.sender, additionalAmount);
    }

    /**
     * @notice Extend the lock duration.
     * @param newEnd New unlock timestamp (must be > current end, within MAX_LOCK from now).
     */
    function increaseLockTime(uint128 newEnd) external nonReentrant {
        Lock storage lock = locks[msg.sender];
        require(lock.amount > 0, "VotingEscrow: no lock");
        require(lock.end > block.timestamp, "VotingEscrow: lock expired");
        require(newEnd > lock.end, "VotingEscrow: new end must be later");
        require(newEnd <= block.timestamp + MAX_LOCK, "VotingEscrow: exceeds MAX_LOCK");

        lock.end = newEnd;

        emit LockTimeIncreased(msg.sender, newEnd);
    }

    /**
     * @notice Withdraw tokens after lock has expired.
     */
    function withdraw() external nonReentrant {
        Lock storage lock = locks[msg.sender];
        require(lock.amount > 0, "VotingEscrow: no lock");
        require(block.timestamp >= lock.end, "VotingEscrow: lock not expired");

        uint128 amount = lock.amount;
        delete locks[msg.sender];

        token.safeTransfer(msg.sender, amount);

        emit Withdrawn(msg.sender, amount);
    }

    /**
     * @notice Get the current voting power of a user.
     *         Linear decay: amount * timeRemaining / MAX_LOCK.
     * @param user The address to query.
     * @return Voting power (scaled by token decimals).
     */
    function balanceOf(address user) external view returns (uint256) {
        Lock memory lock = locks[user];
        if (lock.amount == 0 || block.timestamp >= lock.end) {
            return 0;
        }
        uint256 remaining = uint256(lock.end) - block.timestamp;
        return (uint256(lock.amount) * remaining) / MAX_LOCK;
    }
}
