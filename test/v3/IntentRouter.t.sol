// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../../contracts/v3/IntentRouter.sol";
import "../../contracts/v3/SolverRegistry.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/interfaces/IERC4626.sol";

// ─── Mock Contracts ──────────────────────────────────────────────────────────

contract MockERC20 is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract MockVault is ERC20 {
    IERC20 public asset;

    constructor(address _asset) ERC20("Vault Shares", "vSHR") {
        asset = IERC20(_asset);
    }

    function deposit(uint256 assets, address receiver) external returns (uint256 shares) {
        asset.transferFrom(msg.sender, address(this), assets);
        shares = assets; // 1:1
        _mint(receiver, shares);
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

contract IntentRouterTest is Test {
    IntentRouter public router;
    SolverRegistry public solverRegistry;
    MockERC20 public usdc;
    MockERC20 public mnt;
    MockVault public vault;
    MockVault public vault2;

    address public user = address(0xB1);
    address public solver1 = address(0xC1);
    address public solver2 = address(0xC2);
    address public anyone = address(0xD1);

    uint256 constant DEPOSIT_AMOUNT = 10_000e18;
    uint256 constant BOND_AMOUNT = 100e18;
    uint256 constant MIN_STAKE = 50e18;

    function setUp() public {
        usdc = new MockERC20("USD Coin", "USDC");
        mnt = new MockERC20("Mantle", "MNT");
        vault = new MockVault(address(usdc));
        vault2 = new MockVault(address(usdc));

        solverRegistry = new SolverRegistry(address(mnt), MIN_STAKE);
        router = new IntentRouter(address(mnt), address(solverRegistry));

        // Fund user
        usdc.mint(user, 100_000e18);
        vm.prank(user);
        usdc.approve(address(router), type(uint256).max);

        // Register solvers
        mnt.mint(solver1, 10_000e18);
        mnt.mint(solver2, 10_000e18);

        vm.startPrank(solver1);
        mnt.approve(address(solverRegistry), type(uint256).max);
        mnt.approve(address(router), type(uint256).max);
        solverRegistry.register(MIN_STAKE);
        vm.stopPrank();

        vm.startPrank(solver2);
        mnt.approve(address(solverRegistry), type(uint256).max);
        mnt.approve(address(router), type(uint256).max);
        solverRegistry.register(MIN_STAKE);
        vm.stopPrank();
    }

    // ─── postIntent ──────────────────────────────────────────────────────

    function test_postIntent_success() public {
        vm.prank(user);
        uint256 intentId = router.postIntent(
            address(usdc),
            DEPOSIT_AMOUNT,
            500, // 5% min APY
            1000, // 10% max drawdown
            30 days,
            block.timestamp + 1 hours
        );

        assertEq(intentId, 0);
        assertEq(usdc.balanceOf(address(router)), DEPOSIT_AMOUNT);

        (
            uint256 id,
            address intentUser,
            address asset,
            uint256 amount,
            uint256 minApyBps,
            uint256 maxDrawdownBps,
            uint256 duration,
            uint256 deadline,
            IntentRouter.Status status,
            ,
        ) = router.intents(intentId);

        assertEq(id, 0);
        assertEq(intentUser, user);
        assertEq(asset, address(usdc));
        assertEq(amount, DEPOSIT_AMOUNT);
        assertEq(minApyBps, 500);
        assertEq(maxDrawdownBps, 1000);
        assertEq(duration, 30 days);
        assertEq(deadline, block.timestamp + 1 hours);
        assertEq(uint8(status), uint8(IntentRouter.Status.Open));
    }

    function test_postIntent_reverts_deadline_passed() public {
        vm.prank(user);
        vm.expectRevert(IntentRouter.DeadlinePassed.selector);
        router.postIntent(address(usdc), DEPOSIT_AMOUNT, 500, 1000, 30 days, block.timestamp - 1);
    }

    function test_postIntent_increments_id() public {
        vm.startPrank(user);
        uint256 id0 = router.postIntent(address(usdc), 1000e18, 500, 1000, 30 days, block.timestamp + 1 hours);
        uint256 id1 = router.postIntent(address(usdc), 2000e18, 500, 1000, 30 days, block.timestamp + 1 hours);
        vm.stopPrank();

        assertEq(id0, 0);
        assertEq(id1, 1);
    }

    // ─── submitBid ───────────────────────────────────────────────────────

    function test_submitBid_success() public {
        vm.prank(user);
        uint256 intentId = router.postIntent(
            address(usdc), DEPOSIT_AMOUNT, 500, 1000, 30 days, block.timestamp + 1 hours
        );

        vm.prank(solver1);
        uint256 bidId = router.submitBid(intentId, address(vault), 800, BOND_AMOUNT);

        assertEq(bidId, 0);
        assertEq(mnt.balanceOf(address(router)), BOND_AMOUNT);

        uint256[] memory bidIds = router.getIntentBids(intentId);
        assertEq(bidIds.length, 1);
        assertEq(bidIds[0], 0);
    }

    function test_submitBid_reverts_not_registered_solver() public {
        vm.prank(user);
        uint256 intentId = router.postIntent(
            address(usdc), DEPOSIT_AMOUNT, 500, 1000, 30 days, block.timestamp + 1 hours
        );

        address unregistered = address(0xFADE);
        mnt.mint(unregistered, 1000e18);
        vm.startPrank(unregistered);
        mnt.approve(address(router), type(uint256).max);
        vm.expectRevert(IntentRouter.SolverNotRegistered.selector);
        router.submitBid(intentId, address(vault), 800, BOND_AMOUNT);
        vm.stopPrank();
    }

    function test_submitBid_reverts_auction_ended() public {
        vm.prank(user);
        uint256 intentId = router.postIntent(
            address(usdc), DEPOSIT_AMOUNT, 500, 1000, 30 days, block.timestamp + 1 hours
        );

        vm.warp(block.timestamp + 31 minutes);

        vm.prank(solver1);
        vm.expectRevert(IntentRouter.AuctionEnded.selector);
        router.submitBid(intentId, address(vault), 800, BOND_AMOUNT);
    }

    function test_submitBid_reverts_zero_bond() public {
        vm.prank(user);
        uint256 intentId = router.postIntent(
            address(usdc), DEPOSIT_AMOUNT, 500, 1000, 30 days, block.timestamp + 1 hours
        );

        vm.prank(solver1);
        vm.expectRevert(IntentRouter.InsufficientBond.selector);
        router.submitBid(intentId, address(vault), 800, 0);
    }

    // ─── settleAuction (winner selection) ────────────────────────────────

    function test_settleAuction_selects_highest_apy() public {
        vm.prank(user);
        uint256 intentId = router.postIntent(
            address(usdc), DEPOSIT_AMOUNT, 500, 1000, 30 days, block.timestamp + 1 hours
        );

        vm.prank(solver1);
        router.submitBid(intentId, address(vault), 700, BOND_AMOUNT); // bid 0

        vm.prank(solver2);
        router.submitBid(intentId, address(vault2), 1200, BOND_AMOUNT); // bid 1 - higher

        vm.warp(block.timestamp + 31 minutes);

        vm.prank(anyone);
        router.settleAuction(intentId);

        (,,,,,,,, IntentRouter.Status status, uint256 winningBid,) = router.intents(intentId);
        assertEq(uint8(status), uint8(IntentRouter.Status.Filled));
        assertEq(winningBid, 1); // bid 1 from solver2
    }

    // ─── settleAuction (refund losers) ───────────────────────────────────

    function test_settleAuction_refunds_losing_bidders() public {
        vm.prank(user);
        uint256 intentId = router.postIntent(
            address(usdc), DEPOSIT_AMOUNT, 500, 1000, 30 days, block.timestamp + 1 hours
        );

        uint256 solver1BalBefore = mnt.balanceOf(solver1);

        vm.prank(solver1);
        router.submitBid(intentId, address(vault), 700, BOND_AMOUNT);

        vm.prank(solver2);
        router.submitBid(intentId, address(vault2), 1200, BOND_AMOUNT);

        vm.warp(block.timestamp + 31 minutes);

        vm.prank(anyone);
        router.settleAuction(intentId);

        // solver1 lost, should get bond back
        assertEq(mnt.balanceOf(solver1), solver1BalBefore);
    }

    // ─── settleAuction (deposit into vault) ──────────────────────────────

    function test_settleAuction_deposits_into_winning_vault() public {
        vm.prank(user);
        uint256 intentId = router.postIntent(
            address(usdc), DEPOSIT_AMOUNT, 500, 1000, 30 days, block.timestamp + 1 hours
        );

        vm.prank(solver1);
        router.submitBid(intentId, address(vault), 1000, BOND_AMOUNT);

        vm.warp(block.timestamp + 31 minutes);

        vm.prank(anyone);
        router.settleAuction(intentId);

        // User should have vault shares (1:1 in mock)
        assertEq(vault.balanceOf(user), DEPOSIT_AMOUNT);
        // USDC should be in the vault
        assertEq(usdc.balanceOf(address(vault)), DEPOSIT_AMOUNT);
    }

    // ─── settleAuction (expired intent refund) ───────────────────────────

    function test_settleAuction_expires_with_no_bids() public {
        vm.prank(user);
        uint256 intentId = router.postIntent(
            address(usdc), DEPOSIT_AMOUNT, 500, 1000, 30 days, block.timestamp + 1 hours
        );

        uint256 userBalBefore = usdc.balanceOf(user);

        vm.warp(block.timestamp + 31 minutes);

        vm.prank(anyone);
        router.settleAuction(intentId);

        (,,,,,,,, IntentRouter.Status status,,) = router.intents(intentId);
        assertEq(uint8(status), uint8(IntentRouter.Status.Expired));
        // User gets refund
        assertEq(usdc.balanceOf(user), userBalBefore + DEPOSIT_AMOUNT);
    }

    // ─── settleAuction reverts ───────────────────────────────────────────

    function test_settleAuction_reverts_before_auction_end() public {
        vm.prank(user);
        uint256 intentId = router.postIntent(
            address(usdc), DEPOSIT_AMOUNT, 500, 1000, 30 days, block.timestamp + 1 hours
        );

        vm.prank(anyone);
        vm.expectRevert(IntentRouter.AuctionNotEnded.selector);
        router.settleAuction(intentId);
    }

    function test_settleAuction_reverts_already_settled() public {
        vm.prank(user);
        uint256 intentId = router.postIntent(
            address(usdc), DEPOSIT_AMOUNT, 500, 1000, 30 days, block.timestamp + 1 hours
        );

        vm.warp(block.timestamp + 31 minutes);

        vm.prank(anyone);
        router.settleAuction(intentId); // expires (no bids)

        vm.prank(anyone);
        vm.expectRevert(IntentRouter.IntentNotOpen.selector);
        router.settleAuction(intentId);
    }

    // ─── Cancel Intent ───────────────────────────────────────────────────

    function test_cancelIntent_refunds_user_and_bidders() public {
        vm.prank(user);
        uint256 intentId = router.postIntent(
            address(usdc), DEPOSIT_AMOUNT, 500, 1000, 30 days, block.timestamp + 1 hours
        );

        uint256 solver1BalBefore = mnt.balanceOf(solver1);

        vm.prank(solver1);
        router.submitBid(intentId, address(vault), 700, BOND_AMOUNT);

        uint256 userBalBefore = usdc.balanceOf(user);

        vm.prank(user);
        router.cancelIntent(intentId);

        assertEq(usdc.balanceOf(user), userBalBefore + DEPOSIT_AMOUNT);
        assertEq(mnt.balanceOf(solver1), solver1BalBefore);

        (,,,,,,,, IntentRouter.Status status,,) = router.intents(intentId);
        assertEq(uint8(status), uint8(IntentRouter.Status.Cancelled));
    }

    function test_cancelIntent_reverts_not_owner() public {
        vm.prank(user);
        uint256 intentId = router.postIntent(
            address(usdc), DEPOSIT_AMOUNT, 500, 1000, 30 days, block.timestamp + 1 hours
        );

        vm.prank(anyone);
        vm.expectRevert(IntentRouter.NotIntentOwner.selector);
        router.cancelIntent(intentId);
    }
}
