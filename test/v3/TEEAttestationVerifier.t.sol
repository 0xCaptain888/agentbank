// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../../contracts/v3/TEEAttestationVerifier.sol";

contract TEEAttestationVerifierTest is Test {
    TEEAttestationVerifier public verifier;

    address public owner;
    uint256 public attesterKey = 0xBEEF;
    address public attester;

    bytes32 constant CODE_HASH = keccak256("agent-code-v1");
    bytes32 constant PROMPT_HASH = keccak256("analyze BTC/USDT");
    bytes32 constant OUTPUT_HASH = keccak256("buy signal 0.8 confidence");

    function setUp() public {
        owner = address(this);
        attester = vm.addr(attesterKey);

        verifier = new TEEAttestationVerifier();
        verifier.approveCode(CODE_HASH, true);
        verifier.approveAttesterAddress(TEEAttestationVerifier.TEEKind.Phala, attester, true);
    }

    function _signRun(
        TEEAttestationVerifier.TEEKind kind,
        bytes32 promptHash,
        bytes32 outputHash,
        bytes32 codeHash,
        uint256 privateKey
    ) internal pure returns (bytes memory) {
        bytes32 messageHash = keccak256(abi.encodePacked(kind, promptHash, outputHash, codeHash));
        bytes32 ethSignedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, ethSignedHash);
        return abi.encodePacked(r, s, v);
    }

    // ─── approveCode ─────────────────────────────────────────────────────

    function test_approveCode_success() public {
        bytes32 newCode = keccak256("new-code");
        verifier.approveCode(newCode, true);
        assertTrue(verifier.approvedCode(newCode));
    }

    function test_approveCode_revoke() public {
        verifier.approveCode(CODE_HASH, false);
        assertFalse(verifier.approvedCode(CODE_HASH));
    }

    function test_approveCode_reverts_non_owner() public {
        vm.prank(address(0xDEAD));
        vm.expectRevert();
        verifier.approveCode(keccak256("x"), true);
    }

    // ─── approveAttester ─────────────────────────────────────────────────

    function test_approveAttester_success() public {
        address newAttester = address(0xCAFE);
        verifier.approveAttesterAddress(TEEAttestationVerifier.TEEKind.Marlin, newAttester, true);
        assertTrue(verifier.approvedAttester(TEEAttestationVerifier.TEEKind.Marlin, newAttester));
    }

    function test_approveAttester_revoke() public {
        verifier.approveAttesterAddress(TEEAttestationVerifier.TEEKind.Phala, attester, false);
        assertFalse(verifier.approvedAttester(TEEAttestationVerifier.TEEKind.Phala, attester));
    }

    function test_approveAttester_reverts_non_owner() public {
        vm.prank(address(0xDEAD));
        vm.expectRevert();
        verifier.approveAttesterAddress(TEEAttestationVerifier.TEEKind.Phala, address(0x1), true);
    }

    // ─── attestRun ───────────────────────────────────────────────────────

    function test_attestRun_success() public {
        bytes memory sig = _signRun(
            TEEAttestationVerifier.TEEKind.Phala,
            PROMPT_HASH,
            OUTPUT_HASH,
            CODE_HASH,
            attesterKey
        );

        verifier.attestRun(
            TEEAttestationVerifier.TEEKind.Phala,
            PROMPT_HASH,
            OUTPUT_HASH,
            CODE_HASH,
            sig
        );

        assertTrue(verifier.isVerified(PROMPT_HASH, OUTPUT_HASH, CODE_HASH));
    }

    function test_attestRun_stores_run_data() public {
        bytes memory sig = _signRun(
            TEEAttestationVerifier.TEEKind.Phala,
            PROMPT_HASH,
            OUTPUT_HASH,
            CODE_HASH,
            attesterKey
        );

        verifier.attestRun(
            TEEAttestationVerifier.TEEKind.Phala,
            PROMPT_HASH,
            OUTPUT_HASH,
            CODE_HASH,
            sig
        );

        bytes32 runId = keccak256(abi.encodePacked(PROMPT_HASH, OUTPUT_HASH, CODE_HASH));
        (
            TEEAttestationVerifier.TEEKind kind,
            bytes32 promptHash,
            bytes32 outputHash,
            bytes32 codeHash,
            address attesterPubKey,
            uint256 timestamp,
            bool verified
        ) = verifier.attestedRuns(runId);

        assertEq(uint8(kind), uint8(TEEAttestationVerifier.TEEKind.Phala));
        assertEq(promptHash, PROMPT_HASH);
        assertEq(outputHash, OUTPUT_HASH);
        assertEq(codeHash, CODE_HASH);
        assertEq(attesterPubKey, attester);
        assertEq(timestamp, block.timestamp);
        assertTrue(verified);
    }

    function test_attestRun_reverts_unapproved_code() public {
        bytes32 badCode = keccak256("unapproved");
        bytes memory sig = _signRun(
            TEEAttestationVerifier.TEEKind.Phala,
            PROMPT_HASH,
            OUTPUT_HASH,
            badCode,
            attesterKey
        );

        vm.expectRevert("TEEAttestationVerifier: code not approved");
        verifier.attestRun(
            TEEAttestationVerifier.TEEKind.Phala,
            PROMPT_HASH,
            OUTPUT_HASH,
            badCode,
            sig
        );
    }

    function test_attestRun_reverts_unapproved_attester() public {
        uint256 badKey = 0xDEAD;
        bytes memory sig = _signRun(
            TEEAttestationVerifier.TEEKind.Phala,
            PROMPT_HASH,
            OUTPUT_HASH,
            CODE_HASH,
            badKey
        );

        vm.expectRevert("TEEAttestationVerifier: attester not approved");
        verifier.attestRun(
            TEEAttestationVerifier.TEEKind.Phala,
            PROMPT_HASH,
            OUTPUT_HASH,
            CODE_HASH,
            sig
        );
    }

    function test_attestRun_reverts_wrong_kind_for_attester() public {
        // attester is approved for Phala, not Marlin
        bytes memory sig = _signRun(
            TEEAttestationVerifier.TEEKind.Marlin,
            PROMPT_HASH,
            OUTPUT_HASH,
            CODE_HASH,
            attesterKey
        );

        vm.expectRevert("TEEAttestationVerifier: attester not approved");
        verifier.attestRun(
            TEEAttestationVerifier.TEEKind.Marlin,
            PROMPT_HASH,
            OUTPUT_HASH,
            CODE_HASH,
            sig
        );
    }

    function test_attestRun_reverts_invalid_signature() public {
        // Sign with wrong data
        bytes memory sig = _signRun(
            TEEAttestationVerifier.TEEKind.Phala,
            keccak256("wrong prompt"),
            OUTPUT_HASH,
            CODE_HASH,
            attesterKey
        );

        vm.expectRevert("TEEAttestationVerifier: attester not approved");
        verifier.attestRun(
            TEEAttestationVerifier.TEEKind.Phala,
            PROMPT_HASH,
            OUTPUT_HASH,
            CODE_HASH,
            sig
        );
    }

    // ─── isVerified ──────────────────────────────────────────────────────

    function test_isVerified_returns_false_unattested() public view {
        assertFalse(verifier.isVerified(keccak256("x"), keccak256("y"), keccak256("z")));
    }

    function test_isVerified_returns_true_after_attest() public {
        bytes memory sig = _signRun(
            TEEAttestationVerifier.TEEKind.Phala,
            PROMPT_HASH,
            OUTPUT_HASH,
            CODE_HASH,
            attesterKey
        );

        verifier.attestRun(
            TEEAttestationVerifier.TEEKind.Phala,
            PROMPT_HASH,
            OUTPUT_HASH,
            CODE_HASH,
            sig
        );

        assertTrue(verifier.isVerified(PROMPT_HASH, OUTPUT_HASH, CODE_HASH));
    }

    // ─── Marlin Kind ─────────────────────────────────────────────────────

    function test_attestRun_marlin_kind() public {
        uint256 marlinKey = 0xCAFE;
        address marlinAttester = vm.addr(marlinKey);
        verifier.approveAttesterAddress(TEEAttestationVerifier.TEEKind.Marlin, marlinAttester, true);

        bytes memory sig = _signRun(
            TEEAttestationVerifier.TEEKind.Marlin,
            PROMPT_HASH,
            OUTPUT_HASH,
            CODE_HASH,
            marlinKey
        );

        verifier.attestRun(
            TEEAttestationVerifier.TEEKind.Marlin,
            PROMPT_HASH,
            OUTPUT_HASH,
            CODE_HASH,
            sig
        );

        assertTrue(verifier.isVerified(PROMPT_HASH, OUTPUT_HASH, CODE_HASH));
    }
}
