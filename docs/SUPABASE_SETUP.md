# Hướng dẫn thiết lập PostgreSQL trên Supabase cho Metabased

## Mục lục
1. [Tạo tài khoản Supabase](#1-tạo-tài-khoản-supabase)
2. [Tạo Project mới](#2-tạo-project-mới)
3. [Cấu hình Database](#3-cấu-hình-database)
4. [Lấy API Keys](#4-lấy-api-keys)
5. [Cấu hình Environment Variables](#5-cấu-hình-environment-variables)
6. [Chạy SQL Schema](#6-chạy-sql-schema)
7. [Kiểm tra kết nối](#7-kiểm-tra-kết-nối)

---

## 1. Tạo tài khoản Supabase

1. Truy cập [https://supabase.com](https://supabase.com)
2. Click **"Start your project"** hoặc **"Sign Up"**
3. Đăng nhập bằng:
   - GitHub (khuyến nghị)
   - Email/Password

---

## 2. Tạo Project mới

1. Sau khi đăng nhập, click **"New Project"**
2. Điền thông tin:
   - **Name**: `metabased` (hoặc tên bạn muốn)
   - **Database Password**: Tạo mật khẩu mạnh (lưu lại để dùng sau)
   - **Region**: Chọn region gần bạn nhất (ví dụ: `Southeast Asia (Singapore)`)
3. Click **"Create new project"**
4. Đợi khoảng 2 phút để project được khởi tạo

---

## 3. Cấu hình Database

### 3.1. Truy cập SQL Editor

1. Trong Dashboard, click **"SQL Editor"** ở sidebar bên trái
2. Click **"New Query"**

### 3.2. Chạy Schema

1. Mở file `database/postgre.sql` trong project
2. Copy toàn bộ nội dung
3. Paste vào SQL Editor
4. Click **"Run"** hoặc nhấn `Cmd/Ctrl + Enter`

### 3.3. Kiểm tra các bảng đã tạo

Sau khi chạy thành công, bạn sẽ có các bảng sau:
- `users` - Thông tin người dùng
- `posts` - Bài đăng
- `comments` - Bình luận
- `nfts` - NFT metadata
- `nft_listings` - NFT đang bán
- `transactions` - Lịch sử giao dịch
- `notifications` - Thông báo
- `messages` - Tin nhắn
- `follows` - Quan hệ follow
- `likes` - Likes

Kiểm tra trong **Table Editor** để xác nhận tất cả bảng đã được tạo.

---

## 4. Lấy API Keys

1. Vào **Project Settings** (icon bánh răng ở sidebar)
2. Click **"API"** trong menu
3. Sao chép các giá trị sau:

### Project URL
```
https://xxxxxxxxxxxxx.supabase.co
```

### Anon/Public Key
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxxxxxxxxxx
```
(Dùng cho client-side, an toàn để expose)

### Service Role Key
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxxxxxxxxxx
```
⚠️ **CẢNH BÁO**: Key này có quyền admin, KHÔNG ĐƯỢC expose ra client-side!

---

## 5. Cấu hình Environment Variables

### 5.1. Tạo file `.env.local`

Trong thư mục `src/`, tạo file `.env.local`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxxxxxxxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxxxxxxxxxx

# Dynamic Labs
NEXT_PUBLIC_DYNAMIC_ENV_ID=your_dynamic_environment_id

# API URL (for local development)
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### 5.2. Cấu hình cho Production (Vercel)

1. Vào Vercel Dashboard > Project Settings > Environment Variables
2. Thêm các biến môi trường tương tự (không có file `.env.local`)

---

## 6. Chạy SQL Schema

### Cách 1: Sử dụng Supabase Dashboard

1. Vào SQL Editor
2. Paste nội dung từ `database/postgre.sql`
3. Click Run

### Cách 2: Sử dụng Supabase CLI

```bash
# Cài đặt Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref xxxxxxxxxxxxx

# Chạy migration
supabase db push
```

---

## 7. Kiểm tra kết nối

### Test kết nối từ ứng dụng

1. Khởi động app:
```bash
cd src
npm run dev
```

2. Mở browser và thử đăng nhập với wallet
3. Kiểm tra console để xem logs kết nối

### Test trực tiếp từ Supabase

1. Vào **Table Editor**
2. Click vào bảng `users`
3. Kiểm tra xem có dữ liệu được tạo sau khi đăng nhập không

---

## Cấu trúc Database Schema

### Bảng Users
```sql
users (
  id UUID PRIMARY KEY,
  wallet_address VARCHAR(42) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE,
  display_name VARCHAR(100),
  avatar_url TEXT,
  bio TEXT,
  role VARCHAR(20) DEFAULT 'user',
  status VARCHAR(20) DEFAULT 'active',
  is_profile_complete BOOLEAN DEFAULT false,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

### Bảng Posts
```sql
posts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  image_url TEXT NOT NULL,
  caption TEXT,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  is_nft BOOLEAN DEFAULT false,
  nft_token_id VARCHAR(100),
  nft_price VARCHAR(50),
  nft_status VARCHAR(20),
  created_at TIMESTAMP
)
```

---

## Tính năng Row Level Security (RLS)

Schema đã bao gồm RLS policies để bảo vệ dữ liệu:

- Users có thể xem tất cả profiles
- Users chỉ có thể sửa profile của mình
- Posts công khai có thể xem bởi tất cả
- Users chỉ có thể tạo/sửa/xóa posts của mình

---

## Troubleshooting

### Lỗi "relation does not exist"
- Chạy lại SQL schema
- Kiểm tra có lỗi syntax không

### Lỗi kết nối
- Kiểm tra URL và API keys
- Đảm bảo project Supabase đang active

### Lỗi RLS policy
- Tạm thời disable RLS để debug:
```sql
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
```

---

## Liên hệ hỗ trợ

- Supabase Documentation: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com
