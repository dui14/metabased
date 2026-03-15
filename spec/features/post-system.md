# Feature Spec: Post System

## Overview
Quan ly feed bai viet, tao/sua/xoa post, ho tro text-only/image-only, va danh dau post co NFT metadata.

## User Stories
- Toi xem duoc feed bai viet moi nhat.
- Toi tao post voi caption hoac image.
- Toi sua caption/visibility cho post cua toi.
- Toi xoa post cua toi; admin co the xoa post vi pham.

## API Endpoints
- `GET /api/posts`
- `POST /api/posts`
- `GET /api/posts/[postId]`
- `PUT /api/posts/[postId]`
- `DELETE /api/posts/[postId]`

## Data Flow
1. Client submit post payload
2. API validate required fields
3. Ghi post vao DB
4. Invalidate cache feed/user posts
5. Tra ve post join user info

## Database Tables Used
- `posts`
- `users`
- lien quan gián tiep: `likes`, `comments`, `reposts`

## Cache Usage
- Feed: key `feed:posts:{limit}:{offset}` (target)
- User posts: `feed:user_posts:{user_id}:{limit}:{offset}`
- Post detail: `post:detail:{post_id}`
- Invalidate khi create/update/delete post

## Blockchain Interaction
- Gian tiep: field `is_nft`, `nft_price`, `nft_status` tren post

## Edge Cases
- Post khong co caption va khong co image
- Visibility khong hop le
- Xoa post boi user khong phai owner/admin
- Post id khong ton tai

## Security Considerations
- Delete route bat buoc verify token
- Ownership check server-side
- Sanitize du lieu text neu hien thi o context HTML
