# API Debug Report - 2026-03-15

## Pham vi
- Feature: them comment cho post
- Fix: loi xoa post khi verify JWT that bai
- Kiem tra: route handlers va smoke test API

## Van de ban dau
Khi goi xoa post, server log:
- DELETE post request for: f5f1aab1-8f36-43e3-9168-0ee1c782f1dc
- Auth header present: true
- Token present: true
- Token from cookie: false
- Verifying JWT token, length: 2615
- JWT verification failed: signature verification failed
- User info from token: invalid

Phan tich:
- Client dang uu tien gui Authorization header voi token trong localStorage key dynamic_authentication_token.
- He thong auth hien tai luu token chuan o localStorage key auth_token va cookie dynamic_authentication_token.
- Neu header token loi/stale, route cu khong fallback hop le theo thu tu de lay cookie token.

## Thay doi da thuc hien

### 1) Shared auth helper
Them file:
- src/lib/api-auth.ts

Noi dung chinh:
- Chuan hoa token va bo qua gia tri null/undefined.
- Lay token tu Authorization Bearer va cookie dynamic_authentication_token.
- Thu verify tung token theo thu tu, neu token dau loi thi tiep tuc token sau.
- Map wallet tu JWT sang user trong DB va tra ve current user noi bo.

### 2) Fix route xoa post
Cap nhat file:
- src/app/api/posts/[postId]/route.ts

Noi dung chinh:
- DELETE route dung getAuthenticatedUser(request) thay cho verify truc tiep 1 token.
- Loai bo luong log debug token khong can thiet.
- Bo truy van map user theo wallet lap lai trong route, dung current user tu helper.

Ket qua:
- Khong con phu thuoc cung vao token tu Authorization header.
- Co kha nang fallback cookie khi header token bi sai.

### 3) Them API comments
Them file:
- src/app/api/comments/route.ts

Endpoints:
- GET /api/comments?post_id=...&limit=...&offset=...&parent_id=...
- POST /api/comments

Noi dung POST:
- Bat buoc auth server-side qua token (header hoac cookie).
- Khong trust identity tu client payload.
- Validate post_id va content.
- Insert comment vao comments.
- Invalidate cache lien quan post/feed.

### 4) Noi UI tao comment trong post detail
Cap nhat file:
- src/components/post/PostDetail.tsx
- src/app/(public)/post/[postId]/page.tsx

Noi dung chinh:
- Page detail fetch ca post va comments.
- Form comment goi POST /api/comments.
- UI cap nhat danh sach comments va comments_count sau khi tao thanh cong.

### 5) Cap nhat client xoa post
Cap nhat file:
- src/components/post/PostCard.tsx

Noi dung chinh:
- Uu tien lay token tu auth_token, fallback dynamic_authentication_token.
- Chi gui Authorization header khi token hop le.

### 6) UX feed
Cap nhat file:
- src/app/home/page.tsx

Noi dung chinh:
- Nut comment tren PostCard o feed dieu huong den trang chi tiet post.

## Ket qua kiem tra

### Build check
Lenh:
- npm run build (chay trong src)

Ket qua:
- Compile code va type checking cho thay doi moi: thanh cong.
- Co loi ton dong ngoai pham vi thay doi: PageNotFoundError cho /_document.

Ghi chu:
- Loi /_document la issue hien huu cua project, khong phat sinh tu thay doi feature/fix lan nay.

### Smoke test API tren dev server
Server chay tren port 3001.

Ket qua:
- GET /api/comments (thieu post_id): 400
- GET /api/comments?post_id=f5f1aab1-8f36-43e3-9168-0ee1c782f1dc&limit=5&offset=0: 200, body {"comments":[]}
- POST /api/comments (khong token): 401
- DELETE /api/posts/f5f1aab1-8f36-43e3-9168-0ee1c782f1dc (khong token): 401
- DELETE /api/posts/f5f1aab1-8f36-43e3-9168-0ee1c782f1dc (token sai): 401

Nhan xet:
- Route da phan hoi dung semantic status codes.
- Khong xuat hien crash route khi token sai.

## Danh sach file thay doi
- src/lib/api-auth.ts
- src/app/api/comments/route.ts
- src/app/api/posts/[postId]/route.ts
- src/components/post/PostCard.tsx
- src/components/post/PostDetail.tsx
- src/app/(public)/post/[postId]/page.tsx
- src/app/home/page.tsx

## Rui ro con lai
- Chua co integration test tu dong cho flow co token hop le (can token Dynamic that).
- JWT verify van log that bai khi token gia duoc gui vao, la hanh vi mong doi.
- Issue /_document can duoc fix rieng de build pass hoan toan.
