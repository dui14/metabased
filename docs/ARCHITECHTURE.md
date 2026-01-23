# Kiến trúc hệ thống Metabased

## Tổng quan

Metabased là một nền tảng social NFT marketplace phi tập trung, cho phép người dùng chia sẻ bài đăng, mint NFT từ nội dung của họ và giao dịch trên marketplace. Hệ thống được xây dựng trên kiến trúc full-stack với Next.js, PostgreSQL và Base Sepolia blockchain.

## Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **UI Library**: React 18
- **Styling**: Tailwind CSS
- **Animation**: Framer Motion
- **State Management**: React Context API

### Backend
- **API**: Next.js API Routes (Route Handlers)
- **Authentication**: Dynamic Labs (JWT-based)
- **Database**: PostgreSQL
- **ORM/Client**: Supabase Client / pg (node-postgres)
- **File Storage**: Supabase Storage (hoặc local storage)

### Blockchain
- **Network**: Base Sepolia Testnet
- **Smart Contracts**: Solidity
  - NFT721.sol - Single NFT minting
  - NFT1155.sol - Multi-edition NFTs
  - Marketplace.sol - Buy/Sell NFTs
- **Web3 Library**: ethers.js v6

### Database
- **Primary**: PostgreSQL
- **Hosting Options**:
  - Supabase (cloud, production)
  - Docker PostgreSQL (local development)

### Deployment
- **Platform**: Vercel
- **CI/CD**: GitHub Actions (optional)

## Kiến trúc hệ thống

```
┌─────────────────────────────────────────────────────────────────┐
│                           CLIENT                                 │
│                     (Next.js Frontend)                           │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Pages      │  │  Components  │  │   Providers  │          │
│  │  (App Router)│  │  (UI/Logic)  │  │  (Context)   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                ┌───────────┴────────────┐
                │                        │
                ▼                        ▼
┌───────────────────────────┐  ┌──────────────────────────┐
│   API ROUTES              │  │   Dynamic Labs           │
│   (Next.js Backend)       │  │   (Authentication)       │
│                           │  │                          │
│  /api/auth/verify         │  │  - Wallet Connect        │
│  /api/users/*             │  │  - JWT Generation        │
│  /api/posts/*             │  │  - JWKS Verification     │
│  /api/nft/*               │  └──────────────────────────┘
│  /api/marketplace/*       │
│  /api/admin/*             │
└───────────┬───────────────┘
            │
    ┌───────┴────────┐
    │                │
    ▼                ▼
┌──────────────┐  ┌─────────────────────────┐
│  PostgreSQL  │  │  Base Sepolia Blockchain│
│  Database    │  │                         │
│              │  │  ┌──────────────────┐   │
│  - users     │  │  │  NFT Contract    │   │
│  - posts     │  │  │  (ERC721/1155)   │   │
│  - comments  │  │  └──────────────────┘   │
│  - nfts      │  │                         │
│  - messages  │  │  ┌──────────────────┐   │
│  - follows   │  │  │  Marketplace     │   │
│  - likes     │  │  │  Contract        │   │
│              │  │  └──────────────────┘   │
└──────────────┘  └─────────────────────────┘
```

## Flow hoạt động

### 1. Authentication Flow

```
User → Connect Wallet (Dynamic Labs)
     → Dynamic generates JWT
     → JWT stored in localStorage & cookie
     → Backend verifies JWT via JWKS
     → Check/Create user in PostgreSQL
     → Show Profile Setup Modal (if new user)
     → Redirect to Home/Admin
```

### 2. Post Creation & NFT Minting Flow

```
User creates post → Upload to Supabase Storage
                 → Save post metadata to PostgreSQL
                 → User clicks "Mint NFT"
                 → Smart contract interaction (ethers.js)
                 → Mint NFT on Base Sepolia
                 → Save NFT data to PostgreSQL
                 → Update post with NFT reference
```

### 3. Marketplace Flow

```
List NFT for Sale → Create listing in marketplace contract
                  → Save listing to PostgreSQL (nft_listings)
                  → Show on Marketplace page

Buy NFT → User clicks "Buy"
        → Execute marketplace contract
        → Transfer NFT ownership
        → Record transaction in PostgreSQL
        → Update listing status
```

### 4. Admin Management Flow

```
Admin Login → Verify admin role from database
           → Access /admin routes (protected by middleware)
           → View users/posts/reports
           → Perform actions (suspend, delete, approve)
           → Actions logged in database
```

## Database Schema

### Core Tables

#### users
```sql
id (uuid, PK)
wallet_address (text, unique)
email (text, nullable)
username (text, unique)
display_name (text)
avatar_url (text)
bio (text)
role (enum: 'user', 'admin')
status (enum: 'active', 'suspended', 'banned')
is_profile_complete (boolean)
created_at (timestamp)
updated_at (timestamp)
```

#### posts
```sql
id (uuid, PK)
user_id (uuid, FK -> users)
content (text)
image_url (text)
nft_id (uuid, FK -> nfts, nullable)
likes_count (integer)
comments_count (integer)
created_at (timestamp)
updated_at (timestamp)
```

#### nfts
```sql
id (uuid, PK)
post_id (uuid, FK -> posts)
owner_address (text)
token_id (bigint)
contract_address (text)
metadata_url (text)
token_standard (enum: 'ERC721', 'ERC1155')
created_at (timestamp)
```

#### nft_listings
```sql
id (uuid, PK)
nft_id (uuid, FK -> nfts)
seller_address (text)
price (numeric)
status (enum: 'active', 'sold', 'cancelled')
created_at (timestamp)
updated_at (timestamp)
```

Xem đầy đủ schema tại `database/postgrelocal.sql` hoặc `database/postgresupabase.sql`

