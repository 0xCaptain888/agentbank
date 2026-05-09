// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@account-abstraction/contracts/core/EntryPoint.sol";
import "@account-abstraction/contracts/interfaces/IAccount.sol";
import "@account-abstraction/contracts/interfaces/PackedUserOperation.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

/// @title AgentAccountFactory
/// @notice M25 ERC-4337 smart account with session key support
contract AgentAccountFactory is IAccount, Initializable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    struct SessionKey {
        address signer;
        uint48 validAfter;
        uint48 validUntil;
        uint256 maxValue;
        uint256 totalValueSpent;
        uint256 maxTotalValue;
    }

    IEntryPoint public immutable entryPoint;
    address public owner;

    mapping(address => SessionKey) public sessionKeys;
    address[] public sessionKeyList;

    event SessionKeyAdded(address indexed signer, uint48 validAfter, uint48 validUntil, uint256 maxValue);
    event SessionKeyRevoked(address indexed signer);
    event Executed(address indexed target, uint256 value, bytes data);

    error NotOwner();
    error NotEntryPoint();
    error InvalidSignature();
    error SessionKeyExpired();
    error SessionKeyNotYetValid();
    error ValueExceedsLimit();
    error TotalValueExceeded();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyEntryPoint() {
        if (msg.sender != address(entryPoint)) revert NotEntryPoint();
        _;
    }

    constructor(address _entryPoint) {
        entryPoint = IEntryPoint(_entryPoint);
    }

    /// @notice Initialize the account with an owner
    /// @param _owner The account owner
    function initialize(address _owner) external initializer {
        owner = _owner;
    }

    /// @notice Add a session key with constraints
    /// @param signer The session key signer address
    /// @param validAfter Timestamp after which the key is valid
    /// @param validUntil Timestamp until which the key is valid
    /// @param maxValue Maximum value per transaction
    /// @param maxTotalValue Maximum total value the key can spend
    function addSessionKey(
        address signer,
        uint48 validAfter,
        uint48 validUntil,
        uint256 maxValue,
        uint256 maxTotalValue
    ) external onlyOwner {
        sessionKeys[signer] = SessionKey({
            signer: signer,
            validAfter: validAfter,
            validUntil: validUntil,
            maxValue: maxValue,
            totalValueSpent: 0,
            maxTotalValue: maxTotalValue
        });
        sessionKeyList.push(signer);

        emit SessionKeyAdded(signer, validAfter, validUntil, maxValue);
    }

    /// @notice Revoke a session key
    /// @param signer The session key signer to revoke
    function revokeSessionKey(address signer) external onlyOwner {
        delete sessionKeys[signer];
        emit SessionKeyRevoked(signer);
    }

    /// @notice Validate a user operation (ERC-4337)
    /// @dev Checks owner signature first, then session keys
    function validateUserOp(
        PackedUserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external onlyEntryPoint returns (uint256 validationData) {
        // Pay prefund
        if (missingAccountFunds > 0) {
            (bool success,) = payable(msg.sender).call{value: missingAccountFunds}("");
            (success); // silence unused variable warning
        }

        return _validateSignature(userOp, userOpHash);
    }

    /// @notice Internal signature validation supporting owner and session keys
    function _validateSignature(
        PackedUserOperation calldata userOp,
        bytes32 userOpHash
    ) internal returns (uint256) {
        bytes32 ethHash = userOpHash.toEthSignedMessageHash();
        address recovered = ethHash.recover(userOp.signature);

        // Check if it's the owner
        if (recovered == owner) {
            return 0; // valid
        }

        // Check if it's a valid session key
        SessionKey storage sk = sessionKeys[recovered];
        if (sk.signer == address(0)) {
            return 1; // SIG_VALIDATION_FAILED
        }

        if (block.timestamp < sk.validAfter) revert SessionKeyNotYetValid();
        if (block.timestamp > sk.validUntil) revert SessionKeyExpired();

        // Pack validAfter and validUntil into validationData
        // Format: 20 bytes aggregator (0) + 6 bytes validUntil + 6 bytes validAfter
        return uint256(uint48(sk.validUntil)) << 160 | uint256(uint48(sk.validAfter)) << 208;
    }

    /// @notice Execute a call from this account
    /// @param target The target address
    /// @param value The ETH value to send
    /// @param data The calldata
    function execute(address target, uint256 value, bytes calldata data) external onlyEntryPoint {
        (bool success, bytes memory result) = target.call{value: value}(data);
        if (!success) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
        emit Executed(target, value, data);
    }

    /// @notice Get all session key addresses
    function getSessionKeys() external view returns (address[] memory) {
        return sessionKeyList;
    }

    receive() external payable {}
}
