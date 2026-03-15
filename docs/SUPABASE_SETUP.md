# SUPABASE_SETUP

Tai lieu nay dung cho flow Supabase-only cua MetaBased.

## 1. Tao project Supabase

1. Vao https://supabase.com va tao project moi.
2. Chon region gan deployment cua app.
3. Luu lai:
- Project URL
- Anon key
- Service role key

## 2. Import schema dung file

1. Vao SQL Editor trong Supabase.
2. Mo file [database/postgresupabase.sql](../database/postgresupabase.sql).
3. Copy toan bo SQL va chay 1 lan.
4. Kiem tra cac bang cot loi da co: users, posts, comments, follows, likes, reposts, conversations, messages, notifications, nfts, nft_listings, transactions.

## 3. Cau hinh bien moi truong

Tao file `src/.env.local`:

```env
USE_LOCAL_DB=false
NEXT_PUBLIC_USE_LOCAL_DB=false

NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY

NEXT_PUBLIC_DYNAMIC_ENV_ID=YOUR_DYNAMIC_ENV_ID
DYNAMIC_JWKS_URL=https://app.dynamic.xyz/api/v0/sdk/YOUR_DYNAMIC_ENV_ID/.well-known/jwks

NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:3001
NEXT_PUBLIC_CHAIN_ID=84532
NEXT_PUBLIC_RPC_URL=https://sepolia.base.org
```

## 4. Chay app local

```bash
cd src
npm install
npm run dev
```

## 5. Test nhanh API sau setup

```bash
curl http://localhost:3000/api/users/trending
curl http://localhost:3000/api/posts
```

Ky vong:
- HTTP 200
- Khong co stacktrace cache/backend trong terminal

## 6. Troubleshooting

### Dynamic login thanh cong nhung bi bat link wallet lai
- Xoa cookie `dynamic_authentication_token` cu va login lai.
- Dam bao dang dung code moi trong [src/providers/AuthProvider.tsx](../src/providers/AuthProvider.tsx) da han che auto prompt sai route.

### Supabase query loi
- Kiem tra lai `SUPABASE_SERVICE_ROLE_KEY`.
- Chac chan da chay schema trong [database/postgresupabase.sql](../database/postgresupabase.sql).
