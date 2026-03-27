-- QUICK FIX: Chạy script này nếu bạn đã chạy messaging_expansion.sql trước đó
-- Mục đích: sửa constraint trên bảng conversations để support group conversations

-- 1. Cho phép participant_2_id = NULL (group conversations không cần participant_2)
ALTER TABLE conversations ALTER COLUMN participant_2_id DROP NOT NULL;

-- 2. Drop các constraint cũ không tương thích với group type
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_different_users;
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_ordered_ids;
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_unique_pair;

-- 3. Thêm constraint mới chỉ áp dụng cho type='direct'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'conversations_direct_different_users'
  ) THEN
    ALTER TABLE conversations ADD CONSTRAINT conversations_direct_different_users
      CHECK (type = 'group' OR participant_1_id != participant_2_id);
  END IF;
END $$;

-- 4. Unique index chỉ cho direct conversations
CREATE UNIQUE INDEX IF NOT EXISTS idx_conv_direct_unique_pair
  ON conversations(participant_1_id, participant_2_id)
  WHERE COALESCE(type, 'direct') = 'direct' AND participant_2_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_conv_group_unique
  ON conversations(group_id)
  WHERE type = 'group' AND group_id IS NOT NULL;

-- Xác nhận
SELECT 'Constraint fix applied successfully!' as status;
