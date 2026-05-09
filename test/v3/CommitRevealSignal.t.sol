// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../../contracts/v3/CommitRevealSignal.sol";

contract CommitRevealSignalTest is Test {
    CommitRevealSignal public cr;

    address public analyst = address(0xA1);
    address public other = address(0xA2);

    bytes constant SIGNAL_DATA = hex"deadbeef";
    bytes32 constant SALT = keccak256("mysalt");

    function setUp() public {
        cr = new CommitRevealSignal();
    }

    function _commitHash(bytes memory signal, bytes32 salt) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(signal, salt));
    }

    // ─── Commit Tests ────────────────────────────────────────────────────

    function test_commit_success() public {
        bytes32 hash = _commitHash(SIGNAL_DATA, SALT);

        vm.prank(analyst);
        uint256 commitId = cr.commit(hash);

        assertEq(commitId, 0);

        (address storedAnalyst, bytes32 storedHash, uint256 commitBlock, bool revealed) = cr.commits(commitId);
        assertEq(storedAnalyst, analyst);
        assertEq(storedHash, hash);
        assertEq(commitBlock, block.number);
        assertFalse(revealed);
    }

    function test_commit_increments_id() public {
        bytes32 hash = _commitHash(SIGNAL_DATA, SALT);

        vm.startPrank(analyst);
        uint256 id0 = cr.commit(hash);
        uint256 id1 = cr.commit(hash);
        vm.stopPrank();

        assertEq(id0, 0);
        assertEq(id1, 1);
    }

    function test_commit_records_analyst_commits() public {
        bytes32 hash = _commitHash(SIGNAL_DATA, SALT);

        vm.startPrank(analyst);
        cr.commit(hash);
        cr.commit(hash);
        vm.stopPrank();

        uint256[] memory ids = cr.getAnalystCommits(analyst);
        assertEq(ids.length, 2);
        assertEq(ids[0], 0);
        assertEq(ids[1], 1);
    }

    // ─── Reveal Too Early (Fail) ────────────────────────────────────────

    function test_reveal_reverts_too_early() public {
        bytes32 hash = _commitHash(SIGNAL_DATA, SALT);

        vm.prank(analyst);
        uint256 commitId = cr.commit(hash);

        // Try to reveal in same block (0 blocks passed)
        vm.prank(analyst);
        vm.expectRevert(CommitRevealSignal.RevealTooEarly.selector);
        cr.reveal(commitId, SIGNAL_DATA, SALT);
    }

    function test_reveal_reverts_at_delay_minus_one() public {
        bytes32 hash = _commitHash(SIGNAL_DATA, SALT);

        vm.prank(analyst);
        uint256 commitId = cr.commit(hash);

        // Roll forward 4 blocks (delay is 5)
        vm.roll(block.number + 4);

        vm.prank(analyst);
        vm.expectRevert(CommitRevealSignal.RevealTooEarly.selector);
        cr.reveal(commitId, SIGNAL_DATA, SALT);
    }

    // ─── Reveal After Delay (Success) ────────────────────────────────────

    function test_reveal_success_after_delay() public {
        bytes32 hash = _commitHash(SIGNAL_DATA, SALT);

        vm.prank(analyst);
        uint256 commitId = cr.commit(hash);

        vm.roll(block.number + 5);

        vm.prank(analyst);
        cr.reveal(commitId, SIGNAL_DATA, SALT);

        (,,, bool revealed) = cr.commits(commitId);
        assertTrue(revealed);
    }

    function test_reveal_success_well_after_delay() public {
        bytes32 hash = _commitHash(SIGNAL_DATA, SALT);

        vm.prank(analyst);
        uint256 commitId = cr.commit(hash);

        vm.roll(block.number + 100);

        vm.prank(analyst);
        cr.reveal(commitId, SIGNAL_DATA, SALT);

        (,,, bool revealed) = cr.commits(commitId);
        assertTrue(revealed);
    }

    // ─── Hash Mismatch (Fail) ────────────────────────────────────────────

    function test_reveal_reverts_wrong_signal() public {
        bytes32 hash = _commitHash(SIGNAL_DATA, SALT);

        vm.prank(analyst);
        uint256 commitId = cr.commit(hash);

        vm.roll(block.number + 5);

        bytes memory wrongSignal = hex"cafebabe";
        vm.prank(analyst);
        vm.expectRevert(CommitRevealSignal.InvalidReveal.selector);
        cr.reveal(commitId, wrongSignal, SALT);
    }

    function test_reveal_reverts_wrong_salt() public {
        bytes32 hash = _commitHash(SIGNAL_DATA, SALT);

        vm.prank(analyst);
        uint256 commitId = cr.commit(hash);

        vm.roll(block.number + 5);

        bytes32 wrongSalt = keccak256("wrong");
        vm.prank(analyst);
        vm.expectRevert(CommitRevealSignal.InvalidReveal.selector);
        cr.reveal(commitId, SIGNAL_DATA, wrongSalt);
    }

    // ─── Other Edge Cases ────────────────────────────────────────────────

    function test_reveal_reverts_not_analyst() public {
        bytes32 hash = _commitHash(SIGNAL_DATA, SALT);

        vm.prank(analyst);
        uint256 commitId = cr.commit(hash);

        vm.roll(block.number + 5);

        vm.prank(other);
        vm.expectRevert(CommitRevealSignal.NotAnalyst.selector);
        cr.reveal(commitId, SIGNAL_DATA, SALT);
    }

    function test_reveal_reverts_already_revealed() public {
        bytes32 hash = _commitHash(SIGNAL_DATA, SALT);

        vm.prank(analyst);
        uint256 commitId = cr.commit(hash);

        vm.roll(block.number + 5);

        vm.prank(analyst);
        cr.reveal(commitId, SIGNAL_DATA, SALT);

        vm.prank(analyst);
        vm.expectRevert(CommitRevealSignal.AlreadyRevealed.selector);
        cr.reveal(commitId, SIGNAL_DATA, SALT);
    }

    function test_reveal_reverts_commit_not_found() public {
        vm.roll(block.number + 5);
        vm.prank(analyst);
        vm.expectRevert(CommitRevealSignal.CommitNotFound.selector);
        cr.reveal(999, SIGNAL_DATA, SALT);
    }

    function test_canReveal_returns_false_before_delay() public {
        bytes32 hash = _commitHash(SIGNAL_DATA, SALT);

        vm.prank(analyst);
        uint256 commitId = cr.commit(hash);

        assertFalse(cr.canReveal(commitId));
    }

    function test_canReveal_returns_true_after_delay() public {
        bytes32 hash = _commitHash(SIGNAL_DATA, SALT);

        vm.prank(analyst);
        uint256 commitId = cr.commit(hash);

        vm.roll(block.number + 5);
        assertTrue(cr.canReveal(commitId));
    }
}
