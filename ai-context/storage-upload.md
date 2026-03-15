# Storage and Upload Flow

## 1. Scope
Tai lieu nay mo ta flow upload backend va quy tac validate/security cho file upload.

## 2. Hien trang tu implementation
- API hien co:
  - `POST /api/upload` (post media)
  - `POST /api/upload/avatar` (avatar)
- Implementation dang luu local filesystem:
  - `public/uploads/posts`
  - `public/uploads/avatars`

## 3. Muc tieu production bat buoc
File phai duoc luu vao Supabase Storage buckets.

## 4. Supported format va gioi han
Yeu cau he thong:
- Dinh dang: image + zip
- Max size: 50MB

Validation rules de enforce tai API:
- Reject neu khong co `file` hoac `userId`
- Kiem tra MIME allowlist:
  - image/jpeg, image/png, image/webp, image/gif
  - application/zip, application/x-zip-compressed
- Kiem tra extension allowlist (`.jpg/.jpeg/.png/.webp/.gif/.zip`)
- Kiem tra `file.size <= 50 * 1024 * 1024`
- Sanitize filename, bo ky tu dac biet

## 5. Bucket structure de su dung
- Bucket `posts-media`:
  - `{user_id}/images/{yyyy}/{mm}/{timestamp}_{safe_name}`
  - `{user_id}/archives/{yyyy}/{mm}/{timestamp}_{safe_name}.zip`
- Bucket `avatars`:
  - `{user_id}/{timestamp}_{safe_name}`

## 6. Upload API flow (target)
1. Client gui multipart/form-data den API route
2. API verify auth token va ownership `userId`
3. Validate MIME, size, filename
4. Generate object path theo cau truc bucket
5. Upload binary len Supabase Storage
6. Luu metadata vao DB (neu la post media)
7. Tra ve signed/public URL theo policy

## 7. Security rules
- Khong trust MIME tu client; check ca signature byte neu can
- Khong cho overwrite object cua user khac
- Chinh sach bucket:
  - Read public co dieu kien cho post media public
  - Avatar read public neu profile public
  - Write chi cho owner/service role
- Quet malware cho file zip truoc khi cho phep su dung xuong du lieu cong khai
- Log audit: user_id, ip, object_key, size, mime, timestamp

## 8. Migration note
Vi code hien tai dang luu local, can bo sung lop storage adapter:
- `LocalStorageAdapter` (dev)
- `SupabaseStorageAdapter` (staging/prod)
Khong doi API contract ben ngoai.
