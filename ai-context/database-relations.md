# Database Relations and Usage

## 1. Scope
Tai lieu nay mo ta quan he giua cac bang va cach backend dang su dung schema hien co trong `database/postgresupabase.sql`.
Khong thay doi thiet ke DB.

## 2. Bang cot loi va quan he
- `users`
  - PK: `id`
  - Unique: `wallet_address`, `username`
  - Duoc tham chieu boi: `posts.user_id`, `comments.user_id`, `nfts.creator_id`, `nfts.owner_id`, `nft_listings.seller_id`, `transactions.seller_id`, `transactions.buyer_id`, `notifications.user_id`, `messages.sender_id`, `messages.receiver_id`, `follows.*`

- `posts`
  - PK: `id`
  - FK: `user_id -> users.id`
  - 1-n voi `comments`, `likes`, `reposts`
  - 0-1 thong tin NFT denormalized trong cot `is_nft`, `nft_*`

- `comments`
  - FK: `post_id -> posts.id`, `user_id -> users.id`, `parent_id -> comments.id`
  - Ho tro nested comment qua self-reference

- `nfts`
  - FK: `post_id -> posts.id (SET NULL)`, `creator_id -> users.id`, `owner_id -> users.id`
  - Unique `(contract_address, token_id)`

- `nft_listings`
  - FK: `nft_id -> nfts.id`, `seller_id -> users.id`, `highest_bidder_id -> users.id`
  - Trang thai listing: `active|sold|cancelled|expired`

- `transactions`
  - FK nullable den `nfts`, `nft_listings`, `users(seller,buyer)`
  - Luu on-chain metadata: `tx_hash`, `block_number`, `gas_used`, `status`

- `notifications`
  - FK: `user_id -> users.id`, `actor_id -> users.id`
  - Type: like/comment/follow/mention/nft_sold/nft_offer/system

- `conversations`
  - FK: `participant_1_id`, `participant_2_id -> users.id`
  - Unique cap doi nguoi dung, co rang buoc thu tu `participant_1_id < participant_2_id`

- `messages`
  - FK: `conversation_id -> conversations.id`, `sender_id/receiver_id -> users.id`

- `follows`
  - FK: `follower_id`, `following_id -> users.id`
  - Unique `(follower_id, following_id)`

- `likes`
  - FK: `user_id -> users.id`, `post_id -> posts.id`
  - Unique `(user_id, post_id)`

## 3. Trigger va count denormalization
Schema da co trigger:
- `trigger_update_follow_counts`: cap nhat `users.followers_count/following_count`
- `trigger_update_likes_count`: cap nhat `posts.likes_count`
- `trigger_update_comments_count`: cap nhat `posts.comments_count`
- `update_*_updated_at`: cap nhat `updated_at`

Luu y implementation route can tranh cap nhat count thu cong trung voi trigger de dam bao idempotent.

## 4. Bang duoc API su dung truc tiep hien tai
- Dang dung: users, posts, likes, follows, conversations, messages
- Hien moi co schema/chua co API route day du: comments, nfts, nft_listings, transactions, notifications, reposts

## 5. RLS
RLS da enable tren toan bo bang chinh.
Trong server route, he thong chu yeu dung service role (Supabase server client), vi vay authorization van phai enforce bo sung trong logic API.

## 6. Luu do usage theo feature
- Auth/profile: `users`
- Feed/post detail: `posts` join `users`
- Social graph: `follows`, `likes`
- Messaging: `conversations`, `messages`, `users.message_permission`
- NFT/marketplace (muc tieu): `nfts`, `nft_listings`, `transactions`
