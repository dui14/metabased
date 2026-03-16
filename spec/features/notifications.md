# Feature Spec: Notifications

## Overview
Muc tieu feature nay la hoan thien he thong notifications cho 3 nhom su kien:
- Nguoi moi follow minh
- Nguoi khac tuong tac post cua minh (like, repost, comment)
- Nguoi khac nhan tin cho minh

Phien ban hien tai da co UI notifications va schema co ban. Phase nay chot huong backend-first, no-code design, toi uu hieu nang cho data lon va ho tro realtime tren local PostgreSQL (quan tri qua pgAdmin), sau do co the chuyen sang Supabase deployment.

## Scope
In scope:
- Notification types: `follow`, `like`, `repost`, `comment`, `message`
- API contract cho read list, unread count, mark read, mark all read
- Realtime architecture: PostgreSQL LISTEN/NOTIFY + WebSocket push + polling fallback
- Chien luoc query cho data lon tu moc 1M records
- Read/unread state va retention 90 ngay

Out of scope:
- Push notification mobile/email
- Notification preferences per type (mute by type)
- Full analytics dashboard cho notifications

## User Stories
- Toi nhan thong bao ngay khi co nguoi follow moi.
- Toi nhan thong bao khi post cua toi duoc like, repost, comment.
- Toi nhan thong bao khi co message moi gui den toi.
- Toi xem danh sach notifications theo thu tu moi nhat truoc.
- Toi biet thong bao nao da doc/chua doc.
- Toi co the mark tung thong bao da doc hoac mark all da doc.

## Event Matrix
1. Follow Created
- Trigger: POST follow thanh cong
- Receiver: user duoc follow
- Actor: user follow
- Type: `follow`
- Reference: `reference_type=user`, `reference_id=actor_user_id`

2. Post Liked
- Trigger: POST like thanh cong
- Receiver: owner cua post
- Actor: user like
- Type: `like`
- Reference: `reference_type=post`, `reference_id=post_id`

3. Post Reposted
- Trigger: POST repost thanh cong
- Receiver: owner cua post goc
- Actor: user repost
- Type: `repost`
- Reference: `reference_type=post`, `reference_id=post_id`

4. Comment Created
- Trigger: POST comment thanh cong
- Receiver: owner cua post
- Actor: user comment
- Type: `comment`
- Reference: `reference_type=post`, `reference_id=post_id`

5. Message Sent
- Trigger: POST message thanh cong
- Receiver: user nhan message
- Actor: user gui message
- Type: `message`
- Reference: `reference_type=conversation`, `reference_id=conversation_id`

Business rules:
- Khong tao self-notification (actor_id = receiver_id).
- Chong duplicate trong cua so 5 phut voi key logic:
	`(user_id, actor_id, type, reference_type, reference_id)`.
- Neu duplicate trong 5 phut, bo qua insert moi.

## API Endpoints
1. GET `/api/notifications`
- Query: `cursor`, `limit` (default 20, max 50)
- Tra ve danh sach notifications cua user dang login theo `created_at desc, id desc`
- Response gom `items`, `next_cursor`, `unread_count`

2. GET `/api/notifications/unread-count`
- Tra ve tong so notifications chua doc

3. PATCH `/api/notifications/[id]/read`
- Mark 1 notification da doc
- Idempotent: da doc truoc do van tra thanh cong

4. PATCH `/api/notifications/read-all`
- Mark toan bo notifications chua doc cua user thanh da doc
- Tra ve `updated_count`

Error semantics:
- 401 unauthorized
- 403 forbidden (notification khong thuoc user)
- 404 not found
- 500 internal error

## Data Model
Bang chinh: `notifications`

Fields can co:
- `id` UUID PK
- `user_id` receiver
- `actor_id` nullable
- `type`
- `title`, `message`
- `reference_type`, `reference_id`
- `is_read` boolean default false
- `read_at` nullable timestamp
- `created_at` timestamp

Mo rong type enum cho scope nay:
- `follow`, `like`, `repost`, `comment`, `message`

Neu enum hien tai chua co `repost` va `message`, can bo sung migration enum trong phase implementation.

## Query Strategy For Large Data
Moc toi uu: >= 1M records notifications.

