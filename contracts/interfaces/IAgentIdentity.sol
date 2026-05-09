// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

interface IAgentIdentity {
    function mintAgent(address agentWallet, string calldata name, string calldata agentType) external returns (uint256);
    function updateReputation(uint256 tokenId, int256 delta, string calldata reason) external;
    function getProfile(uint256 tokenId) external view returns (
        string memory name,
        string memory agentType,
        uint256 reputationScore,
        uint256 totalActions,
        uint256 successfulActions,
        uint256 blockedAttacks,
        uint256 mintedAt,
        bool active
    );
    function agentTokenId(address wallet) external view returns (uint256);
    function setAuthorizedUpdater(address updater, bool authorized) external;
}
