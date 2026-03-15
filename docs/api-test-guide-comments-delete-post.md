# Guide Test API - Comments va Delete Post

## Muc tieu
Huong dan test nhanh 2 nhom API:
- comments: GET danh sach, POST tao comment
- posts/[postId]: DELETE xoa post

## Dieu kien
- Chay app o thu muc src
- Co file .env.local hop le cho Dynamic va Supabase
- User da login de co cookie dynamic_authentication_token hoac localStorage auth_token

## 1) Start server
PowerShell:

```powershell
Set-Location src
npm run dev
```

Neu port 3000 bi chiem, Next.js se tu dong dung 3001.

## 2) Test comments GET

### 2.1 Thieu post_id
```powershell
Invoke-WebRequest -Uri 'http://localhost:3001/api/comments' -Method GET -UseBasicParsing
```
Ky vong:
- HTTP 400
- error = Post ID is required

### 2.2 Co post_id
```powershell
Invoke-WebRequest -Uri 'http://localhost:3001/api/comments?post_id=<POST_ID>&limit=20&offset=0' -Method GET -UseBasicParsing
```
Ky vong:
- HTTP 200
- body co comments la mang

## 3) Test comments POST

### 3.1 Khong token
```powershell
$body = @{ post_id='<POST_ID>'; content='hello' } | ConvertTo-Json
Invoke-WebRequest -Uri 'http://localhost:3001/api/comments' -Method POST -Body $body -ContentType 'application/json' -UseBasicParsing
```
Ky vong:
- HTTP 401
- error = Unauthorized - Invalid token

### 3.2 Co token hop le (Bearer)
```powershell
$token = '<DYNAMIC_JWT>'
$headers = @{ Authorization = "Bearer $token" }
$body = @{ post_id='<POST_ID>'; content='hello from api test' } | ConvertTo-Json
Invoke-WebRequest -Uri 'http://localhost:3001/api/comments' -Method POST -Headers $headers -Body $body -ContentType 'application/json' -UseBasicParsing
```
Ky vong:
- HTTP 201
- body co comment va success=true
- comments_count cua post tang (qua trigger DB)

## 4) Test delete post

### 4.1 Khong token
```powershell
Invoke-WebRequest -Uri 'http://localhost:3001/api/posts/<POST_ID>' -Method DELETE -UseBasicParsing
```
Ky vong:
- HTTP 401

### 4.2 Token sai
```powershell
$headers = @{ Authorization = 'Bearer invalid.token.value' }
Invoke-WebRequest -Uri 'http://localhost:3001/api/posts/<POST_ID>' -Method DELETE -Headers $headers -UseBasicParsing
```
Ky vong:
- HTTP 401
- Route khong crash

### 4.3 Token hop le nhung khong phai owner
Ky vong:
- HTTP 403

### 4.4 Token hop le va la owner/admin
Ky vong:
- HTTP 200
- { success: true }

## 5) Test UI flow
- Vao home feed, bam icon comment tren card -> dieu huong den trang chi tiet post
- O trang chi tiet post:
  - xem danh sach comments
  - nhap comment va bam Post
  - danh sach comments cap nhat ngay
  - comments count tren post duoc cap nhat

## 6) Debug checklist nhanh
- 401 khi dang login:
  - kiem tra cookie dynamic_authentication_token co ton tai
  - kiem tra localStorage auth_token
  - kiem tra NEXT_PUBLIC_DYNAMIC_ENV_ID va DYNAMIC_JWKS_URL
- 404 post khi comment:
  - kiem tra post_id ton tai trong bang posts
- 500 DB:
  - kiem tra NEXT_PUBLIC_SUPABASE_URL va SUPABASE_SERVICE_ROLE_KEY

## 7) Luu y
- API comments POST da enforce auth server-side, khong su dung user_id tu client de xac dinh identity.
- DELETE post da co co che thu token theo thu tu header -> cookie, giup giam loi token stale o header.
