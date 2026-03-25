export interface ConversationPresence {
  is_online: boolean;
  last_seen_at: string | null;
}

export interface ConversationSummary {
  id: string;
  other_user_id: string;
  other_username: string;
  other_display_name: string;
  other_avatar_url: string;
  last_message_at: string;
  unread_count: number;
  is_online?: boolean;
  last_seen_at?: string | null;
}

export interface MessageSenderSummary {
  id?: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
}

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id?: string;
  content: string;
  created_at: string;
  message_type?: 'text' | 'image' | 'nft_share';
  is_read?: boolean;
  sender?: MessageSenderSummary;
}
