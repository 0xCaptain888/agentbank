// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title SignalNFT
/// @notice M26 ERC-721 representing executed trade signals as tradeable NFTs
contract SignalNFT is ERC721URIStorage, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    struct SignalMeta {
        uint256 signalId;
        address analyst;
        int256 pnl;
        bytes32 reasoningHash;
        bytes32 attestationId;
        uint256 mintedAt;
    }

    uint256 public nextTokenId;
    mapping(uint256 => SignalMeta) public signalMeta;

    event SignalMinted(uint256 indexed tokenId, uint256 indexed signalId, address indexed analyst, int256 pnl);

    error Unauthorized();

    constructor() ERC721("AgentBank Signal", "ABSIG") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    /// @notice Mint an NFT for a successfully executed signal
    /// @param analyst The analyst who generated the signal
    /// @param signalId The unique signal identifier
    /// @param pnl The profit/loss of the trade
    /// @param reasoningHash Hash of the reasoning behind the signal
    /// @param attestationId The attestation ID for verification
    /// @param tokenURI_ The metadata URI for the NFT
    function mintExecutedSignal(
        address analyst,
        uint256 signalId,
        int256 pnl,
        bytes32 reasoningHash,
        bytes32 attestationId,
        string calldata tokenURI_
    ) external onlyRole(MINTER_ROLE) returns (uint256 tokenId) {
        tokenId = nextTokenId++;

        signalMeta[tokenId] = SignalMeta({
            signalId: signalId,
            analyst: analyst,
            pnl: pnl,
            reasoningHash: reasoningHash,
            attestationId: attestationId,
            mintedAt: block.timestamp
        });

        _safeMint(analyst, tokenId);
        _setTokenURI(tokenId, tokenURI_);

        emit SignalMinted(tokenId, signalId, analyst, pnl);
    }

    /// @notice Get signal metadata for a token
    function getSignalMeta(uint256 tokenId) external view returns (SignalMeta memory) {
        return signalMeta[tokenId];
    }

    // Required overrides
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
