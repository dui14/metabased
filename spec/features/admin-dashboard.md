# Feature Spec: Admin Dashboard

## Overview
UI admin route da ton tai (`/admin`, `/admin/users`) va middleware co role gate, nhung backend admin APIs chi o muc planning.

## User Stories
- Admin xem tong quan user/post/NFT metrics.
- Admin quan ly user vi pham.
- Admin xoa post vi pham.

## API Endpoints
Hien trang:
- Chua thay `src/app/api/admin/*` routes

Muc tieu contract:
- `GET /api/admin/stats`
- `GET /api/admin/users`
- `PUT /api/admin/users/[id]/status`
- `DELETE /api/admin/posts/[id]`

## Data Flow
1. Middleware chan user khong phai admin
2. Admin API verify role tren server
3. Query aggregate stats va resources
4. Ghi audit logs cho action quan tri

## Database Tables Used
- `users`
- `posts`
- `nfts`
- `nft_listings`
- `transactions`
- `notifications` (system/admin notices)

## Cache Usage
- Co the cache dashboard aggregates 30-60s
- Invalidate sau admin mutation

## Blockchain Interaction
- Gian tiep qua thong ke NFT/listing/transactions

## Edge Cases
- Token valid nhung role khong admin
- Admin thao tac tren user khong ton tai
- So lieu aggregate bi stale do cache

## Security Considerations
- Bat buoc role check 2 lop: middleware + endpoint
- Ghi audit trail cho admin actions
- Han che truy cap endpoint admin bang rate limit/IP allowlist neu can
