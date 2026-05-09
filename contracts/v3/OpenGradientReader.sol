// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title OpenGradientReader
 * @notice M19 - Verifies on-chain ML model output from OpenGradient using ZK proofs.
 */
contract OpenGradientReader {
    struct ModelOutput {
        bytes32 modelId;
        bytes32 inputHash;
        bytes32 outputHash;
        bytes proof;
        uint256 timestamp;
        bool verified;
    }

    /// @notice Mapping from output hash to ModelOutput record
    mapping(bytes32 => ModelOutput) public outputs;

    /// @notice All output hashes stored
    bytes32[] public outputHashes;

    /// @notice Address of the ZK verifier contract
    address public zkVerifier;

    /// @notice Contract owner
    address public owner;

    event ModelOutputStored(bytes32 indexed outputHash, bytes32 indexed modelId, bool verified);
    event ZKVerifierUpdated(address indexed newVerifier);

    modifier onlyOwner() {
        require(msg.sender == owner, "OpenGradientReader: not owner");
        _;
    }

    constructor(address _zkVerifier) {
        owner = msg.sender;
        zkVerifier = _zkVerifier;
    }

    /**
     * @notice Store a model output with its ZK proof. Verifies the proof on submission.
     * @param modelId Identifier of the ML model.
     * @param inputHash Hash of the model input.
     * @param outputHash Hash of the model output.
     * @param proof The ZK proof bytes.
     */
    function storeOutput(
        bytes32 modelId,
        bytes32 inputHash,
        bytes32 outputHash,
        bytes calldata proof
    ) external {
        require(outputs[outputHash].timestamp == 0, "OpenGradientReader: output exists");

        bool verified = _verifyProof(modelId, inputHash, outputHash, proof);

        outputs[outputHash] = ModelOutput({
            modelId: modelId,
            inputHash: inputHash,
            outputHash: outputHash,
            proof: proof,
            timestamp: block.timestamp,
            verified: verified
        });
        outputHashes.push(outputHash);

        emit ModelOutputStored(outputHash, modelId, verified);
    }

    /**
     * @notice Check if a specific output has been verified.
     */
    function isVerified(bytes32 outputHash) external view returns (bool) {
        return outputs[outputHash].verified;
    }

    /**
     * @notice Get the full model output record.
     */
    function getOutput(bytes32 outputHash) external view returns (ModelOutput memory) {
        return outputs[outputHash];
    }

    /**
     * @notice Update the ZK verifier contract address.
     */
    function setZKVerifier(address _zkVerifier) external onlyOwner {
        zkVerifier = _zkVerifier;
        emit ZKVerifierUpdated(_zkVerifier);
    }

    /**
     * @dev Internal proof verification. Calls the external ZK verifier if set.
     */
    function _verifyProof(
        bytes32 modelId,
        bytes32 inputHash,
        bytes32 outputHash,
        bytes calldata proof
    ) internal view returns (bool) {
        if (zkVerifier == address(0)) {
            return false;
        }
        // Static call to verifier: verifyProof(bytes32,bytes32,bytes32,bytes)
        (bool success, bytes memory result) = zkVerifier.staticcall(
            abi.encodeWithSignature(
                "verifyProof(bytes32,bytes32,bytes32,bytes)",
                modelId,
                inputHash,
                outputHash,
                proof
            )
        );
        if (success && result.length >= 32) {
            return abi.decode(result, (bool));
        }
        return false;
    }
}
