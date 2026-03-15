# Feature Spec: Comment System

## Overview
Schema va domain cho comments da ton tai, nhung API comments chua duoc implement trong `src/app/api` hien tai.

## User Stories
- Toi binh luan vao post.
- Toi co the reply comment.
- Toi xem danh sach comments theo post.

## API Endpoints
Hien trang:
- Chua co `src/app/api/comments/route.ts`

Muc tieu contract (de implement tiep):
- `GET /api/comments?post_id=...`
- `POST /api/comments`
- `DELETE /api/comments/[commentId]` (owner/admin)

## Data Flow
1. Verify actor
2. Validate `post_id` ton tai
3. Insert comment (ho tro `parent_id`)
4. Trigger cap nhat `posts.comments_count`
5. Invalidate post detail/feed cache

## Database Tables Used
- `comments`
- `posts`
- `users`

## Cache Usage
- Post detail cache can invalidation khi create/delete comment
- Optional key: `post:comments:{post_id}:{limit}:{offset}`

## Blockchain Interaction
- Khong

## Edge Cases
- parent_id khong ton tai
- Comment do sau qua lon
- Spam comment tan suat cao

## Security Considerations
- Ownership check khi xoa/sua
- Rate limit endpoint comment
- Filter payload de tranh abuse
