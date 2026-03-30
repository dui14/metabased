-- METABASED - Messaging Feature Expansion Migration
-- Online/Offline status, Group Chat, Unread tracking
-- Safe to run multiple times (uses IF NOT EXISTS / IF NOT EXISTS patterns)

-- ============================================================
-- 1. ONLINE STATUS: Thêm cột is_online + last_seen_at vào users
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'is_online'
  ) THEN
    ALTER TABLE users ADD COLUMN is_online BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'last_seen_at'
  ) THEN
    ALTER TABLE users ADD COLUMN last_seen_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_online ON users(is_online) WHERE is_online = true;

-- ============================================================
-- 2. CHAT GROUPS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS chat_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  avatar_url TEXT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_groups_created_by ON chat_groups(created_by);

-- Trigger updated_at cho chat_groups
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_chat_groups_updated_at'
  ) THEN
    CREATE TRIGGER update_chat_groups_updated_at
      BEFORE UPDATE ON chat_groups
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ============================================================
-- 3. CHAT GROUP MEMBERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS chat_group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_group ON chat_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON chat_group_members(user_id);

-- ============================================================
-- 4. MỞ RỘNG CONVERSATIONS: type + group_id
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'type'
  ) THEN
    ALTER TABLE conversations ADD COLUMN type VARCHAR(20) DEFAULT 'direct'
      CHECK (type IN ('direct', 'group'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'group_id'
  ) THEN
    ALTER TABLE conversations ADD COLUMN group_id UUID REFERENCES chat_groups(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_conv_type ON conversations(type);
CREATE INDEX IF NOT EXISTS idx_conv_group ON conversations(group_id) WHERE group_id IS NOT NULL;

-- ============================================================
-- FIX CONSTRAINTS: Nới lỏng các CHECK constraint của conversations
-- để cho phép group conversations (participant_2_id có thể NULL)
-- ============================================================

-- 1. Cho phép participant_2_id = NULL với group conversations
DO $$
BEGIN
  ALTER TABLE conversations ALTER COLUMN participant_2_id DROP NOT NULL;
EXCEPTION
  WHEN others THEN NULL; -- Đã nullable rồi thì bỏ qua
END $$;

-- 2. Drop constraint yêu cầu hai participant khác nhau (không áp dụng được cho group)
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_different_users;

-- 3. Drop constraint yêu cầu participant_1 < participant_2 (không áp dụng cho group)
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_ordered_ids;

-- 4. Drop unique pair constraint (group conversation sẽ dùng group_id làm unique key)
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_unique_pair;

-- 5. Thêm lại constraint CHỈ áp dụng cho 'direct' type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'conversations_direct_different_users'
  ) THEN
    ALTER TABLE conversations ADD CONSTRAINT conversations_direct_different_users
      CHECK (type = 'group' OR participant_1_id != participant_2_id);
  END IF;
END $$;

-- 6. Unique constraint cho DM: cặp participant phải unique (chỉ direct)
--    Group conversations dùng group_id UNIQUE thay thế
CREATE UNIQUE INDEX IF NOT EXISTS idx_conv_direct_unique_pair
  ON conversations(participant_1_id, participant_2_id)
  WHERE COALESCE(type, 'direct') = 'direct' AND participant_2_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_conv_group_unique
  ON conversations(group_id)
  WHERE type = 'group' AND group_id IS NOT NULL;


-- ============================================================
-- 5. MỞ RỘNG MESSAGES: receiver_id nullable (cho group messages)
-- ============================================================
-- Với group messages, receiver_id sẽ NULL vì gửi cho cả nhóm
DO $$
BEGIN
  -- Thay đổi receiver_id thành nullable
  ALTER TABLE messages ALTER COLUMN receiver_id DROP NOT NULL;
EXCEPTION
  WHEN others THEN NULL; -- Nếu đã nullable rồi thì bỏ qua
END $$;

-- ============================================================
-- 6. MESSAGE READ STATUS (cho group messages)
-- ============================================================
CREATE TABLE IF NOT EXISTS message_read_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_msg_read_message ON message_read_status(message_id);
CREATE INDEX IF NOT EXISTS idx_msg_read_user ON message_read_status(user_id);

-- ============================================================
-- 7. RLS Policies cho bảng mới
-- ============================================================
-- NOTE: Trên LOCAL PostgreSQL (USE_LOCAL_DB=true), API routes dùng service-level
-- connection nên RLS không áp dụng qua API. Enable RLS nhưng dùng policy PERMISSIVE
-- để không block. Trên Supabase production, thay bằng policy dùng auth.uid() thật.

ALTER TABLE chat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_read_status ENABLE ROW LEVEL SECURITY;

-- Policy permissive cho local (không có auth schema)
-- Supabase production: thay USING (true) bằng điều kiện auth.uid() phù hợp
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Groups viewable by members') THEN
    CREATE POLICY "Groups viewable by members" ON chat_groups
      FOR SELECT USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Group members viewable by group members') THEN
    CREATE POLICY "Group members viewable by group members" ON chat_group_members
      FOR SELECT USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Message read status viewable by all') THEN
    CREATE POLICY "Message read status viewable by all" ON message_read_status
      FOR ALL USING (true);
  END IF;
END $$;

-- ---- HƯỚNG DẪN SUPABASE PRODUCTION ----
-- Nếu bạn dùng Supabase (không phải local), chạy thêm các policy sau:
-- (Xóa policy USING (true) ở trên trước, sau đó chạy:)
--
-- CREATE POLICY "Groups viewable by members" ON chat_groups
--   FOR SELECT USING (
--     id IN (SELECT group_id FROM chat_group_members WHERE user_id::text = auth.uid()::text)
--   );
--
-- CREATE POLICY "Group members viewable by group members" ON chat_group_members
--   FOR SELECT USING (
--     group_id IN (SELECT group_id FROM chat_group_members WHERE user_id::text = auth.uid()::text)
--   );
-- ---- KẾT THÚC HƯỚNG DẪN SUPABASE ----


-- ============================================================
-- 8. HELPER: Function đếm unread messages cho 1 user (cả DM + group)
-- ============================================================
CREATE OR REPLACE FUNCTION get_total_unread_message_count(target_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  dm_unread INTEGER;
  group_unread INTEGER;
BEGIN
  -- DM unread: messages where receiver=user and is_read=false
  SELECT COUNT(*)::int INTO dm_unread
  FROM messages m
  JOIN conversations c ON c.id = m.conversation_id
  WHERE c.type = 'direct'
    AND m.receiver_id = target_user_id
    AND m.is_read = false;

  -- Group unread: messages in group convs user is member of, not sent by user,
  -- and not in message_read_status
  SELECT COUNT(*)::int INTO group_unread
  FROM messages m
  JOIN conversations c ON c.id = m.conversation_id
  JOIN chat_group_members gm ON gm.group_id = c.group_id
  WHERE c.type = 'group'
    AND gm.user_id = target_user_id
    AND m.sender_id != target_user_id
    AND NOT EXISTS (
      SELECT 1 FROM message_read_status mrs
      WHERE mrs.message_id = m.id AND mrs.user_id = target_user_id
    );

  RETURN COALESCE(dm_unread, 0) + COALESCE(group_unread, 0);
END;
$$ LANGUAGE plpgsql;
