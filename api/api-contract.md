# API Contract (Reverse Engineered)

## 1. Convention chung
- Base path: `/api`
- Response JSON theo dang:
  - Success: object co du lieu domain (`user`, `post`, `messages`, ...)
  - Error: `{ error: string }` hoac bo sung flags nhu `valid`, `authenticated`
- Runtime: Node.js route handlers (`runtime = 'nodejs'`)

## 2. Auth
### POST /api/auth/verify
- Muc dich: verify Dynamic JWT tu header hoac body
- Input:
  - Header `Authorization: Bearer <token>` hoac body `{ token }`
- Output success: `{ valid: true, user: { id, email, walletAddress, sessionId, expiresAt } }`
- Errors: 400 (missing token), 401 (invalid/expired), 500

### GET /api/auth/verify
- Muc dich: check auth state tu cookie `dynamic_authentication_token`
- Output success: `{ authenticated: true, user: { id, email, walletAddress } }`
- Errors: 401, 500

## 3. Users
### POST /api/users/verify-auth
- Muc dich: verify email-wallet mapping, detect conflict/new user, profile completeness
- Input: `{ email?: string, wallet_address?: string }`
- Output: combinations cua `verified`, `is_new`, `needs_creation`, `needs_wallet`, `conflict`, `needs_profile_setup`, `missing_fields`
- Errors: 400, 409, 500

### GET /api/users/profile
- Query: `wallet` hoac `username`
- Output: `{ user, is_new, is_profile_complete }`

### POST /api/users/profile
- Input: `{ wallet_address?: string, email?: string }`
- Output: `{ user }` (201) hoac 409 neu ton tai/conflict

### PUT /api/users/profile
- Input: `{ wallet_address, username?, display_name?, bio?, avatar_url?, email? }`
- Output: `{ user }`
- Errors: 400, 404, 409, 500

### GET /api/users/check-username
- Query: `username`
- Output: `{ available: boolean }`
- Validation: regex `^[a-z0-9_]{3,30}$`

### GET /api/users/discover
- Query: `limit`, `offset`, `search`
- Output: `{ users: [] }`

### GET /api/users/trending
- Output: `{ users: [] }`

### GET /api/users/message-settings
- Auth: Bearer token
- Output: `{ message_permission }`

### PUT /api/users/message-settings
- Auth: Bearer token
- Input: `{ message_permission: 'everyone'|'following' }`
- Output: `{ message_permission, success: true }`

## 4. Posts
### GET /api/posts
- Query: `limit`, `offset`, `user_id`, `noCache`
- Output: `{ posts: [] }`
- Cache header: `s-maxage=30`

### POST /api/posts
- Auth: Bearer token hoac cookie `dynamic_authentication_token`
- Input: `{ image_url?, caption?, visibility? }`
- Rule: bat buoc co `image_url` hoac `caption`
- Output: `{ post }` (201)

### POST /api/posts/[postId]/mint
- Auth: Bearer token hoac cookie token
- Input: `{ contract_type: 'ERC721'|'ERC1155', contract_address, token_id, tx_hash?, nft_price? }`
- Rule: chi owner hoac admin duoc cap nhat mint metadata
- Output: `{ post, tx_hash, contract_type }`
- Errors: 400, 401, 403, 404, 409, 500

### GET /api/posts/[postId]
- Query: `noCache`
- Output: `{ post }`
- Errors: 404 neu khong tim thay

### PUT /api/posts/[postId]
- Input: `{ visibility?, caption? }`
- Visibility allowlist: `public|private|followers`
- Output: `{ post }`

### DELETE /api/posts/[postId]
- Auth: Bearer token hoac cookie token
- Rule: chi owner hoac admin duoc xoa
- Output: `{ success: true }`

## 5. Social
### POST /api/likes
- Input: `{ user_id, post_id, action?: 'unlike' }`
- Output: `{ success: true, action: 'liked'|'unliked'|'already_liked' }`

### GET /api/likes
- Query: `user_id`, `post_id`
- Output: `{ isLiked: boolean }`

### POST /api/reposts
- Input: `{ user_id, post_id, action?: 'repost'|'unrepost' }`
- Output: `{ success: true, action: 'reposted'|'unreposted'|'already_reposted', isReposted?: boolean, repostsCount?: number }`

### GET /api/reposts
- Query: `post_id`, `user_id?`
- Output: `{ repostsCount: number, isReposted?: boolean }`

### GET /api/comments
- Query: `post_id`, `limit?`, `offset?`, `noCache?`
- Output: `{ comments: [] }`

### POST /api/comments
- Input: `{ user_id, post_id, content }`
- Output: `{ comment }` (201)

### POST /api/follows
- Input: `{ follower_id, following_id, action?: 'unfollow' }`
- Output: `{ success: true, action: 'followed'|'unfollowed' }`
- Errors: 400 self-follow, 409 duplicate

### GET /api/follows
- Query: `follower_id`, `following_id`
- Output: `{ isFollowing: boolean }`

## 6. Messaging
### GET /api/conversations
- Query: `user_id`
- Output: `{ conversations: [] }`

### POST /api/conversations
- Input: `{ user_id, other_user_id }`
- Output: `{ conversation }`
- Rule: sort participant IDs de bao dam uniqueness

### GET /api/messages
- Query: `conversation_id`, `limit`, `offset`
- Output: `{ messages: [] }`

### POST /api/messages
- Input: `{ conversation_id, sender_id, receiver_id, content, message_type? }`
- Rule: ton trong `users.message_permission`
- Output: `{ message }`

### PATCH /api/messages
- Input: `{ conversation_id, user_id }`
- Output: `{ success: true }`

## 7. Upload
### POST /api/upload
- Multipart: `file`, `userId`
- Output: `{ url, filename, size, type }`

### POST /api/upload/avatar
- Multipart: `file`, `userId`
- Output: `{ url, filename, size, type }`

## 8. Chua thay endpoint backend cho
- notifications CRUD
- nft mint/list/buy metadata routes
- admin stats/users management APIs
