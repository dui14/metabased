# Feature Spec: Notifications

## Overview
Bang notifications da co trong schema; UI notifications co hien thi mau, nhung API backend CRUD notifications chua xuat hien ro rang trong `src/app/api`.

## User Stories
- Toi nhan thong bao khi duoc like/follow/comment.
- Toi xem danh sach thong bao cua minh.
- Toi danh dau thong bao da doc.

## API Endpoints
Hien trang:
- Chua co route `src/app/api/notifications/*`

Muc tieu contract:
- `GET /api/notifications?user_id=...`
- `PATCH /api/notifications/[id]/read`
- `PATCH /api/notifications/read-all`

## Data Flow
1. Event domain (like/follow/comment/mint/sell) phat sinh notification
2. Insert row vao `notifications`
3. Client poll hoac websocket push
4. User mark read -> update `is_read`

## Database Tables Used
- `notifications`
- `users`
- reference den `posts`, `nfts`, `transactions` qua `reference_id/reference_type`

## Cache Usage
- Optional key: `notifications:user:{user_id}:unread`
- Invalidate khi tao notification hoac mark read

## Blockchain Interaction
- Gian tiep qua su kien `nft_sold`, `nft_offer`

## Edge Cases
- actor user bi xoa (`actor_id` nullable)
- reference object khong con ton tai
- thong bao duplicate tu cung event

## Security Considerations
- User chi doc/sua notification cua chinh minh
- Khong expose thong bao private cua user khac
