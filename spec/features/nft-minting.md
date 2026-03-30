# Feature Spec: NFT Minting

## Overview
Tinh nang NFT minting hien co o muc UI concept va schema/contract, chua co API backend hoan chinh trong `src/app/api`.

## User Stories
- Toi co the mint bai viet cua toi thanh NFT ERC721/1155.
- Toi xem duoc trang thai mint va token id sau khi thanh cong.

## API Endpoints
Hien trang:
- Chua co endpoint mint on-chain chinh thuc

Muc tieu contract:
- `POST /api/nft/mint`
- `GET /api/nft/[nftId]`
- `GET /api/nft/by-post/[postId]`

## Data Flow
1. User chon post + loai token
2. Backend validate ownership va chain info
3. Goi contract mint, nhan tx hash
4. Xac nhan tx -> trich xuat tokenId
5. Ghi `nfts` va cap nhat cot NFT tren `posts`
6. Tao transaction record `type='mint'`

## Database Tables Used
- `posts`
- `nfts`
- `transactions`
- `notifications` (nft_minted)

## Cache Usage
- Invalidate post detail/feed sau khi cap nhat NFT status
- Optional key: `nft:detail:{id}`

## Blockchain Interaction
- Co, Base Sepolia
- Contracts: `NFT721`, `NFT1155`

## Edge Cases
- Tx fail/revert
- Mint het han theo post (`nft_mint_expires_at` + `mintDeadline`)
- Duplicate sync tu cung tx hash

## Security Considerations
- Verify chainId bat buoc
- Chi owner post moi duoc mint
- Ghi transaction status `pending/confirmed/failed`
