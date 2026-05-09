// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../../contracts/v3/ABNKToken.sol";

contract ABNKTokenTest is Test {
    ABNKToken public token;
    address public admin = address(0xA1);
    address public minter = address(0xA2);
    address public burner = address(0xA3);
    address public user = address(0xB1);

    function setUp() public {
        vm.startPrank(admin);
        token = new ABNKToken(admin);
        token.grantRole(token.MINTER_ROLE(), minter);
        token.grantRole(token.BURNER_ROLE(), burner);
        vm.stopPrank();
    }

    // ─── Mint Tests ──────────────────────────────────────────────────────

    function test_mint_success() public {
        vm.prank(minter);
        token.mint(user, 1000 ether);
        assertEq(token.balanceOf(user), 1000 ether);
        assertEq(token.totalSupply(), 1000 ether);
    }

    function test_mint_admin_can_mint() public {
        vm.prank(admin);
        token.mint(user, 500 ether);
        assertEq(token.balanceOf(user), 500 ether);
    }

    function test_mint_reverts_without_role() public {
        vm.prank(user);
        vm.expectRevert();
        token.mint(user, 100 ether);
    }

    function test_mint_multiple_recipients() public {
        address user2 = address(0xB2);
        vm.startPrank(minter);
        token.mint(user, 1000 ether);
        token.mint(user2, 2000 ether);
        vm.stopPrank();

        assertEq(token.balanceOf(user), 1000 ether);
        assertEq(token.balanceOf(user2), 2000 ether);
        assertEq(token.totalSupply(), 3000 ether);
    }

    // ─── Max Supply Tests ────────────────────────────────────────────────

    function test_max_supply_constant() public view {
        assertEq(token.MAX_SUPPLY(), 100_000_000 ether);
    }

    function test_mint_reverts_exceeds_max_supply() public {
        vm.startPrank(minter);
        token.mint(user, 100_000_000 ether);

        vm.expectRevert("ABNKToken: max supply exceeded");
        token.mint(user, 1);
        vm.stopPrank();
    }

    function test_mint_exactly_max_supply() public {
        vm.prank(minter);
        token.mint(user, 100_000_000 ether);
        assertEq(token.totalSupply(), 100_000_000 ether);
    }

    function test_mint_reverts_overflow_max_supply() public {
        vm.startPrank(minter);
        token.mint(user, 50_000_000 ether);
        vm.expectRevert("ABNKToken: max supply exceeded");
        token.mint(user, 50_000_001 ether);
        vm.stopPrank();
    }

    // ─── Burn Tests ──────────────────────────────────────────────────────

    function test_burn_success() public {
        vm.prank(minter);
        token.mint(user, 1000 ether);

        vm.prank(burner);
        token.burn(user, 400 ether);

        assertEq(token.balanceOf(user), 600 ether);
        assertEq(token.totalSupply(), 600 ether);
    }

    function test_burn_reverts_without_role() public {
        vm.prank(minter);
        token.mint(user, 1000 ether);

        vm.prank(user);
        vm.expectRevert();
        token.burn(user, 100 ether);
    }

    function test_burn_reverts_exceeds_balance() public {
        vm.prank(minter);
        token.mint(user, 100 ether);

        vm.prank(burner);
        vm.expectRevert();
        token.burn(user, 101 ether);
    }

    // ─── Role Tests ──────────────────────────────────────────────────────

    function test_admin_has_default_admin_role() public view {
        assertTrue(token.hasRole(token.DEFAULT_ADMIN_ROLE(), admin));
    }

    function test_admin_can_grant_minter_role() public {
        address newMinter = address(0xC1);
        vm.prank(admin);
        token.grantRole(token.MINTER_ROLE(), newMinter);
        assertTrue(token.hasRole(token.MINTER_ROLE(), newMinter));
    }

    function test_admin_can_revoke_minter_role() public {
        vm.prank(admin);
        token.revokeRole(token.MINTER_ROLE(), minter);

        vm.prank(minter);
        vm.expectRevert();
        token.mint(user, 1 ether);
    }

    function test_non_admin_cannot_grant_roles() public {
        vm.prank(user);
        vm.expectRevert();
        token.grantRole(token.MINTER_ROLE(), user);
    }

    // ─── Permit Tests ────────────────────────────────────────────────────

    function test_permit_success() public {
        uint256 privateKey = 0xBEEF;
        address owner = vm.addr(privateKey);
        address spender = address(0xD1);

        vm.prank(minter);
        token.mint(owner, 1000 ether);

        uint256 nonce = token.nonces(owner);
        uint256 deadline = block.timestamp + 1 hours;

        bytes32 domainSeparator = token.DOMAIN_SEPARATOR();
        bytes32 structHash = keccak256(
            abi.encode(
                keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"),
                owner,
                spender,
                500 ether,
                nonce,
                deadline
            )
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, digest);

        token.permit(owner, spender, 500 ether, deadline, v, r, s);
        assertEq(token.allowance(owner, spender), 500 ether);
    }

    function test_permit_reverts_expired_deadline() public {
        uint256 privateKey = 0xBEEF;
        address owner = vm.addr(privateKey);
        address spender = address(0xD1);

        vm.prank(minter);
        token.mint(owner, 1000 ether);

        uint256 nonce = token.nonces(owner);
        uint256 deadline = block.timestamp - 1; // expired

        bytes32 domainSeparator = token.DOMAIN_SEPARATOR();
        bytes32 structHash = keccak256(
            abi.encode(
                keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"),
                owner,
                spender,
                500 ether,
                nonce,
                deadline
            )
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, digest);

        vm.expectRevert();
        token.permit(owner, spender, 500 ether, deadline, v, r, s);
    }

    function test_nonces_increments_after_permit() public {
        uint256 privateKey = 0xBEEF;
        address owner = vm.addr(privateKey);
        address spender = address(0xD1);

        vm.prank(minter);
        token.mint(owner, 1000 ether);

        assertEq(token.nonces(owner), 0);

        uint256 deadline = block.timestamp + 1 hours;
        bytes32 domainSeparator = token.DOMAIN_SEPARATOR();
        bytes32 structHash = keccak256(
            abi.encode(
                keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"),
                owner,
                spender,
                100 ether,
                0,
                deadline
            )
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, digest);

        token.permit(owner, spender, 100 ether, deadline, v, r, s);
        assertEq(token.nonces(owner), 1);
    }

    // ─── ERC20 Metadata ─────────────────────────────────────────────────

    function test_name_and_symbol() public view {
        assertEq(token.name(), "AgentBank");
        assertEq(token.symbol(), "ABNK");
    }

    function test_decimals() public view {
        assertEq(token.decimals(), 18);
    }
}
