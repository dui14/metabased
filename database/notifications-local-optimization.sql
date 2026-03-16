ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications
ADD CONSTRAINT notifications_type_check
CHECK (type IN ('like', 'comment', 'follow', 'repost', 'message', 'mention', 'nft_sold', 'nft_offer', 'system'));

CREATE INDEX IF NOT EXISTS idx_notif_feed_user_created_id
ON notifications (user_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_notif_unread_user_created
ON notifications (user_id, created_at DESC)
WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_notif_dedupe_window
ON notifications (user_id, actor_id, type, reference_type, reference_id, created_at DESC);