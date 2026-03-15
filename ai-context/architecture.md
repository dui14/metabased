# Architecture (MVC)

## 1. Kieu kien truc
He thong van hanh theo MVC tren Next.js 14 App Router:
- View: React pages/components trong `src/app/**`, `src/components/**`
- Controller: route handlers trong `src/app/api/**/route.ts`
- Model: PostgreSQL schema (`database/postgresupabase.sql`) + service layer (`src/lib/supabase.ts`)

## 2. Layering thuc te
- Presentation layer
  - Pages: login/home/discover/profile/messages/admin
  - Providers: auth/chat/theme/dynamic
- Application layer
  - API routes xu ly validation, auth, orchestration
- Infrastructure layer
  - Supabase client, in-memory cache layer, JWT verifier, upload filesystem
- Domain layer
  - Thuc the: users, posts, likes, follows, conversations, messages, nfts/listings/transactions

## 3. Luong request chinh
1. Client goi API route
2. API route validate input + xac thuc
3. Route goi in-memory cache (cache hit tra ve ngay)
4. Cache miss thi route goi Supabase query/service
5. Mutation se invalidation cache key lien quan
6. JSON response tra ve cho UI

## 4. Routing va truy cap
- Middleware (`src/middleware.ts`) bo qua `api/*`, static assets
- Route cho user:
  - Public exact: `/login`, `/logout`, `/home`, `/discover`
  - Public view prefix: `/post/`, `/profile/`
- Route admin:
  - Bat buoc role `admin` tu JWT hoac cookie fallback `user_role`

## 5. He thong auth
- Dynamic Labs cap JWT
- Backend verify qua JWKS (`src/lib/jwt.ts`)
- API auth:
  - `POST /api/auth/verify`
  - `GET /api/auth/verify`
  - `POST /api/users/verify-auth` de resolve email-wallet conflict va profile completeness

## 6. Du lieu va state quan trong
- DB mode:
  - Supabase PostgreSQL la nguon du lieu chinh
- Cache mode:
  - In-memory key theo endpoint params + user scope khi can
- Realtime mode:
  - WebSocket server rieng (`src/server-ws.ts`) cho message push trong room conversation

## 7. Architectural constraints cho AI agents
- Khong chen logic SQL truc tiep vao component UI
- Route handler la noi duy nhat duoc mutate domain state
- Mọi operation mutating post/follow/like/message phai invalidation cache lien quan
- Auth va ownership check phai o server-side truoc khi write DB
