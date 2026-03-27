# Contract Interaction Architecture (Frontend, Backend, Events)

## Overview
Tai lieu nay mo ta cach frontend, backend API routes, Supabase, va smart contracts phoi hop trong luong mint va marketplace tren Base Sepolia.

Architecture can tuan thu:
Client -> API Routes -> Redis Cache (hoac in-memory giai doan hien tai) -> Supabase -> Smart Contracts

## Contract Responsibilities (cross-contract)
- NFT721: mint duy nhat theo content key
- NFT1155: mint multi-supply va batch
- Marketplace: listing, buy, fee distribution, digital asset purchase right

## State Variables (cross-system mapping)
On-chain -> Off-chain map de dong bo:
- tokenId, collection, owner -> nfts table
- listingId, price, quantity, status -> nft_listings table
- txHash, status, buyer, seller, fee -> transactions table
- digital asset access right -> digital_purchases table

## Core Functions (description only)
Frontend-triggered API actions:
- POST /api/posts/:id/mint
  - Input: nftType, price, quantity, metadata
  - Backend: tao content key, submit mint tx, then create listing
- POST /api/marketplace/listings/:id/buy
  - Input: quantity
  - Backend/frontend wallet broadcast buy tx
- GET /api/digital-assets/:assetId/access
  - Backend check on-chain access + Supabase record, tra signed URL

Backend blockchain actions:
- call NFT721.mintUnique
- call NFT1155.mint hoac mintBatch
- call Marketplace.createListing
- call Marketplace.buy / buyDigitalAsset

## Events
Can index cac event sau vao Supabase:
- UniqueMinted
- TokenMinted1155
- BatchMinted1155
- ListingCreated
- ListingPurchased
- ListingCancelled
- DigitalListingCreated
- DigitalAssetPurchased

Event handling rule:
- Idempotency key = chainId + txHash + logIndex
- Confirm N blocks truoc khi dat status confirmed
- Neu reorg, rollback records va reprocess

## Access Control
Frontend:
- User phai connect wallet va sign message de auth session
Backend:
- Chi backend signer wallet co quyen mint neu dung whitelist model
- API mutate bat buoc JWT + ownership checks
Contracts:
- Owner/admin chi quan tri fee, whitelist, collection support

## Flow Diagrams (text-based)
### Mint + Auto List Flow
1. User click Mint NFT tren frontend
2. Frontend gui request den API voi postId, nftType, price, quantity
3. Backend validate post ownership va policy
4. Backend generate content key
5. Backend submit mint tx (721 hoac 1155)
6. Cho receipt + parse tokenId tu event
7. Backend submit createListing tx
8. Worker dong bo events vao Supabase
9. API tra ve mintTxHash, listingId, status

### Buy NFT Flow
1. User click Buy
2. Frontend hien tong tien + fee estimate
3. Buyer wallet submit tx buy
4. Contract transfer ETH + NFT
5. Event ListingPurchased duoc emit
6. Worker cap nhat ownership, listing remain, transaction ledger

### Digital Asset Purchase Flow
1. User click Buy .zip
2. Wallet submit buyDigitalAsset
3. Event DigitalAssetPurchased duoc emit
4. Backend mark buyer has access
5. User goi API lay signed URL
6. Backend verify hasAccess on-chain truoc khi cap URL

## Edge Cases
- User spam click mint tao nhieu request:
  - Backend dung idempotency key theo postId + nftType
- Mint success nhung listing fail:
  - Dat trang thai partial_success, retry listing by job queue
- Buy success on-chain nhung API timeout:
  - Event worker van cap nhat eventually consistent
- Frontend stale state do cache:
  - Invalidate cache key khi co event purchase/cancel

## Security Considerations
- Khong bao gio tin ownership tu client payload
- Validate chainId Base Sepolia truoc moi tx operation
- Private key backend signer luu trong secret manager, khong log
- Tien trinh event consumer chay voi least privilege DB role
- Download file digital chi qua API signed URL sau on-chain verification
- Monitoring canh bao khi tx fail rate, pending rate, reorg rollback tang bat thuong
