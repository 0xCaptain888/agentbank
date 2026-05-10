// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../../contracts/v3/ReputationV3.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev Minimal ERC-20 for staking tests.
contract MockERC20 is ERC20 {
    constructor() ERC20("Mock", "MCK") {}
    function mint(address to, uint256 amount) external { _mint(to, amount); }
}

contract ReputationV3Test is Test {

    ReputationV3 public rep;
    MockERC20    public token;

    address public admin   = address(0xA1);
    address public oracle  = address(0xA2);
    address public clientA = address(0xC1);
    address public clientB = address(0xC2);

    uint256 public constant AGENT_1 = 1;
    uint256 public constant AGENT_2 = 2;
    uint256 public constant REQUIRED_STAKE = 100 ether;

    function setUp() public {
        vm.startPrank(admin);

        token = new MockERC20();
        rep = new ReputationV3(admin, address(token), REQUIRED_STAKE);

        // Grant oracle role
        rep.grantRole(rep.ORACLE_ROLE(), oracle);

        // Authorize clients for agents
        rep.authorizeClient(AGENT_1, clientA);
        rep.authorizeClient(AGENT_1, clientB);
        rep.authorizeClient(AGENT_2, clientA);

        // Set client reliabilities
        rep.setClientReliability(clientA, 8000); // 80%
        rep.setClientReliability(clientB, 4000); // 40%

        vm.stopPrank();
    }

    // ─── Feedback Weight Scaling by Client Reliability ───────────────────

    function test_feedbackWeightedByReliability_highReliability() public {
        vm.prank(clientA);
        rep.submitFeedback(AGENT_1, 100, keccak256("ctx1"));

        // clientA reliability = 80%, score 100 → weighted = 80
        assertEq(rep.getReputation(AGENT_1), 80);
    }

    function test_feedbackWeightedByReliability_lowReliability() public {
        vm.prank(clientB);
        rep.submitFeedback(AGENT_1, 100, keccak256("ctx2"));

        // clientB reliability = 40%, score 100 → weighted = 40
        assertEq(rep.getReputation(AGENT_1), 40);
    }

    function test_feedbackWeightedByReliability_defaultReliability() public {
        // clientA gives feedback on AGENT_2, but let's use a new client with no reliability set
        address clientNew = address(0xC9);
        vm.prank(admin);
        rep.authorizeClient(AGENT_2, clientNew);

        vm.prank(clientNew);
        rep.submitFeedback(AGENT_2, 100, keccak256("ctx3"));

        // Default reliability = 50%, score 100 → weighted = 50
        assertEq(rep.getReputation(AGENT_2), 50);
    }

    function test_feedbackWeightedNegativeScore() public {
        vm.prank(clientA);
        rep.submitFeedback(AGENT_1, -50, keccak256("ctx4"));

        // clientA reliability = 80%, score -50 → weighted = -40
        assertEq(rep.getReputation(AGENT_1), -40);
    }

    function test_multipleFeedbacksAccumulate() public {
        vm.prank(clientA);
        rep.submitFeedback(AGENT_1, 50, keccak256("ctx5"));
        // weighted = 40, rep = 40

        // Warp past rate limit
        vm.warp(block.timestamp + 1 days + 1);

        vm.prank(clientA);
        rep.submitFeedback(AGENT_1, 50, keccak256("ctx6"));
        // weighted = 40, rep = 80

        assertEq(rep.getReputation(AGENT_1), 80);
    }

    // ─── Rate Limiting (1 per 24h) ──────────────────────────────────────

    function test_rateLimitBlocksSecondFeedbackWithin24h() public {
        vm.prank(clientA);
        rep.submitFeedback(AGENT_1, 50, keccak256("ctx7"));

        vm.prank(clientA);
        vm.expectRevert("rate limited: 1 per 24h");
        rep.submitFeedback(AGENT_1, 30, keccak256("ctx8"));
    }

    function test_rateLimitAllowsAfter24h() public {
        vm.prank(clientA);
        rep.submitFeedback(AGENT_1, 50, keccak256("ctx9"));

        vm.warp(block.timestamp + 24 hours + 1);

        vm.prank(clientA);
        rep.submitFeedback(AGENT_1, 30, keccak256("ctx10"));

        // 50*0.8 + 30*0.8 = 40 + 24 = 64
        assertEq(rep.getReputation(AGENT_1), 64);
    }

    function test_rateLimitPerClientPerAgent() public {
        // clientA submits for AGENT_1
        vm.prank(clientA);
        rep.submitFeedback(AGENT_1, 50, keccak256("ctx11"));

        // clientB can still submit for AGENT_1 in the same window
        vm.prank(clientB);
        rep.submitFeedback(AGENT_1, 50, keccak256("ctx12"));

        // 50*0.8 + 50*0.4 = 40 + 20 = 60
        assertEq(rep.getReputation(AGENT_1), 60);
    }

    function test_rateLimitSameClientDifferentAgents() public {
        // clientA can submit for AGENT_1 and AGENT_2 in the same window
        vm.prank(clientA);
        rep.submitFeedback(AGENT_1, 50, keccak256("ctx13"));

        vm.prank(clientA);
        rep.submitFeedback(AGENT_2, 50, keccak256("ctx14"));

        assertEq(rep.getReputation(AGENT_1), 40);
        assertEq(rep.getReputation(AGENT_2), 40);
    }

    // ─── Reputation Floor at -1000 ──────────────────────────────────────

    function test_reputationFloorEnforced() public {
        // Drive reputation very negative: need many feedbacks
        // Each feedback from clientA: -100 * 80% = -80
        // Need 13 feedbacks to go below -1000 (13 * -80 = -1040, clamped to -1000)
        for (uint256 i = 0; i < 13; i++) {
            vm.warp(block.timestamp + 1 days + 1);
            vm.prank(clientA);
            rep.submitFeedback(AGENT_1, -100, keccak256(abi.encodePacked("floor", i)));
        }

        assertEq(rep.getReputation(AGENT_1), -1000);
    }

    function test_reputationDoesNotGoBelowFloor() public {
        // Set reputation to exactly -1000 via repeated negative feedback
        for (uint256 i = 0; i < 15; i++) {
            vm.warp(block.timestamp + 1 days + 1);
            vm.prank(clientA);
            rep.submitFeedback(AGENT_1, -100, keccak256(abi.encodePacked("belowfloor", i)));
        }

        // Still -1000
        assertEq(rep.getReputation(AGENT_1), -1000);

        // One more negative feedback should stay at floor
        vm.warp(block.timestamp + 1 days + 1);
        vm.prank(clientA);
        rep.submitFeedback(AGENT_1, -100, keccak256("belowfloor_extra"));

        assertEq(rep.getReputation(AGENT_1), -1000);
    }

    // ─── Reputation Recovery After 30 Days Positive ─────────────────────

    function test_recoveryAfter30DaysPositive() public {
        // First, give some negative reputation
        vm.prank(clientA);
        rep.submitFeedback(AGENT_1, -100, keccak256("recov1"));
        // rep = -80

        // Now give positive feedback to start recovery streak
        vm.warp(block.timestamp + 1 days + 1);
        vm.prank(clientA);
        rep.submitFeedback(AGENT_1, 10, keccak256("recov2"));
        // rep = -80 + 8 = -72, streak starts

        // Warp 31 days ahead (past the 30-day qualifying period)
        vm.warp(block.timestamp + 31 days);

        // Apply recovery — should get at least 1 day of recovery (+5)
        rep.applyRecovery(AGENT_1);

        // Recovery bonus: 1 day * 5 = 5 (only 1 day past qualifying)
        assertEq(rep.getReputation(AGENT_1), -72 + 5);
    }

    function test_recoveryRevertsBeforeQualifyingPeriod() public {
        // Start a positive streak
        vm.prank(clientA);
        rep.submitFeedback(AGENT_1, 50, keccak256("recov3"));

        // Only 15 days later
        vm.warp(block.timestamp + 15 days);

        vm.expectRevert("streak < 30 days");
        rep.applyRecovery(AGENT_1);
    }

    function test_recoveryRevertsWithNoStreak() public {
        vm.expectRevert("no positive streak");
        rep.applyRecovery(AGENT_1);
    }

    function test_recoveryResetsByNegativeFeedback() public {
        // Start positive streak
        vm.prank(clientA);
        rep.submitFeedback(AGENT_1, 50, keccak256("recov4"));

        vm.warp(block.timestamp + 10 days);

        // Negative feedback resets streak
        vm.prank(clientA);
        rep.submitFeedback(AGENT_1, -10, keccak256("recov5"));

        // Warp another 31 days
        vm.warp(block.timestamp + 31 days);

        // Should fail because streak was reset
        vm.expectRevert("no positive streak");
        rep.applyRecovery(AGENT_1);
    }

    function test_recoveryMultipleDays() public {
        // Start positive streak
        vm.prank(clientA);
        rep.submitFeedback(AGENT_1, -100, keccak256("recov6"));
        // rep = -80

        vm.warp(block.timestamp + 1 days + 1);
        vm.prank(clientA);
        rep.submitFeedback(AGENT_1, 10, keccak256("recov7"));
        // rep = -72, streak starts

        // Warp 35 days
        vm.warp(block.timestamp + 35 days);

        rep.applyRecovery(AGENT_1);
        // 5 eligible days (35 - 30) * 5 = 25
        assertEq(rep.getReputation(AGENT_1), -72 + 25);
    }

    // ─── Disputed Feedback ──────────────────────────────────────────────

    function test_disputedFeedbackDoesNotAffectReputation() public {
        bytes32 ctx = keccak256("disputed_ctx");

        // Oracle sets vault PnL as very positive (+5000 bps = +50%)
        vm.prank(oracle);
        rep.setVaultPnl(ctx, 5000);

        // Client gives very negative feedback (score -100 = -10000 bps)
        // Deviation = |-10000 - 5000| = 15000 > 2000 → disputed
        vm.prank(clientA);
        rep.submitFeedback(AGENT_1, -100, ctx);

        // Reputation should be unchanged because feedback was disputed
        assertEq(rep.getReputation(AGENT_1), 0);

        // But feedback is still recorded
        assertEq(rep.getFeedbackCount(), 1);
    }

    // ─── Validation Stake (Hole 7) ──────────────────────────────────────

    function test_validationStake() public {
        bytes32 ctx = keccak256("val_ctx");

        token.mint(clientA, 200 ether);
        vm.startPrank(clientA);
        token.approve(address(rep), 200 ether);

        rep.stakeForValidation(ctx);
        vm.stopPrank();

        assertEq(rep.validationStakes(clientA, ctx), REQUIRED_STAKE);
        assertEq(token.balanceOf(address(rep)), REQUIRED_STAKE);
    }

    function test_validationStakeReturn() public {
        bytes32 ctx = keccak256("val_ctx2");

        token.mint(clientA, 200 ether);
        vm.prank(clientA);
        token.approve(address(rep), 200 ether);

        vm.prank(clientA);
        rep.stakeForValidation(ctx);

        vm.prank(admin);
        rep.returnStake(clientA, ctx);

        assertEq(rep.validationStakes(clientA, ctx), 0);
        assertEq(token.balanceOf(clientA), 200 ether);
    }

    function test_validationStakeCannotDoubleStake() public {
        bytes32 ctx = keccak256("val_ctx3");

        token.mint(clientA, 300 ether);
        vm.startPrank(clientA);
        token.approve(address(rep), 300 ether);

        rep.stakeForValidation(ctx);

        vm.expectRevert("already staked");
        rep.stakeForValidation(ctx);

        vm.stopPrank();
    }

    // ─── Access Control ─────────────────────────────────────────────────

    function test_unauthorizedClientReverts() public {
        address rando = address(0xDEAD);
        vm.prank(rando);
        vm.expectRevert("not authorized");
        rep.submitFeedback(AGENT_1, 50, keccak256("unauth"));
    }

    function test_scoreOutOfRangeReverts() public {
        vm.prank(clientA);
        vm.expectRevert("score out of range");
        rep.submitFeedback(AGENT_1, 101, keccak256("range"));
    }

    // ─── Client Reliability Getter ──────────────────────────────────────

    function test_clientReliabilityBpsReturnsSetValue() public view {
        assertEq(rep._clientReliabilityBps(clientA), 8000);
    }

    function test_clientReliabilityBpsReturnsDefaultForUnset() public view {
        assertEq(rep._clientReliabilityBps(address(0xBEEF)), 5000);
    }
}
