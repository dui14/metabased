# Bug Workflow

## 1. Tiep nhan bug
- Ghi nhan symptom, endpoint, input, expected/actual
- Gan muc do: blocker/high/medium/low

## 2. Reproduce
- Tao testcase toi thieu
- Xac dinh bug xay ra o API layer, in-memory cache layer, hay Supabase layer

## 3. Root cause analysis
- Kiem tra route handler -> service -> DB/cache
- Kiem tra auth/permission boundaries
- Kiem tra stale cache va race condition

## 4. Fix strategy
- Uu tien fix nho, khong mo rong scope
- Neu can thay doi contract, phai cap nhat docs/spec

## 5. Verification
- Re-test bug goc
- Re-test regression vung lien quan
- Kiem tra logs va metrics can thiet

## 6. Post-fix documentation
- Them note vao feature spec lien quan
- Neu bug lặp, bo sung test case bat buoc