## API Endpoints

### Authentication
- `POST /api/auth/verify` - Verify JWT token
- `GET /api/auth/verify` - Check authentication status

### Users
- `GET /api/users/profile?wallet=0x...` - Get user profile
- `POST /api/users/profile` - Create new user
- `PUT /api/users/profile` - Update user profile
- `GET /api/users/discover` - Discover users
- `GET /api/users/trending` - Trending users

### Posts
- `GET /api/posts` - Get posts feed
- `POST /api/posts` - Create new post
- `GET /api/posts/[postId]` - Get post detail
- `DELETE /api/posts/[postId]` - Delete post

### Follows
- `POST /api/follows` - Follow/Unfollow user
- `GET /api/follows?user_id=...` - Get follows

### Comments (TODO)
- `POST /api/comments` - Create comment
- `GET /api/comments?post_id=...` - Get comments

### Admin (TODO)
- `GET /api/admin/users` - List all users
- `PUT /api/admin/users/[id]` - Update user status
- `GET /api/admin/stats` - Dashboard statistics

## Security

### Authentication
- JWT-based authentication via Dynamic Labs
- JWKS verification for token validation
- Cookie-based session management
- Role-based access control (RBAC)

### Authorization
- Middleware protection for admin routes
- User ownership validation for CRUD operations
- Server-side verification for all mutations

### Database
- Row Level Security (RLS) - Supabase
- Prepared statements - SQL injection prevention
- Environment variable encryption

## Cấu trúc thư mục

```
src/
│
├── app/                         # Next.js App Router
│   ├── layout.tsx
│   ├── page.tsx                 # Home feed
│   ├── globals.css
│
│   ├── (auth)/                  # Group route auth
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── logout/
│   │       └── page.tsx
│
│   ├── (public)/                # Public routes
│   │   ├── post/
│   │   │   └── [postId]/
│   │   │       ├── page.tsx     # metabased.vercel.app/post/[postId]
│   │   │       └── loading.tsx
│   │   └── profile/
│   │       └── [address]/
│   │           └── page.tsx
│
│   ├── (user)/                  # Protected user routes
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── create/
│   │   │   └── page.tsx         # Create post + mint NFT
│   │   ├── marketplace/
│   │   │   └── page.tsx
│   │   └── messages/
│   │       └── page.tsx
│
│   ├── (admin)/                 # Admin only
│   │   ├── admin/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx         # Dashboard
│   │   │   ├── users/
│   │   │   │   └── page.tsx     # View / delete / suspend
│   │   │   ├── reports/
│   │   │   │   └── page.tsx
│   │   │   └── settings/
│   │   │       └── page.tsx
│
│   ├── api/                     # Backend API (Route Handlers)
│   │   ├── auth/
│   │   │   ├── verify/
│   │   │   │   └── route.ts     # Verify Dynamic JWT
│   │   │   └── role/
│   │   │       └── route.ts     # Admin/User role
│   │   │
│   │   ├── posts/
│   │   │   ├── route.ts         # POST, GET
│   │   │   └── [postId]/
│   │   │       └── route.ts     # GET, DELETE
│   │   │
│   │   ├── comments/
│   │   │   └── route.ts
│   │   │
│   │   ├── nft/
│   │   │   ├── mint/
│   │   │   │   └── route.ts
│   │   │   └── metadata/
│   │   │       └── route.ts
│   │   │
│   │   ├── marketplace/
│   │   │   ├── list/
│   │   │   │   └── route.ts
│   │   │   └── buy/
│   │   │       └── route.ts
│   │   │
│   │   └── admin/
│   │       ├── users/
│   │       │   └── route.ts     # suspend / delete
│   │       └── stats/
│   │           └── route.ts
│
├── components/                  # UI Components
│   ├── common/
│   │   ├── Button.tsx
│   │   ├── Modal.tsx
│   │   └── Avatar.tsx
│   │
│   ├── auth/
│   │   ├── DynamicLogin.tsx
│   │   └── AuthGuard.tsx
│   │
│   ├── post/
│   │   ├── PostCard.tsx
│   │   ├── PostDetail.tsx
│   │   └── PostActions.tsx
│   │
│   ├── nft/
│   │   ├── MintButton.tsx
│   │   └── NFTPreview.tsx
│   │
│   ├── marketplace/
│   │   ├── ListingCard.tsx
│   │   └── BuyModal.tsx
│   │
│   └── admin/
│       ├── UserTable.tsx
│       ├── UserActions.tsx
│       └── StatusBadge.tsx
│
├── lib/                         # Core logic
│   ├── dynamic/
│   │   ├── client.ts            # Dynamic SDK
│   │   └── jwt.ts               # Decode & verify JWT
│   │
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── storage.ts
│   │
│   ├── blockchain/
│   │   ├── baseSepolia.ts       # Provider & signer
│   │   ├── nft.ts               # Mint NFT
│   │   └── marketplace.ts
│   │
│   ├── permissions/
│   │   └── checkRole.ts
│   │
│   └── constants.ts
│
├── hooks/
│   ├── useAuth.ts
│   ├── useUser.ts
│   ├── usePosts.ts
│   └── useNFT.ts
│
├── types/
│   ├── user.ts
│   ├── post.ts
│   ├── nft.ts
│   └── api.ts
│
├── contracts/                   # Smart contracts
│ 
├── scripts/
│   ├── seed-admin.ts
│   └── sync-metadata.ts
│
├── middleware.ts                # Protect routes (admin/user)
│
├── public/
│   └── images/
│
├── .env
├── .env.local
├── .env.example
├── next.config.js
├── tsconfig.json
├── package.json
└── README.md
```