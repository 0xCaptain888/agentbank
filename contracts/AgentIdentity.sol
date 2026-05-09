// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AgentIdentity
 * @notice ERC-8004-compatible agent identity NFT.
 *         Each agent gets one NFT at deployment. Reputation score is updated
 *         on-chain after every operation.
 */
contract AgentIdentity is ERC721, Ownable {

    uint256 private _nextTokenId;

    struct AgentProfile {
        string  name;           // "Analyst", "Executor", "Guard", "Allocator"
        string  agentType;      // "analyst" | "executor" | "guard" | "allocator"
        uint256 reputationScore;
        uint256 totalActions;
        uint256 successfulActions;
        uint256 blockedAttacks;  // Guard only
        uint256 mintedAt;
        bool    active;
    }

    mapping(uint256 => AgentProfile) public profiles;
    mapping(address => uint256)      public agentTokenId;  // agent wallet → tokenId

    // Authorized updaters (vault contract + owner)
    mapping(address => bool) public authorizedUpdaters;

    event AgentMinted(
        uint256 indexed tokenId,
        address indexed agentWallet,
        string  name,
        string  agentType,
        uint256 timestamp
    );

    event ReputationUpdated(
        uint256 indexed tokenId,
        int256  delta,
        uint256 newScore,
        string  reason,
        uint256 timestamp
    );

    constructor() ERC721("AgentBank Identity", "AGID") Ownable(msg.sender) {}

    function mintAgent(
        address agentWallet,
        string  calldata name,
        string  calldata agentType
    ) external onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(agentWallet, tokenId);

        profiles[tokenId] = AgentProfile({
            name:             name,
            agentType:        agentType,
            reputationScore:  100,   // start at 100
            totalActions:     0,
            successfulActions:0,
            blockedAttacks:   0,
            mintedAt:         block.timestamp,
            active:           true
        });

        agentTokenId[agentWallet] = tokenId;

        emit AgentMinted(tokenId, agentWallet, name, agentType, block.timestamp);
        return tokenId;
    }

    function updateReputation(
        uint256 tokenId,
        int256  delta,
        string  calldata reason
    ) external {
        require(authorizedUpdaters[msg.sender] || msg.sender == owner(), "Not authorized");

        AgentProfile storage profile = profiles[tokenId];

        if (delta > 0) {
            profile.reputationScore += uint256(delta);
            profile.successfulActions++;
        } else {
            uint256 absDelta = uint256(-delta);
            profile.reputationScore = profile.reputationScore > absDelta
                ? profile.reputationScore - absDelta
                : 0;
        }

        profile.totalActions++;

        emit ReputationUpdated(
            tokenId,
            delta,
            profile.reputationScore,
            reason,
            block.timestamp
        );
    }

    function setAuthorizedUpdater(address updater, bool authorized) external onlyOwner {
        authorizedUpdaters[updater] = authorized;
    }

    function getProfile(uint256 tokenId) external view returns (AgentProfile memory) {
        return profiles[tokenId];
    }

    function getProfileByWallet(address wallet) external view returns (AgentProfile memory) {
        return profiles[agentTokenId[wallet]];
    }
}
