// User types
export interface User {
  id: string;
  wallet_address: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  role: 'user' | 'admin';
  status: 'active' | 'suspended' | 'deleted';
  followers_count: number;
  following_count: number;
  created_at: string;
  updated_at: string;
}
