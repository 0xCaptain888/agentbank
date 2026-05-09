// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title SignalAuctionHouse
/// @notice M26 Dutch auction for signal NFTs, paid in ABNK token
contract SignalAuctionHouse is ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Listing {
        address seller;
        address nft;
        uint256 tokenId;
        uint256 startPrice;
        uint256 endPrice;
        uint256 startTime;
        uint256 endTime;
        bool sold;
    }

    IERC20 public immutable abnkToken;

    uint256 public nextListingId;
    mapping(uint256 => Listing) public listings;

    event Listed(uint256 indexed listingId, address indexed seller, address nft, uint256 tokenId, uint256 startPrice, uint256 endPrice);
    event Sold(uint256 indexed listingId, address indexed buyer, uint256 price);
    event Cancelled(uint256 indexed listingId);

    error AuctionNotActive();
    error AuctionAlreadySold();
    error NotSeller();
    error InvalidParams();

    constructor(address _abnkToken) {
        abnkToken = IERC20(_abnkToken);
    }

    /// @notice List an NFT for Dutch auction
    /// @param nft The NFT contract address
    /// @param tokenId The token ID to list
    /// @param startPrice The starting (highest) price
    /// @param endPrice The ending (lowest) price
    /// @param duration The auction duration in seconds
    function list(
        address nft,
        uint256 tokenId,
        uint256 startPrice,
        uint256 endPrice,
        uint256 duration
    ) external returns (uint256 listingId) {
        if (startPrice <= endPrice || duration == 0) revert InvalidParams();

        listingId = nextListingId++;
        listings[listingId] = Listing({
            seller: msg.sender,
            nft: nft,
            tokenId: tokenId,
            startPrice: startPrice,
            endPrice: endPrice,
            startTime: block.timestamp,
            endTime: block.timestamp + duration,
            sold: false
        });

        IERC721(nft).transferFrom(msg.sender, address(this), tokenId);
        emit Listed(listingId, msg.sender, nft, tokenId, startPrice, endPrice);
    }

    /// @notice Get the current price of a listing (linear decay)
    /// @param listingId The listing to query
    function currentPrice(uint256 listingId) public view returns (uint256) {
        Listing storage listing = listings[listingId];
        if (block.timestamp >= listing.endTime) {
            return listing.endPrice;
        }
        uint256 elapsed = block.timestamp - listing.startTime;
        uint256 duration = listing.endTime - listing.startTime;
        uint256 priceDrop = ((listing.startPrice - listing.endPrice) * elapsed) / duration;
        return listing.startPrice - priceDrop;
    }

    /// @notice Buy a listed NFT at the current Dutch auction price, paid in ABNK
    /// @param listingId The listing to buy
    function buy(uint256 listingId) external nonReentrant {
        Listing storage listing = listings[listingId];
        if (listing.sold) revert AuctionAlreadySold();
        if (block.timestamp > listing.endTime) revert AuctionNotActive();

        uint256 price = currentPrice(listingId);
        listing.sold = true;

        abnkToken.safeTransferFrom(msg.sender, listing.seller, price);
        IERC721(listing.nft).transferFrom(address(this), msg.sender, listing.tokenId);

        emit Sold(listingId, msg.sender, price);
    }

    /// @notice Cancel a listing (only seller, only if not sold)
    /// @param listingId The listing to cancel
    function cancel(uint256 listingId) external {
        Listing storage listing = listings[listingId];
        if (listing.seller != msg.sender) revert NotSeller();
        if (listing.sold) revert AuctionAlreadySold();

        listing.sold = true; // prevent re-entry
        IERC721(listing.nft).transferFrom(address(this), msg.sender, listing.tokenId);
        emit Cancelled(listingId);
    }
}
