# Messaging Feature - Test & Debug Guide

## Tổng quan tính năng mới

1. **Online/Offline Status** – Green/gray dot hiện trạng thái user
2. **Group Chat** – Tạo nhóm, thêm/xóa thành viên, nhắn tin nhóm
3. **Unread Badge** – Số tin nhắn chưa đọc hiển thị ở sidebar

---

## API Routes

### Online Status

| Method | Endpoint | Params | Mô tả |
|--------|----------|--------|-------|
| `GET` | `/api/users/online-status?user_ids=id1,id2` | `user_ids` (comma-separated) | Lấy online status |
| `PUT` | `/api/users/online-status` | `{ user_id, is_online }` | Cập nhật online status |

### Messages

| Method | Endpoint | Params | Mô tả |
|--------|----------|--------|-------|
| `GET` | `/api/messages?conversation_id=xxx` | `conversation_id`, `limit`, `offset` | Lấy tin nhắn |
| `POST` | `/api/messages` | `{ conversation_id, sender_id, receiver_id, content }` | Gửi tin nhắn (`receiver_id` = null cho group) |
| `PATCH` | `/api/messages` | `{ conversation_id, user_id }` | Đánh dấu đã đọc |
| `GET` | `/api/messages/unread-count?user_id=xxx` | `user_id` | Tổng tin nhắn chưa đọc |

### Group Chat

| Method | Endpoint | Params | Mô tả |
|--------|----------|--------|-------|
| `POST` | `/api/groups` | `{ name, created_by, member_ids[] }` | Tạo group |
| `GET` | `/api/groups?user_id=xxx` | `user_id` | Lấy danh sách groups |
| `GET` | `/api/groups/[id]` | — | Chi tiết group + members |
| `PUT` | `/api/groups/[id]` | `{ user_id, name?, avatar_url? }` | Cập nhật group (admin) |
| `DELETE` | `/api/groups/[id]?user_id=xxx` | `user_id` | Xóa group (creator) |
| `POST` | `/api/groups/[id]/members` | `{ user_id, member_id }` | Thêm member (admin) |
| `DELETE` | `/api/groups/[id]/members?user_id=xxx&member_id=yyy` | — | Xóa/rời nhóm |

### Conversations

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/api/conversations?user_id=xxx` | Lấy DM conversations (filter `type=direct`) |
| `POST` | `/api/conversations` | Tạo DM conversation |

---

## Fake Data / QA Setup

### SQL: Tạo test users + set online status

```sql
-- 1. Insert test users (nếu chưa có)
INSERT INTO users (wallet_address, username, display_name, is_profile_complete, is_online)
VALUES
  ('0xtest_user_a_000000000000000000000001', 'testuser_a', 'Test User A', true, true),
  ('0xtest_user_b_000000000000000000000002', 'testuser_b', 'Test User B', true, false),
  ('0xtest_user_c_000000000000000000000003', 'testuser_c', 'Test User C', true, true)
ON CONFLICT (wallet_address) DO NOTHING;

-- 2. Set online status cho QA
UPDATE users SET is_online = true, last_seen_at = NULL
WHERE username = 'testuser_a';

UPDATE users SET is_online = false, last_seen_at = NOW() - INTERVAL '5 minutes'
WHERE username = 'testuser_b';
```

### curl: Test API nhanh

```bash
# Lấy online status
curl "http://localhost:3000/api/users/online-status?user_ids=<USER_A_ID>,<USER_B_ID>"

# Tạo group
curl -X POST http://localhost:3000/api/groups \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Group","created_by":"<USER_A_ID>","member_ids":["<USER_B_ID>","<USER_C_ID>"]}'

# Lấy unread count
curl "http://localhost:3000/api/messages/unread-count?user_id=<USER_A_ID>"
```

---

## Checklist Test Cases

### Online Status
- [ ] User A đăng nhập → hiện green dot trong conversation list
- [ ] User A đóng tab → green dot chuyển thành gray
- [ ] 2 tab cùng user → đóng 1 tab, green dot vẫn hiện (nếu tab còn lại WS connected)
- [ ] Chat header hiện "Online" / "Offline" text phù hợp
- [ ] Group member list hiện online dot chính xác

### Unread Badge (Sidebar)
- [ ] User B gửi tin → sidebar user A hiện badge số trên icon Messages
- [ ] User A mở conversation → badge giảm (mark as read)
- [ ] Badge hiện đúng cả ở collapsed sidebar (hình tròn nhỏ trên icon)
- [ ] Badge hiện đúng ở expanded sidebar (hình tròn bên phải label)
- [ ] Badge cập nhật khi chuyển tab/focus lại

### Tạo Group
- [ ] Click icon Users → modal hiện danh sách following users
- [ ] Chọn members + nhập tên → tạo thành công
- [ ] Group mới hiện trong tab "Groups"
- [ ] Không tạo được nếu tên trống hoặc 0 members

### Gửi/Nhận tin nhắn trong Group
- [ ] Member gửi tin → tất cả members khác nhận được (realtime)
- [ ] Tin nhắn hiện tên sender (khác với DM không hiện)
- [ ] Tin nhắn hỗ trợ message_type: text (cần test cả image/nft_share nếu UI hỗ trợ)

### Group quản lý
- [ ] Admin thêm member → member mới xuất hiện trong group info sidebar
- [ ] Admin xóa member → member biến mất khỏi group
- [ ] Member tự rời nhóm → group biến mất khỏi list của họ
- [ ] Creator không thể rời nhóm (phải xóa group)
- [ ] Creator xóa group → group biến mất cho tất cả
- [ ] Non-admin không thể thêm/xóa member (403)

### Conversations
- [ ] Tab "Direct" chỉ hiện DM conversations
- [ ] Tab "Groups" chỉ hiện group conversations
- [ ] Search filter hoạt động trên cả 2 tabs
- [ ] Unread count hiện đúng per conversation

---

## Chạy Dev Server

```bash
cd src

# 1. Chạy migration (nếu dùng local DB)
# Mở psql hoặc Supabase SQL Editor → paste nội dung database/messaging_expansion.sql

# 2. Start dev server
npm run dev

# 3. Nếu dùng local DB + WebSocket
# Terminal 1:
npx ts-node server-ws.ts
# Terminal 2:
npm run dev
```

Truy cập: `http://localhost:3000/messages`

---

## Files đã thay đổi/thêm mới

### Mới
| File | Mô tả |
|------|-------|
| `database/messaging_expansion.sql` | Migration: online status, group tables |
| `src/app/api/users/online-status/route.ts` | Online status API |
| `src/app/api/messages/unread-count/route.ts` | Unread count API |
| `src/app/api/groups/route.ts` | Group CRUD |
| `src/app/api/groups/[id]/route.ts` | Group detail/update/delete |
| `src/app/api/groups/[id]/members/route.ts` | Group member management |
| `src/lib/useMessageUnreadCount.ts` | Hook: polling unread messages |

### Sửa đổi
| File | Thay đổi |
|------|----------|
| `src/lib/database.types.ts` | Thêm `is_online`, `last_seen_at`, group types |
| `src/providers/ChatProvider.tsx` | Presence tracking, group support |
| `src/server-ws.ts` | Online broadcast, heartbeat |
| `src/components/layout/Sidebar.tsx` | Message unread badge |
| `src/app/(user)/messages/page.tsx` | Online dot, tabs, group UI |
| `src/app/api/conversations/route.ts` | Filter direct-only, add type field |