1. Pagination strategy
- Mac dinh dung keyset pagination, khong dung offset sau trang sau.
- Cursor gom `created_at` + `id` de bao dam ordering on dinh.
- Offset chi cho trang dau hoac dataset nho trong admin tooling.

2. Index strategy
- Index feed: `(user_id, created_at desc, id desc)`
- Partial index unread: `(user_id, created_at desc)` voi dieu kien `is_read = false`
- Index cho dedupe lookup theo key logic actor/type/reference/time window

3. Retention va partition
- Retention 90 ngay cho bang nong.
- Khi vuot moc 1M va toc do tang cao: partition theo thang dua tren `created_at`.
- Job dọn du lieu cu theo partition/drop partition de tranh table phinh.

4. Unread count strategy
- Query unread count tren partial index.
- Cache unread count 30-60s cho user active.
- Invalidate cache khi insert notification moi, mark read 1 phan tu, hoac mark all read.

## Realtime Architecture
Muc tieu: nhan notification gan nhu ngay lap tuc ma khong poll lien tuc.

Flow realtime:
1. API tao notification thanh cong trong transaction.
2. Sau khi commit, backend publish PostgreSQL NOTIFY theo channel user:
	 `notification_user_{user_id}`.
3. WebSocket server LISTEN cac channel va map ket noi theo `user_id`.
4. Neu user online, push event `notification:new` kem payload toi gian.
5. Client nhan event, append item moi hoac trigger refetch nhe.
6. Neu socket disconnect, client fallback polling 15-30s.

Do tin cay:
- At-least-once delivery cho websocket event.
- Client phai idempotent theo `notification_id` de tranh render trung.

## Read/Unread State
State model:
- Unread: `is_read = false`, `read_at = null`
- Read: `is_read = true`, `read_at != null`

Transitions:
1. Create notification -> Unread
2. Mark single read -> Read
3. Mark all read -> tat ca Unread thanh Read

Rules:
- Chi owner (`user_id`) duoc thay doi read state.
- Mark read la idempotent.
- Khi mark read, cap nhat unread count cache va UI badge ngay.

## Security And Authorization
- User chi duoc query notifications cua chinh minh.
- Khong tin `user_id` truyen len tu client cho mutating API.
- Verify actor/receiver tren server theo auth token.
- Validate reference object ton tai truoc khi tao notification neu can.
- Rate limit endpoint tao event de giam spam.

## Performance And Operations (pgAdmin local)
Checklist van hanh local PostgreSQL:
1. Theo doi index usage va slow query trong pgAdmin dashboard.
2. Dung EXPLAIN ANALYZE cho query feed va unread count truoc khi release.
3. Kiem tra cardinality theo user active cao de xac nhan keyset pagination on dinh.
4. Theo doi lock/contention khi mark-all tren user co nhieu notifications.
5. Theo doi kich thuoc table/index theo tuan de quyet dinh thoi diem partition.

SLO goi y:
- GET notifications p95 < 120ms tren local benchmark representative
- GET unread-count p95 < 50ms
- Websocket push den client online < 2s

## Integration Points In Current Codebase
- Follow events: `src/app/api/follows/route.ts`
- Like events: `src/app/api/likes/route.ts`
- Repost events: `src/app/api/reposts/route.ts`
- Comment events: `src/app/api/comments/route.ts`
- Message events: `src/app/api/messages/route.ts`
- Realtime gateway: `src/server-ws.ts`
- Cache keys va invalidation: `src/lib/cache.ts`

## Rollout Plan
Phase 1:
- Implement notifications read APIs + unread count + cache invalidation

Phase 2:
- Add event producers o follow/like/repost/comment/message routes

Phase 3:
- Enable LISTEN/NOTIFY bridge vao websocket server

Phase 4:
- Benchmark tren local PostgreSQL bang pgAdmin, chot index tuning

Phase 5:
- Bat retention 90 ngay va migration partition neu qua nguong

## Acceptance Criteria
- Tao duoc notification cho follow, like, repost, comment, message.
- Client nhan realtime event khi online; fallback polling khi mat socket.
- Read/unread dung va on dinh khi concurrent requests.
- Query list/unread count dat muc hieu nang da dat.
- Khong lo thong tin notification giua cac user.
