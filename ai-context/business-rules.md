# Business Rules

## 1. Authentication va profile completion
- Login wallet qua Dynamic JWT
- User duoc xem la profile complete khi co du:
  - wallet_address
  - email
  - username
  - display_name
- Neu thieu bat ky truong nao, khong vao full user flow

## 2. User identity conflict rules
- Neu email thuoc user A, wallet thuoc user B -> conflict (409)
- Neu email ton tai nhung wallet rong -> cho phep link wallet
- Neu wallet ton tai nhung email rong -> cho phep cap nhat email

## 3. Post rules
- Tao post bat buoc co it nhat 1 trong 2 truong: `caption` hoac `image_url`
- Visibility hop le: `public | private | followers`
- Xoa post: chi owner hoac admin

## 4. Social interaction rules
- Like:
  - Moi cap user-post chi duoc 1 like
  - Unlike idempotent
- Follow:
  - Khong duoc follow chinh minh
  - Moi cap follower-following la duy nhat

## 5. Messaging rules
- Conversation gom 2 participant va cap doi duy nhat
- Message permission:
  - `everyone`: cho phep nhan tu tat ca
  - `following`: chi nhan tu user ma receiver dang follow
- Mark read theo `conversation_id + receiver_id`

## 6. NFT va marketplace rules (domain)
- Post co the danh dau NFT (`is_nft=true`)
- Listing chi hop le voi NFT owner
- Mua ban phai co transaction record va tx hash khi on-chain

## 7. Upload rules
- Chi cho phep image + zip
- Gioi han 50MB/file
- File path phai sanitize, khong cho path traversal

## 8. Authorization rules
- Admin route bat buoc role `admin`
- Mutation quan trong (delete post, message settings) bat buoc verify JWT server-side
- Khong dua vao client-side role check

## 9. Data consistency rules
- Bat buoc invalidate cache sau moi mutation lien quan feed/profile/listing
- Moi route write phai atomic trong pham vi transaction neu cap nhat nhieu bang

## 10. Error contract rules
- Loi validate -> HTTP 400
- Unauthorized -> 401
- Forbidden -> 403
- Not found -> 404
- Conflict -> 409
- Loi he thong -> 500
