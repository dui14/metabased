# Marketplace Contract Design (Base Sepolia)

## Overview
Marketplace la trung tam giao dich NFT cho ERC721 va ERC1155. Contract quan ly listing, mua, thanh toan ETH, chia fee nen tang, va chuyen quyen so huu token.

Trong giai doan hien tai, file contract marketplace trong repo dang rong. Tai lieu nay la dac ta chuan de implement production.

## Contract Responsibilities
- Tao listing cho ERC721/ERC1155
- Ho tro 2 mo hinh custody: escrow va approval-only
- Xu ly mua bang ETH
- Chia tien cho seller va dev wallet theo fee rate
- Cap nhat so luong con lai (voi ERC1155)
- Huy listing va cap nhat trang thai
- Phat event day du cho indexer/backend

## State Variables
- listingCounter: bo dem listing id
- devWallet: vi nhan platform fee
- platformFeeBps: phi nen tang theo basis points
- maxFeeBps: gioi han fee de tranh cai dat nguy hiem
- listings[listingId]: cau truc listing
- activeListingByAsset[collection][tokenId][seller]: tra nhanh listing dang mo
- supportedCollections[address]: danh sach collection duoc phep
- paused: emergency stop

Listing struct de xac dinh:
- listingId
- seller
- collection
- tokenId
- tokenStandard (721 hoac 1155)
- unitPriceWei
- quantityListed
- quantityRemaining
- custodyMode (escrow hoac approval)
- status (active, sold_out, cancelled)
- createdAt

## Core Functions (description only)
- configureFee(devWallet, platformFeeBps)
  - Owner cai dat vi fee va ti le fee
- setSupportedCollection(collection, supported)
  - Owner cho phep/chan collection
- createListing(collection, tokenId, standard, quantity, price, custodyMode)
  - Validate collection duoc support
  - Validate owner/allowance
  - Neu escrow: transfer NFT vao marketplace
  - Neu approval: verify marketplace duoc approve
  - Tao listing active
- buy(listingId, quantity)
  - Validate listing active va du quantity
  - Tinh tong tien = unitPrice * quantity
  - Validate msg.value >= tong tien
  - Tinh platform fee = tong tien * platformFeeBps / 10000
  - Chuyen fee cho devWallet, phan con lai cho seller
  - Chuyen NFT cho buyer
  - Cap nhat quantityRemaining va status
  - Refund phan du ETH neu co
- cancelListing(listingId)
  - Chi seller hoac owner duoc huy
  - Neu escrow: tra NFT ve seller
  - Neu approval: chi doi trang thai
- emergencyPause/unpause()
  - Owner tam dung khoi mua ban khi co su co

## Events
- ListingCreated(listingId, seller, collection, tokenId, standard, quantity, price, custodyMode)
- ListingPurchased(listingId, buyer, quantity, totalPrice, feeAmount, sellerAmount)
- ListingCancelled(listingId, seller)
- ListingUpdated(listingId, newQuantity, newPrice)
- PlatformFeeUpdated(oldBps, newBps, oldWallet, newWallet)
- SupportedCollectionUpdated(collection, supported)
- MarketplacePaused(pausedBy)
- MarketplaceUnpaused(unpausedBy)

## Access Control
- Owner:
  - set fee, set devWallet, set supported collections, pause control
- Seller:
  - create/cancel listing cua chinh minh
- Buyer:
  - buy listing active voi ETH

Phan quyen ky vong:
- Ownable hoac AccessControl role ADMIN_ROLE

## Flow Diagrams (text-based)
### Listing Flow
1. Creator mint NFT (721 hoac 1155)
2. Backend hoac user wallet goi createListing
3. Contract validate owner + approval/escrow condition
4. Listing duoc tao voi status active
5. Event ListingCreated duoc phat
6. Backend index event vao bang nft_listings Supabase

### Buying Flow
1. Buyer chon listing va quantity
2. Frontend goi buy voi msg.value
3. Contract validate gia, so luong, trang thai
4. Contract tinh fee + seller amount
5. Contract chuyen ETH: fee -> devWallet, con lai -> seller
6. Contract transfer NFT cho buyer
7. Contract cap nhat listing remaining/status
8. Event ListingPurchased duoc phat, backend cap nhat transactions

### Fee Distribution Flow
1. total = unitPrice * quantity
2. fee = total * platformFeeBps / 10000
3. sellerNet = total - fee
4. transfer fee to devWallet
5. transfer sellerNet to seller

## Escrow vs Approval Model
Escrow model:
- Uu diem: dam bao thanh khoan listing, buy thanh cong cao
- Nhuoc diem: ton gas tao listing + kho token trong contract
- Phu hop: listing gia tri cao, can chac chan

Approval-only model:
- Uu diem: seller giu token den khi ban
- Nhuoc diem: buy co the fail neu seller revoke approval/chuyen token di
- Phu hop: UX linh hoat, giam lock asset

Khuyen nghi he thong:
- Mac dinh escrow cho ERC721 high-value
- Cho phep approval-only cho ERC1155 low-friction
- Frontend hien ro custody mode tren UI

## Edge Cases
- Seller tao listing trung cho cung asset:
  - Dung activeListingByAsset de chan duplicate active listing
- Seller mat ownership sau khi listing approval-only:
  - buy fail, listing bi invalidation va auto-cancel boi backend job
- Buyer gui thieu ETH:
  - revert
- Buyer gui du ETH:
  - refund phan du
- Concurrent buys cung 1 listing:
  - rely on on-chain quantityRemaining check; tx sau se revert neu het
- ETH transfer fail den seller/devWallet:
  - su dung pull payment hoac low-level call + require success

## Security Considerations
- Dung ReentrancyGuard cho buy/cancel co ETH transfer
- Check-Effects-Interactions: cap nhat state truoc external transfer
- Validate collection address la contract hop le
- Platform fee co gioi han maxFeeBps (vi du <= 1500 bps)
- Su dung pausability de phong su co
- Khong tin du lieu gia tu client; gia la du lieu on-chain trong listing
- Event must-have cho forensic va database sync
