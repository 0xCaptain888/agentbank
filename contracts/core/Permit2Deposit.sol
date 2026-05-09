// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/IAllowanceTransfer.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title Permit2Deposit
 * @notice Mixin that adds gasless deposit support via Uniswap Permit2.
 *         Users sign a Permit2 message off-chain; a relayer submits the deposit tx.
 *         This enables gasless first-deposits from Telegram bot users.
 */
abstract contract Permit2Deposit {
    IAllowanceTransfer public constant PERMIT2 =
        IAllowanceTransfer(0x000000000022D473030F116dDEE9F6B43aC78BA3);

    event Permit2DepositExecuted(address indexed depositor, address indexed receiver, uint256 assets, uint256 shares);

    /**
     * @notice Deposit assets using Permit2 signature (gasless for the depositor).
     * @param assets Amount of underlying asset to deposit
     * @param receiver Address to receive vault shares
     * @param permit The Permit2 single permit struct
     * @param signature The EIP-712 signature from the depositor
     */
    function depositWithPermit2(
        uint256 assets,
        address receiver,
        IAllowanceTransfer.PermitSingle calldata permit,
        bytes calldata signature
    ) external virtual returns (uint256 shares) {
        // Execute permit
        PERMIT2.permit(msg.sender, permit, signature);

        // Transfer tokens from depositor to this contract via Permit2
        PERMIT2.transferFrom(
            msg.sender,
            address(this),
            uint160(assets),
            permit.details.token
        );

        // Calculate shares and mint (implemented by inheriting vault)
        shares = _permit2Deposit(msg.sender, receiver, assets);

        emit Permit2DepositExecuted(msg.sender, receiver, assets, shares);
    }

    /**
     * @dev Internal hook for the vault to handle the actual share minting.
     *      Must be implemented by the inheriting contract (AgentBankVaultV2).
     */
    function _permit2Deposit(
        address depositor,
        address receiver,
        uint256 assets
    ) internal virtual returns (uint256 shares);
}
