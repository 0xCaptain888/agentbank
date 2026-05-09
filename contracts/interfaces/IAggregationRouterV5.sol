// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IAggregationRouterV5 {
    struct SwapDescription {
        address srcToken;
        address dstToken;
        address payable srcReceiver;
        address payable dstReceiver;
        uint256 amount;
        uint256 minReturnAmount;
        uint256 flags;
    }
    function swap(
        address executor,
        SwapDescription calldata desc,
        bytes calldata permit,
        bytes calldata data
    ) external payable returns (uint256 returnAmount, uint256 spentAmount);
    function unoswap(address srcToken, uint256 amount, uint256 minReturn, uint256[] calldata pools) external returns (uint256 returnAmount);
}
