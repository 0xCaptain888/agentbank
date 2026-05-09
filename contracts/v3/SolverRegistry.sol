// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title SolverRegistry
/// @notice M24 registry for analyst-as-solver. Only registered solvers can bid on intents.
contract SolverRegistry is Ownable {
    using SafeERC20 for IERC20;

    struct SolverInfo {
        address solver;
        uint256 stake;
        uint256 reputation;
        bool active;
    }

    IERC20 public immutable stakeToken;
    uint256 public minStake;

    mapping(address => SolverInfo) public solvers;
    address[] public solverList;

    event SolverRegistered(address indexed solver, uint256 stake);
    event SolverDeregistered(address indexed solver);
    event ReputationUpdated(address indexed solver, uint256 newReputation);
    event MinStakeUpdated(uint256 newMinStake);

    error AlreadyRegistered();
    error NotRegistered();
    error InsufficientStake();
    error SolverStillActive();

    constructor(address _stakeToken, uint256 _minStake) Ownable(msg.sender) {
        stakeToken = IERC20(_stakeToken);
        minStake = _minStake;
    }

    /// @notice Register as a solver by staking tokens
    /// @param stakeAmount The amount of tokens to stake
    function register(uint256 stakeAmount) external {
        if (solvers[msg.sender].active) revert AlreadyRegistered();
        if (stakeAmount < minStake) revert InsufficientStake();

        solvers[msg.sender] = SolverInfo({
            solver: msg.sender,
            stake: stakeAmount,
            reputation: 0,
            active: true
        });
        solverList.push(msg.sender);

        stakeToken.safeTransferFrom(msg.sender, address(this), stakeAmount);
        emit SolverRegistered(msg.sender, stakeAmount);
    }

    /// @notice Deregister as a solver and withdraw stake
    function deregister() external {
        SolverInfo storage info = solvers[msg.sender];
        if (!info.active) revert NotRegistered();

        info.active = false;
        uint256 stakeAmount = info.stake;
        info.stake = 0;

        stakeToken.safeTransfer(msg.sender, stakeAmount);
        emit SolverDeregistered(msg.sender);
    }

    /// @notice Check if a solver is active
    /// @param solver The address to check
    function isSolverActive(address solver) external view returns (bool) {
        return solvers[solver].active;
    }

    /// @notice Update solver reputation (only owner)
    /// @param solver The solver address
    /// @param newReputation The new reputation score
    function updateReputation(address solver, uint256 newReputation) external onlyOwner {
        if (!solvers[solver].active) revert NotRegistered();
        solvers[solver].reputation = newReputation;
        emit ReputationUpdated(solver, newReputation);
    }

    /// @notice Update minimum stake requirement (only owner)
    /// @param _minStake The new minimum stake
    function setMinStake(uint256 _minStake) external onlyOwner {
        minStake = _minStake;
        emit MinStakeUpdated(_minStake);
    }

    /// @notice Get total number of registered solvers
    function getSolverCount() external view returns (uint256) {
        return solverList.length;
    }
}
