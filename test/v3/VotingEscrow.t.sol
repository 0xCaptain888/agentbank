// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../../contracts/v3/VotingEscrow.sol";
import "../../contracts/v3/ABNKToken.sol";

contract VotingEscrowTest is Test {
    VotingEscrow public ve;
    ABNKToken public token;

    address public admin = address(0xA1);
    address public alice = address(0xB1);
    address public bob = address(0xB2);

    uint128 constant LOCK_AMOUNT = 1000 ether;
    uint256 constant ONE_YEAR = 365 days;

    function setUp() public {
        vm.startPrank(admin);
        token = new ABNKToken(admin);
        ve = new VotingEscrow(address(token));

        token.mint(alice, 10_000 ether);
        token.mint(bob, 10_000 ether);
        vm.stopPrank();

        vm.prank(alice);
        token.approve(address(ve), type(uint256).max);

        vm.prank(bob);
        token.approve(address(ve), type(uint256).max);
    }

    // ─── Create Lock ─────────────────────────────────────────────────────

    function test_createLock_success() public {
        vm.prank(alice);
        ve.createLock(LOCK_AMOUNT, ONE_YEAR);

        (uint128 amount, uint128 end) = ve.locks(alice);
        assertEq(amount, LOCK_AMOUNT);
        assertEq(end, uint128(block.timestamp + ONE_YEAR));
        assertEq(token.balanceOf(address(ve)), LOCK_AMOUNT);
    }

    function test_createLock_reverts_zero_amount() public {
        vm.prank(alice);
        vm.expectRevert("VotingEscrow: zero amount");
        ve.createLock(0, ONE_YEAR);
    }

    function test_createLock_reverts_lock_exists() public {
        vm.startPrank(alice);
        ve.createLock(LOCK_AMOUNT, ONE_YEAR);
        vm.expectRevert("VotingEscrow: lock exists");
        ve.createLock(LOCK_AMOUNT, ONE_YEAR);
        vm.stopPrank();
    }

    function test_createLock_reverts_below_min_lock() public {
        vm.prank(alice);
        vm.expectRevert("VotingEscrow: duration < MIN_LOCK");
        ve.createLock(LOCK_AMOUNT, 6 days);
    }

    function test_createLock_reverts_above_max_lock() public {
        vm.prank(alice);
        vm.expectRevert("VotingEscrow: duration > MAX_LOCK");
        ve.createLock(LOCK_AMOUNT, 5 * 365 days);
    }

    function test_createLock_min_duration() public {
        vm.prank(alice);
        ve.createLock(LOCK_AMOUNT, 7 days);
        (uint128 amount,) = ve.locks(alice);
        assertEq(amount, LOCK_AMOUNT);
    }

    // ─── Increase Amount ─────────────────────────────────────────────────

    function test_increaseAmount_success() public {
        vm.startPrank(alice);
        ve.createLock(LOCK_AMOUNT, ONE_YEAR);
        ve.increaseAmount(500 ether);
        vm.stopPrank();

        (uint128 amount,) = ve.locks(alice);
        assertEq(amount, LOCK_AMOUNT + 500 ether);
        assertEq(token.balanceOf(address(ve)), LOCK_AMOUNT + 500 ether);
    }

    function test_increaseAmount_reverts_no_lock() public {
        vm.prank(alice);
        vm.expectRevert("VotingEscrow: no lock");
        ve.increaseAmount(100 ether);
    }

    function test_increaseAmount_reverts_expired_lock() public {
        vm.prank(alice);
        ve.createLock(LOCK_AMOUNT, 7 days);

        vm.warp(block.timestamp + 8 days);

        vm.prank(alice);
        vm.expectRevert("VotingEscrow: lock expired");
        ve.increaseAmount(100 ether);
    }

    function test_increaseAmount_reverts_zero_amount() public {
        vm.prank(alice);
        ve.createLock(LOCK_AMOUNT, ONE_YEAR);

        vm.prank(alice);
        vm.expectRevert("VotingEscrow: zero amount");
        ve.increaseAmount(0);
    }

    // ─── Increase Lock Time ──────────────────────────────────────────────

    function test_increaseLockTime_success() public {
        vm.prank(alice);
        ve.createLock(LOCK_AMOUNT, ONE_YEAR);

        uint128 newEnd = uint128(block.timestamp + 2 * ONE_YEAR);

        vm.prank(alice);
        ve.increaseLockTime(newEnd);

        (, uint128 end) = ve.locks(alice);
        assertEq(end, newEnd);
    }

    function test_increaseLockTime_reverts_no_lock() public {
        vm.prank(alice);
        vm.expectRevert("VotingEscrow: no lock");
        ve.increaseLockTime(uint128(block.timestamp + ONE_YEAR));
    }

    function test_increaseLockTime_reverts_expired() public {
        vm.prank(alice);
        ve.createLock(LOCK_AMOUNT, 7 days);

        vm.warp(block.timestamp + 8 days);

        vm.prank(alice);
        vm.expectRevert("VotingEscrow: lock expired");
        ve.increaseLockTime(uint128(block.timestamp + ONE_YEAR));
    }

    function test_increaseLockTime_reverts_not_later() public {
        vm.prank(alice);
        ve.createLock(LOCK_AMOUNT, ONE_YEAR);

        (, uint128 currentEnd) = ve.locks(alice);

        vm.prank(alice);
        vm.expectRevert("VotingEscrow: new end must be later");
        ve.increaseLockTime(currentEnd - 1);
    }

    function test_increaseLockTime_reverts_exceeds_max() public {
        vm.prank(alice);
        ve.createLock(LOCK_AMOUNT, ONE_YEAR);

        uint128 tooFar = uint128(block.timestamp + 4 * 365 days + 1);

        vm.prank(alice);
        vm.expectRevert("VotingEscrow: exceeds MAX_LOCK");
        ve.increaseLockTime(tooFar);
    }

    // ─── Withdraw ────────────────────────────────────────────────────────

    function test_withdraw_success() public {
        vm.prank(alice);
        ve.createLock(LOCK_AMOUNT, ONE_YEAR);

        vm.warp(block.timestamp + ONE_YEAR);

        uint256 balBefore = token.balanceOf(alice);
        vm.prank(alice);
        ve.withdraw();

        assertEq(token.balanceOf(alice), balBefore + LOCK_AMOUNT);
        (uint128 amount,) = ve.locks(alice);
        assertEq(amount, 0);
    }

    function test_withdraw_reverts_before_expiry() public {
        vm.prank(alice);
        ve.createLock(LOCK_AMOUNT, ONE_YEAR);

        vm.warp(block.timestamp + ONE_YEAR - 1);

        vm.prank(alice);
        vm.expectRevert("VotingEscrow: lock not expired");
        ve.withdraw();
    }

    function test_withdraw_reverts_no_lock() public {
        vm.prank(alice);
        vm.expectRevert("VotingEscrow: no lock");
        ve.withdraw();
    }

    // ─── Voting Power ────────────────────────────────────────────────────

    function test_votingPower_at_creation() public {
        vm.prank(alice);
        ve.createLock(LOCK_AMOUNT, 4 * 365 days); // max lock

        // At max lock: power = amount * MAX_LOCK / MAX_LOCK = amount
        uint256 power = ve.balanceOf(alice);
        assertEq(power, uint256(LOCK_AMOUNT));
    }

    function test_votingPower_decays_linearly() public {
        vm.prank(alice);
        ve.createLock(LOCK_AMOUNT, 4 * 365 days);

        // After half the lock period, power should be half
        vm.warp(block.timestamp + 2 * 365 days);
        uint256 power = ve.balanceOf(alice);
        assertApproxEqAbs(power, uint256(LOCK_AMOUNT) / 2, 1);
    }

    function test_votingPower_zero_after_expiry() public {
        vm.prank(alice);
        ve.createLock(LOCK_AMOUNT, ONE_YEAR);

        vm.warp(block.timestamp + ONE_YEAR);
        assertEq(ve.balanceOf(alice), 0);
    }

    function test_votingPower_zero_for_no_lock() public view {
        assertEq(ve.balanceOf(alice), 0);
    }

    function test_votingPower_proportional_to_amount() public {
        vm.prank(alice);
        ve.createLock(LOCK_AMOUNT, 2 * 365 days);

        vm.prank(bob);
        ve.createLock(2 * LOCK_AMOUNT, 2 * 365 days);

        uint256 alicePower = ve.balanceOf(alice);
        uint256 bobPower = ve.balanceOf(bob);
        assertEq(bobPower, 2 * alicePower);
    }
}
