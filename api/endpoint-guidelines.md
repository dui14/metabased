# Endpoint Guidelines for AI Agents

## 1. Input validation bat buoc
- Validate body/query ngay dau route
- Reject som voi 400 neu thieu truong
- Validate allowlist cho enum fields
- Validate ownership va auth truoc mutate

## 2. Authentication/Authorization
- JWT Dynamic verify server-side qua `verifyAndGetUser`
- Khong tin role/identity tu client payload
- Admin-only route phai check role `admin`

## 3. DB access pattern
- Su dung Supabase server client cho moi DB operation
- Neu operation cap nhat nhieu bang, dung transaction
- Khong thay doi schema ma khong co migration planning

## 4. Cache pattern
- GET heavy endpoints: cache-or-fetch qua cache layer
- Mutating endpoints: invalidate key lien quan
- Tranh stale object detail sau update/delete

## 5. Error response pattern
- Dung message don gian, khong leak thong tin nhay cam
- Ma loi theo chuẩn:
  - 400 validate
  - 401 unauthorized
  - 403 forbidden
  - 404 not found
  - 409 conflict
  - 500 internal

## 6. Logging
- Khong log full token
- Log event-level: route, actor, entity_id, status
- Bat debug query qua env flag

## 7. Upload/Storage
- Enforce MIME + extension + size <= 50MB
- Sanitize ten file
- Khong cho path traversal
- Uu tien Supabase Storage trong production

## 8. Blockchain-aware endpoints (khi bo sung)
- Xac minh chainId va tx hash format
- Doi transaction confirm truoc khi final DB status
- Ghi transaction record cho moi event quan trong

## 9. Testing gate truoc merge
- Co test cho success + error + edge case
- Validate cache invalidation expectations
- Validate permission boundaries
