# Deployment Workflow

## 1. Pre-deploy checklist
- Environment variables day du (Dynamic, Supabase, DB, RPC)
- Build va lint pass
- API contract khong bi breaking ma khong co versioning
- Da kiem tra migration order (neu co)

## 2. Deployment stages
1. Staging deploy
2. Smoke test endpoint critical:
- `/api/auth/verify`
- `/api/posts`
- `/api/users/profile`
- `/api/messages`
- `/api/upload`
3. Verify log khong co spike 5xx
4. Production deploy

## 3. Post-deploy validation
- Kiem tra auth flow end-to-end
- Kiem tra create post + feed cache
- Kiem tra chat send/read
- Kiem tra upload media

## 4. Rollback rules
- Rollback ngay neu auth/mutation route critical fail
- Neu su co cache, co the clear namespace key
- Neu su co blockchain sync, dong bo lai tu tx logs

## 5. Operational notes
- Uu tien canary release cho thay doi lon
- Theo doi p95 latency va error rate 30 phut dau
