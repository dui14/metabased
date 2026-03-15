# Feature Spec: Messaging

## Overview
He thong nhan tin 1-1 da duoc implement backend voi conversations, messages, read-state va message permission.

## User Stories
- Toi tao hoac mo conversation voi user khac.
- Toi gui tin nhan text.
- Toi doc lich su tin nhan theo conversation.
- Toi danh dau da doc tin nhan.
- Toi gioi han ai duoc nhan tin cho toi.

## API Endpoints
- `GET /api/conversations?user_id=...`
- `POST /api/conversations`
- `GET /api/messages?conversation_id=...&limit=&offset=`
- `POST /api/messages`
- `PATCH /api/messages`
- `GET|PUT /api/users/message-settings`

## Data Flow
1. Tao conversation (participant IDs duoc sort)
2. Gui message vao `messages`
3. Cap nhat `conversations.last_message_id/last_message_at`
4. GET messages tra ve theo thu tu tang dan thoi gian
5. PATCH mark-read set `is_read=true`

## Database Tables Used
- `conversations`
- `messages`
- `users`
- `follows` (check message_permission=following)

## Cache Usage
- Hien tai chua cache message endpoints
- Co the bo sung short cache cho conversation list

## Blockchain Interaction
- Khong

## Edge Cases
- Tao conversation voi chinh minh
- Duplicate conversation race condition
- Receiver khong cho phep message tu sender
- conversation_id khong ton tai

## Security Considerations
- Validate sender/receiver relation server-side
- Reject unauthorized token cho message settings
- Rate limit send message de tranh spam
