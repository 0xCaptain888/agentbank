// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title CommitRevealSignal
/// @notice M28 commit-reveal scheme for signals with 5 block reveal delay
contract CommitRevealSignal {
    struct Commit {
        address analyst;
        bytes32 commitHash;
        uint256 commitBlock;
        bool revealed;
    }

    uint256 public constant REVEAL_DELAY = 5;

    uint256 public nextCommitId;
    mapping(uint256 => Commit) public commits;
    mapping(address => uint256[]) public analystCommits;

    event SignalCommitted(uint256 indexed commitId, address indexed analyst, bytes32 commitHash, uint256 commitBlock);
    event SignalRevealed(uint256 indexed commitId, address indexed analyst, bytes signal);

    error NotAnalyst();
    error AlreadyRevealed();
    error RevealTooEarly();
    error InvalidReveal();
    error CommitNotFound();

    /// @notice Commit a hashed signal
    /// @param commitHash The keccak256 hash of the signal data and a salt
    function commit(bytes32 commitHash) external returns (uint256 commitId) {
        commitId = nextCommitId++;
        commits[commitId] = Commit({
            analyst: msg.sender,
            commitHash: commitHash,
            commitBlock: block.number,
            revealed: false
        });
        analystCommits[msg.sender].push(commitId);

        emit SignalCommitted(commitId, msg.sender, commitHash, block.number);
    }

    /// @notice Reveal a previously committed signal after the delay period
    /// @param commitId The commit to reveal
    /// @param signal The original signal data
    /// @param salt The salt used in the commit hash
    function reveal(uint256 commitId, bytes calldata signal, bytes32 salt) external {
        Commit storage c = commits[commitId];
        if (c.analyst == address(0)) revert CommitNotFound();
        if (c.analyst != msg.sender) revert NotAnalyst();
        if (c.revealed) revert AlreadyRevealed();
        if (block.number < c.commitBlock + REVEAL_DELAY) revert RevealTooEarly();

        bytes32 expectedHash = keccak256(abi.encodePacked(signal, salt));
        if (expectedHash != c.commitHash) revert InvalidReveal();

        c.revealed = true;

        emit SignalRevealed(commitId, msg.sender, signal);
    }

    /// @notice Get all commit IDs for an analyst
    /// @param analyst The analyst address
    function getAnalystCommits(address analyst) external view returns (uint256[] memory) {
        return analystCommits[analyst];
    }

    /// @notice Check if a commit can be revealed
    /// @param commitId The commit to check
    function canReveal(uint256 commitId) external view returns (bool) {
        Commit storage c = commits[commitId];
        return !c.revealed && block.number >= c.commitBlock + REVEAL_DELAY;
    }
}
