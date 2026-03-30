// Post types
export interface Post {
  id: string;
  user_id: string;
  image_url: string | null;
  caption: string | null;
  visibility: 'public' | 'private' | 'followers';
  likes_count: number;
  comments_count: number;
  reposts_count: number;
  is_repost?: boolean;
  reposted_at?: string | null;
  repost_user_id?: string | null;
  is_nft: boolean;
  nft_token_id?: string;
  nft_listing_id?: string;
  nft_contract_address?: string;
  nft_contract_type?: 'ERC721' | 'ERC1155';
  nft_mint_expires_at?: string | null;
  nft_price?: string;
  nft_status?: 'minted' | 'listed' | 'sold';
  created_at: string;
  updated_at: string;
  user?: {
    username: string;
    avatar_url?: string;
    display_name?: string;
  };
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: {
    username: string;
    avatar_url?: string;
    display_name?: string;
  };
}
