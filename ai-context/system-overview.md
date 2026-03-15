# MetaBased System Overview

## 1. Muc tieu he thong
MetaBased la nen tang Web3 social ket hop:
- Mang xa hoi: dang bai, like, follow, nhan tin
- NFT: danh dau bai viet thanh NFT
- Marketplace: list, mua, ban NFT
- Xac thuc: wallet-first qua Dynamic Labs

## 2. Nguon reverse-engineering
Tai lieu nay duoc tong hop tu:
- Thiet ke: `docs/ARCHITECHTURE.md`, `docs/AUTH_FLOW.md`, `docs/SUPABASE_SETUP.md`
- Implementation: `src/app/api/**`, `src/lib/**`, `src/middleware.ts`, `database/postgresupabase.sql`, `contracts/*.sol`

## 3. Kien truc van hanh
Luong he thong muc tieu:
Client -> API Routes -> In-memory Cache -> Supabase PostgreSQL -> Smart Contracts (Base Sepolia)

Hien trang code:
- API backend da co cho auth/users/posts/follows/likes/messages/conversations/upload
- Cache layer chuan hoa theo in-memory strategy
- Upload dang ghi local `public/uploads/*` (`src/app/api/upload/**`), chua day vao Supabase Storage
- Smart contract ERC721/ERC1155 co ma nguon; marketplace contract dang trong

## 4. Feature da implement (backend)
- Wallet auth verification va profile completion gate
- Post CRUD (tao, list, detail, update, delete)
- Like/unlike post
- Follow/unfollow user
- Discover users + trending users
- Messaging: conversation, send/read message, message permission
- Upload media va avatar qua multipart/form-data

## 5. Feature hien la placeholder/chua dong bo day du
- NFT mint/list/buy API chua xuat hien trong `src/app/api`
- On-chain transaction sync vao bang `nfts`, `nft_listings`, `transactions` chua co service xu ly
- Notification API chua xuat hien, du lieu notifications hien co o muc schema

## 6. Nganh he thong cho AI agents
Khi phat trien tiep backend, uu tien:
1. Giu dung API va data contracts da ton tai
2. Khong doi schema cot loi
3. Hoan tat Supabase Storage/Blockchain integration theo tai lieu nay
4. Bao toan auth model Dynamic JWT + role checks
