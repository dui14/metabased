// Database types based on our schema
export interface DbUser {
  id: string;
  wallet_address: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: 'user' | 'admin';
  status: 'active' | 'suspended' | 'deleted';
  followers_count: number;
  following_count: number;
  is_profile_complete: boolean;
  email: string | null;
  is_online: boolean;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbPost {
  id: string;
  user_id: string;
  image_url: string | null;
  caption: string | null;
  likes_count: number;
  comments_count: number;
  reposts_count: number;
  is_nft: boolean;
  nft_token_id: string | null;
  nft_contract_address: string | null;
  nft_price: string | null;
  nft_status: 'minted' | 'listed' | 'sold' | null;
  visibility: 'public' | 'private' | 'followers';
  created_at: string;
  updated_at: string;
}

export interface DbComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  likes_count: number;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbNft {
  id: string;
  post_id: string | null;
  creator_id: string;
  owner_id: string;
  token_id: string;
  contract_address: string;
  contract_type: 'ERC721' | 'ERC1155';
  metadata_uri: string | null;
  image_url: string | null;
  name: string | null;
  description: string | null;
  attributes: Record<string, unknown> | null;
  royalty_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface DbNftListing {
  id: string;
  nft_id: string;
  seller_id: string;
  price: string;
  currency: string;
  listing_type: 'fixed' | 'auction';
  auction_end_time: string | null;
  highest_bid: string | null;
  highest_bidder_id: string | null;
  status: 'active' | 'sold' | 'cancelled' | 'expired';
  created_at: string;
  updated_at: string;
}

export interface DbTransaction {
  id: string;
  nft_id: string | null;
  listing_id: string | null;
  seller_id: string | null;
  buyer_id: string | null;
  transaction_type: 'mint' | 'list' | 'buy' | 'transfer' | 'cancel';
  price: string | null;
  currency: string;
  tx_hash: string | null;
  block_number: number | null;
  gas_used: string | null;
  status: 'pending' | 'confirmed' | 'failed';
  created_at: string;
}

export interface DbNotification {
  id: string;
  user_id: string;
  type: 'like' | 'comment' | 'follow' | 'repost' | 'message' | 'mention' | 'nft_sold' | 'nft_offer' | 'system';
  title: string | null;
  message: string | null;
  reference_id: string | null;
  reference_type: string | null;
  actor_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface DbMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string | null; // nullable cho group messages
  content: string;
  message_type: 'text' | 'image' | 'nft_share';
  attachment_url: string | null;
  is_read: boolean;
  created_at: string;
}

export interface DbChatGroup {
  id: string;
  name: string;
  avatar_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DbChatGroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
}

export interface DbConversation {
  id: string;
  participant_1_id: string;
  participant_2_id: string;
  type: 'direct' | 'group';
  group_id: string | null;
  last_message_id: string | null;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbMessageReadStatus {
  id: string;
  message_id: string;
  user_id: string;
  read_at: string;
}

