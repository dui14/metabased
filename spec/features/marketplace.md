# Feature Spec: Marketplace

## Overview
Marketplace domain da co schema (`nft_listings`, `transactions`) nhung API backend list/buy/cancel chua xuat hien trong `src/app/api`.

## User Stories
- Toi dang ban NFT cua toi voi gia ETH.
- Toi mua NFT dang listing.
- Toi xem danh sach listing dang hoat dong.

## API Endpoints
Hien trang:
- Chua co route `/api/marketplace/*`

Muc tieu contract:
- `GET /api/marketplace/listings`
- `POST /api/marketplace/list`
- `POST /api/marketplace/buy`
- `POST /api/marketplace/cancel`

## Data Flow
1. Seller tao listing on-chain
2. Backend ghi `nft_listings` status active
3. Buyer mua on-chain
4. Backend cap nhat listing sold + owner NFT + transaction
5. Invalidate marketplace cache

## Database Tables Used
- `nfts`
- `nft_listings`
- `transactions`
- `users`

## Cache Usage
- Marketplace listing cache:
  - `market:listings:{limit}:{offset}:{filters_hash}`
- Invalidate khi list/buy/cancel

## Blockchain Interaction
- Co, Base Sepolia marketplace contract
- Hien trang: `contracts/marketplace.sol` dang rong

## Edge Cases
- Seller khong phai owner NFT
- Listing da sold/cancelled
- Gia khong hop le
- On-chain success nhung DB sync fail

## Security Considerations
- Verify ownership truoc list
- Verify payment value khi buy
- Idempotency theo tx hash
