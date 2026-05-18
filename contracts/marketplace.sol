// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract Marketplace is Ownable, ERC721Holder, ERC1155Holder, ReentrancyGuard {
	address payable public constant DEV_WALLET = payable(0x7aDD236f981D2Dbc7261C226DeBe8914c96b8CdE);

	enum ListingStatus {
		Active,
		SoldOut,
		Cancelled,
		Expired
	}

	struct Listing {
		uint256 id;
		address seller;
		address nftContract;
		uint256 tokenId;
		uint256 quantity;
		uint256 remainingQuantity;
		uint256 pricePerItem;
		bool isErc1155;
		bool isActive;
		uint256 expiresAt;
		ListingStatus status;
	}

	uint256 public listingCounter;
	uint96 public platformFeeBps;

	mapping(uint256 => Listing) public listings;

	event ListingCreated(
		uint256 indexed listingId,
		address indexed seller,
		address indexed nftContract,
		uint256 tokenId,
		uint256 quantity,
		uint256 pricePerItem,
		bool isErc1155
	);
	event ListingCancelled(uint256 indexed listingId, address indexed seller);
	event ListingExpired(uint256 indexed listingId, address indexed seller);
	event ListingPurchased(
		uint256 indexed listingId,
		address indexed buyer,
		uint256 quantity,
		uint256 totalPrice,
		uint256 feePaid
	);
	event PlatformFeeUpdated(uint96 oldFeeBps, uint96 newFeeBps);

	error ListingNotFound();
	error ListingInactive();
	error ListingHasExpired();
	error ListingNotExpired();
	error InvalidPrice();
	error InvalidQuantity();
	error NotSeller();
	error InvalidPayment();
	error TransferFailed();
	error FeeTooHigh();
	error InvalidExpiry();

	constructor(uint96 initialPlatformFeeBps) Ownable(msg.sender) {
		if (initialPlatformFeeBps > 1000) {
			revert FeeTooHigh();
		}
		platformFeeBps = initialPlatformFeeBps;
	}

	function setPlatformFeeBps(uint96 newFeeBps) external onlyOwner {
		if (newFeeBps > 1000) {
			revert FeeTooHigh();
		}
		uint96 oldFeeBps = platformFeeBps;
		platformFeeBps = newFeeBps;
		emit PlatformFeeUpdated(oldFeeBps, newFeeBps);
	}

	function createListing(
		address nftContract,
		uint256 tokenId,
		uint256 quantity,
		uint256 pricePerItem,
		bool isErc1155,
		uint256 expiresAt
	) external returns (uint256 listingId) {
		if (pricePerItem == 0) {
			revert InvalidPrice();
		}

		if (expiresAt != 0 && expiresAt <= block.timestamp) {
			revert InvalidExpiry();
		}

		if (isErc1155) {
			if (quantity == 0) {
				revert InvalidQuantity();
			}
			IERC1155(nftContract).safeTransferFrom(msg.sender, address(this), tokenId, quantity, "");
		} else {
			if (quantity != 1) {
				revert InvalidQuantity();
			}
			IERC721(nftContract).safeTransferFrom(msg.sender, address(this), tokenId);
		}

		listingId = ++listingCounter;
		listings[listingId] = Listing({
			id: listingId,
			seller: msg.sender,
			nftContract: nftContract,
			tokenId: tokenId,
			quantity: quantity,
			remainingQuantity: quantity,
			pricePerItem: pricePerItem,
			isErc1155: isErc1155,
			isActive: true,
			expiresAt: expiresAt,
			status: ListingStatus.Active
		});

		emit ListingCreated(listingId, msg.sender, nftContract, tokenId, quantity, pricePerItem, isErc1155);
	}

	function expireListing(uint256 listingId) external {
		Listing storage listing = listings[listingId];
		if (listing.id == 0) {
			revert ListingNotFound();
		}
		if (!listing.isActive) {
			revert ListingInactive();
		}
		if (listing.expiresAt == 0 || listing.expiresAt > block.timestamp) {
			revert ListingNotExpired();
		}

		_closeListingWithReturn(listing, ListingStatus.Expired);
		emit ListingExpired(listingId, listing.seller);
	}

	function cancelListing(uint256 listingId) external {
		Listing storage listing = listings[listingId];
		if (listing.id == 0) {
			revert ListingNotFound();
		}
		if (!listing.isActive) {
			revert ListingInactive();
		}
		if (listing.seller != msg.sender && owner() != msg.sender) {
			revert NotSeller();
		}

		if (listing.expiresAt != 0 && listing.expiresAt <= block.timestamp) {
			_closeListingWithReturn(listing, ListingStatus.Expired);
			emit ListingExpired(listingId, listing.seller);
			return;
		}

		_closeListingWithReturn(listing, ListingStatus.Cancelled);

		emit ListingCancelled(listingId, msg.sender);
	}

	function buyListing(uint256 listingId, uint256 quantity) external payable nonReentrant {
		Listing storage listing = listings[listingId];
		if (listing.id == 0) {
			revert ListingNotFound();
		}
		if (!listing.isActive) {
			revert ListingInactive();
		}
		if (listing.expiresAt != 0 && listing.expiresAt <= block.timestamp) {
			revert ListingHasExpired();
		}

		uint256 buyQuantity = quantity;
		if (listing.isErc1155) {
			if (buyQuantity == 0 || buyQuantity > listing.remainingQuantity) {
				revert InvalidQuantity();
			}
		} else {
			if (buyQuantity != 1 || listing.remainingQuantity != 1) {
				revert InvalidQuantity();
			}
		}

		uint256 totalPrice = listing.pricePerItem * buyQuantity;
		if (msg.value != totalPrice) {
			revert InvalidPayment();
		}

		uint256 feeAmount = (totalPrice * platformFeeBps) / 10_000;
		uint256 sellerAmount = totalPrice - feeAmount;

		listing.remainingQuantity -= buyQuantity;
		if (listing.remainingQuantity == 0) {
			listing.isActive = false;
			listing.status = ListingStatus.SoldOut;
		}

		(bool sent, ) = payable(listing.seller).call{value: sellerAmount}("");
		if (!sent) {
			revert TransferFailed();
		}

		if (feeAmount > 0) {
			(bool feeSent, ) = DEV_WALLET.call{value: feeAmount}("");
			if (!feeSent) {
				revert TransferFailed();
			}
		}

		if (listing.isErc1155) {
			IERC1155(listing.nftContract).safeTransferFrom(address(this), msg.sender, listing.tokenId, buyQuantity, "");
		} else {
			IERC721(listing.nftContract).safeTransferFrom(address(this), msg.sender, listing.tokenId);
		}

		emit ListingPurchased(listingId, msg.sender, buyQuantity, totalPrice, feeAmount);
	}

	function _closeListingWithReturn(Listing storage listing, ListingStatus nextStatus) private {
		listing.isActive = false;
		listing.status = nextStatus;
		uint256 remaining = listing.remainingQuantity;
		listing.remainingQuantity = 0;
		if (remaining == 0) {
			return;
		}
		if (listing.isErc1155) {
			IERC1155(listing.nftContract).safeTransferFrom(address(this), listing.seller, listing.tokenId, remaining, "");
		} else {
			IERC721(listing.nftContract).safeTransferFrom(address(this), listing.seller, listing.tokenId);
		}
	}
}
