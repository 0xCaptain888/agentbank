// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {ERC20Votes} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Nonces} from "@openzeppelin/contracts/utils/Nonces.sol";

/**
 * @title ABNKToken
 * @notice M21 - ERC20 governance token with permit, votes, and role-based minting/burning.
 */
contract ABNKToken is ERC20, ERC20Permit, ERC20Votes, AccessControl {
    uint256 public constant MAX_SUPPLY = 100_000_000 ether;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    constructor(address admin) ERC20("AgentBank", "ABNK") ERC20Permit("AgentBank") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _grantRole(BURNER_ROLE, admin);
    }

    /**
     * @notice Mint tokens to an address. Reverts if max supply would be exceeded.
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        require(totalSupply() + amount <= MAX_SUPPLY, "ABNKToken: max supply exceeded");
        _mint(to, amount);
    }

    /**
     * @notice Burn tokens from an address. Caller must have BURNER_ROLE.
     */
    function burn(address from, uint256 amount) external onlyRole(BURNER_ROLE) {
        _burn(from, amount);
    }

    // ─── Override conflicts ───────────────────────────────────────────────

    function _update(address from, address to, uint256 value) internal override(ERC20, ERC20Votes) {
        super._update(from, to, value);
    }

    function nonces(address owner) public view override(ERC20Permit, Nonces) returns (uint256) {
        return super.nonces(owner);
    }
}
