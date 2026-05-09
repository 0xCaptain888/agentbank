// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TEEAttestationVerifier
 * @notice M20 - Verifies TEE attestation signatures for agent runs executed in
 *         trusted execution environments (Phala, Marlin).
 */
contract TEEAttestationVerifier is Ownable {
    using ECDSA for bytes32;

    enum TEEKind {
        Phala,
        Marlin
    }

    struct AttestedRun {
        TEEKind kind;
        bytes32 promptHash;
        bytes32 outputHash;
        bytes32 codeHash;
        address attesterPubKey;
        uint256 timestamp;
        bool verified;
    }

    /// @notice Approved code hashes that are allowed to be attested
    mapping(bytes32 => bool) public approvedCode;

    /// @notice Approved attester public keys per TEE kind
    mapping(TEEKind => mapping(address => bool)) public approvedAttester;

    /// @notice Stored attested runs keyed by keccak256(promptHash, outputHash, codeHash)
    mapping(bytes32 => AttestedRun) public attestedRuns;

    event RunAttested(bytes32 indexed runId, TEEKind kind, address attester, uint256 timestamp);
    event CodeApproved(bytes32 indexed codeHash, bool approved);
    event AttesterApproved(TEEKind indexed kind, address indexed attester, bool approved);

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Attest a TEE run by verifying the attester signature.
     * @param kind The TEE kind (Phala or Marlin).
     * @param promptHash Hash of the prompt/input.
     * @param outputHash Hash of the output.
     * @param codeHash Hash of the executed code.
     * @param signature ECDSA signature from the attester over the run data.
     */
    function attestRun(
        TEEKind kind,
        bytes32 promptHash,
        bytes32 outputHash,
        bytes32 codeHash,
        bytes calldata signature
    ) external {
        require(approvedCode[codeHash], "TEEAttestationVerifier: code not approved");

        bytes32 messageHash = keccak256(abi.encodePacked(kind, promptHash, outputHash, codeHash));
        bytes32 ethSignedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));

        address recovered = ECDSA.recover(ethSignedHash, signature);
        require(approvedAttester[kind][recovered], "TEEAttestationVerifier: attester not approved");

        bytes32 runId = keccak256(abi.encodePacked(promptHash, outputHash, codeHash));

        attestedRuns[runId] = AttestedRun({
            kind: kind,
            promptHash: promptHash,
            outputHash: outputHash,
            codeHash: codeHash,
            attesterPubKey: recovered,
            timestamp: block.timestamp,
            verified: true
        });

        emit RunAttested(runId, kind, recovered, block.timestamp);
    }

    /**
     * @notice Check if a run has been verified.
     * @param promptHash Hash of the prompt/input.
     * @param outputHash Hash of the output.
     * @param codeHash Hash of the executed code.
     */
    function isVerified(bytes32 promptHash, bytes32 outputHash, bytes32 codeHash) external view returns (bool) {
        bytes32 runId = keccak256(abi.encodePacked(promptHash, outputHash, codeHash));
        return attestedRuns[runId].verified;
    }

    /**
     * @notice Approve or revoke a code hash.
     */
    function approveCode(bytes32 codeHash, bool approved) external onlyOwner {
        approvedCode[codeHash] = approved;
        emit CodeApproved(codeHash, approved);
    }

    /**
     * @notice Approve or revoke an attester for a given TEE kind.
     */
    function approveAttesterAddress(TEEKind kind, address attester, bool approved) external onlyOwner {
        approvedAttester[kind][attester] = approved;
        emit AttesterApproved(kind, attester, approved);
    }
}
