// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title IWorldID
/// @notice Interface for World ID verification
interface IWorldID {
    function verifyProof(
        uint256 root,
        uint256 groupId,
        uint256 signalHash,
        uint256 nullifierHash,
        uint256 externalNullifierHash,
        uint256[8] calldata proof
    ) external view;
}

/// @title IGitcoinPassport
/// @notice Interface for Gitcoin Passport score lookup
interface IGitcoinPassport {
    function getScore(address user) external view returns (uint256);
}

/// @title AntiSybilGuard
/// @notice M28 anti-sybil using World ID with Gitcoin Passport fallback
contract AntiSybilGuard is Ownable {
    IWorldID public immutable worldId;
    IGitcoinPassport public gitcoinPassport;

    uint256 public immutable groupId;
    uint256 public immutable externalNullifierHash;

    /// @notice Minimum Gitcoin Passport score to pass (scaled by 100)
    uint256 public minPassportScore;

    /// @notice Track used nullifier hashes to prevent double-verification
    mapping(uint256 => bool) public nullifierHashes;

    /// @notice Track verified humans
    mapping(address => bool) public verifiedHumans;

    event HumanVerified(address indexed user, VerificationMethod method);
    event MinPassportScoreUpdated(uint256 newScore);
    event GitcoinPassportUpdated(address indexed newPassport);

    enum VerificationMethod { WorldID, GitcoinPassport }

    error AlreadyVerified();
    error InvalidNullifier();
    error NullifierAlreadyUsed();
    error InsufficientPassportScore();
    error NoVerificationAvailable();

    constructor(
        address _worldId,
        address _gitcoinPassport,
        uint256 _groupId,
        uint256 _externalNullifierHash,
        uint256 _minPassportScore
    ) Ownable(msg.sender) {
        worldId = IWorldID(_worldId);
        gitcoinPassport = IGitcoinPassport(_gitcoinPassport);
        groupId = _groupId;
        externalNullifierHash = _externalNullifierHash;
        minPassportScore = _minPassportScore;
    }

    /// @notice Verify humanity using World ID proof
    /// @param root The Merkle root of the World ID group
    /// @param nullifierHash The nullifier hash for this verification
    /// @param proof The zero-knowledge proof
    function verifyHumanity(
        uint256 root,
        uint256 nullifierHash,
        uint256[8] calldata proof
    ) external {
        if (verifiedHumans[msg.sender]) revert AlreadyVerified();
        if (nullifierHashes[nullifierHash]) revert NullifierAlreadyUsed();

        uint256 signalHash = uint256(keccak256(abi.encodePacked(msg.sender)));

        worldId.verifyProof(
            root,
            groupId,
            signalHash,
            nullifierHash,
            externalNullifierHash,
            proof
        );

        nullifierHashes[nullifierHash] = true;
        verifiedHumans[msg.sender] = true;

        emit HumanVerified(msg.sender, VerificationMethod.WorldID);
    }

    /// @notice Fallback verification using Gitcoin Passport score
    function verifyViaPassport() external {
        if (verifiedHumans[msg.sender]) revert AlreadyVerified();

        uint256 score = gitcoinPassport.getScore(msg.sender);
        if (score < minPassportScore) revert InsufficientPassportScore();

        verifiedHumans[msg.sender] = true;
        emit HumanVerified(msg.sender, VerificationMethod.GitcoinPassport);
    }

    /// @notice Check if an address is verified
    /// @param user The address to check
    function isVerified(address user) external view returns (bool) {
        return verifiedHumans[user];
    }

    /// @notice Update minimum passport score (only owner)
    /// @param _minScore The new minimum score
    function setMinPassportScore(uint256 _minScore) external onlyOwner {
        minPassportScore = _minScore;
        emit MinPassportScoreUpdated(_minScore);
    }

    /// @notice Update Gitcoin Passport contract (only owner)
    /// @param _passport The new passport contract address
    function setGitcoinPassport(address _passport) external onlyOwner {
        gitcoinPassport = IGitcoinPassport(_passport);
        emit GitcoinPassportUpdated(_passport);
    }
}
