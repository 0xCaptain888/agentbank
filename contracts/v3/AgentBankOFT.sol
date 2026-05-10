// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@layerzerolabs/oft-evm/contracts/OFT.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title AgentBankOFT
/// @notice M27 LayerZero V2 OFT for cross-chain ABV2 vault shares
contract AgentBankOFT is OFT {
    /// @notice The canonical vault address on the home chain
    address public canonicalVault;

    /// @notice Whether this deployment is on the canonical (home) chain
    bool public isCanonical;

    event CanonicalVaultSet(address indexed vault);
    event CanonicalStatusSet(bool isCanonical);

    error OnlyCanonical();
    error ZeroAddress();

    constructor(
        string memory _name,
        string memory _symbol,
        address _lzEndpoint,
        address _delegate,
        address _canonicalVault,
        bool _isCanonical
    ) OFT(_name, _symbol, _lzEndpoint, _delegate) Ownable(_delegate) {
        canonicalVault = _canonicalVault;
        isCanonical = _isCanonical;
    }

    /// @notice Set the canonical vault address (only owner)
    /// @param _vault The new canonical vault address
    function setCanonicalVault(address _vault) external onlyOwner {
        if (_vault == address(0)) revert ZeroAddress();
        canonicalVault = _vault;
        emit CanonicalVaultSet(_vault);
    }

    /// @notice Set canonical status (only owner)
    /// @param _isCanonical Whether this is the canonical deployment
    function setCanonical(bool _isCanonical) external onlyOwner {
        isCanonical = _isCanonical;
        emit CanonicalStatusSet(_isCanonical);
    }

    /// @notice Mint shares on canonical chain (called by vault after deposit)
    /// @param _to Recipient of shares
    /// @param _amount Amount of shares to mint
    function mintShares(address _to, uint256 _amount) external {
        if (!isCanonical) revert OnlyCanonical();
        if (msg.sender != canonicalVault) revert OnlyCanonical();
        _mint(_to, _amount);
    }

    /// @notice Burn shares on canonical chain (called by vault on withdrawal)
    /// @param _from Address to burn from
    /// @param _amount Amount of shares to burn
    function burnShares(address _from, uint256 _amount) external {
        if (!isCanonical) revert OnlyCanonical();
        if (msg.sender != canonicalVault) revert OnlyCanonical();
        _burn(_from, _amount);
    }
}
