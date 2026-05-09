// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/interfaces/IERC4626.sol";

/// @title CrossChainEntrypoint
/// @notice M27 receives cross-chain deposits via LayerZero, deposits into vault, sends OFT shares back
contract CrossChainEntrypoint is OApp {
    using SafeERC20 for IERC20;

    /// @notice The ERC4626 vault to deposit into
    IERC4626 public immutable vault;

    /// @notice The underlying asset of the vault
    IERC20 public immutable asset;

    /// @notice The OFT token contract for cross-chain shares
    address public oftToken;

    event CrossChainDeposit(uint32 indexed srcEid, address indexed depositor, uint256 amount, uint256 shares);
    event OFTTokenUpdated(address indexed newOft);

    error ZeroAmount();
    error ZeroAddress();

    constructor(
        address _endpoint,
        address _delegate,
        address _vault,
        address _oftToken
    ) OApp(_endpoint, _delegate) {
        vault = IERC4626(_vault);
        asset = IERC20(IERC4626(_vault).asset());
        oftToken = _oftToken;
    }

    /// @notice Set the OFT token address (only owner)
    /// @param _oftToken The new OFT token address
    function setOFTToken(address _oftToken) external onlyOwner {
        if (_oftToken == address(0)) revert ZeroAddress();
        oftToken = _oftToken;
        emit OFTTokenUpdated(_oftToken);
    }

    /// @notice Handle incoming cross-chain messages (deposits)
    /// @dev Called by LayerZero endpoint when a message arrives
    function _lzReceive(
        Origin calldata _origin,
        bytes32 /*_guid*/,
        bytes calldata _message,
        address /*_executor*/,
        bytes calldata /*_extraData*/
    ) internal override {
        (address depositor, uint256 amount) = abi.decode(_message, (address, uint256));
        if (amount == 0) revert ZeroAmount();

        // Approve vault to spend the asset
        asset.safeIncreaseAllowance(address(vault), amount);

        // Deposit into vault on behalf of depositor
        uint256 shares = vault.deposit(amount, depositor);

        emit CrossChainDeposit(_origin.srcEid, depositor, amount, shares);
    }

    /// @notice Deposit locally (for same-chain deposits through entrypoint)
    /// @param amount Amount of asset to deposit
    /// @param receiver Address to receive vault shares
    function depositLocal(uint256 amount, address receiver) external returns (uint256 shares) {
        if (amount == 0) revert ZeroAmount();
        if (receiver == address(0)) revert ZeroAddress();

        asset.safeTransferFrom(msg.sender, address(this), amount);
        asset.safeIncreaseAllowance(address(vault), amount);
        shares = vault.deposit(amount, receiver);
    }
}
