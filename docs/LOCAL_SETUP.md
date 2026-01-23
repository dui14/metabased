# Hướng dẫn thiết lập PostgreSQL Local

## Yêu cầu

- PostgreSQL 15 trở lên
- Node.js 18 trở lên
- Windows/macOS/Linux

## Bước 1: Cài đặt PostgreSQL

### Windows

1. Tải PostgreSQL từ: https://www.postgresql.org/download/windows/
2. Chạy installer và làm theo hướng dẫn:
   - Port: `5432`
   - User: `postgres`
   - Password: Đặt password của bạn
   - Locale: Default locale
3. Thêm PostgreSQL vào PATH (optional):
   ```
   C:\Program Files\PostgreSQL\15\bin
   ```

### macOS

```bash
brew install postgresql@15
brew services start postgresql@15
```

### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

## Bước 2: Tạo Database

```bash
# Kết nối PostgreSQL
psql -U postgres

# Tạo database
CREATE DATABASE metabased;

# Thoát
\q
```

## Bước 3: Import Schema

```bash
# Di chuyển đến thư mục project
cd /path/to/metabased

# Import schema
psql -U postgres -d metabased -f database/postgrelocal.sql

# Kiểm tra tables
psql -U postgres -d metabased -c "\dt"
```

## Bước 4: Cấu hình Environment

Mở file `src/.env.local` và cập nhật:

```env
# DATABASE MODE
USE_LOCAL_DB=true

# LOCAL POSTGRESQL
LOCAL_DB_HOST=localhost
LOCAL_DB_PORT=5432
LOCAL_DB_USER=postgres
LOCAL_DB_PASSWORD=your_password_here
LOCAL_DB_NAME=metabased
```

**Lưu ý**: Thay `your_password_here` bằng password bạn đã đặt khi cài PostgreSQL.

## Bước 5: Cài đặt Dependencies

```bash
cd src
npm install
```

Đảm bảo các package sau đã được cài:
- `pg` - PostgreSQL client
- `@types/pg` - TypeScript types

## Bước 6: Test kết nối

```bash
# Test bằng script
node scripts/test-db-connection.js

# Hoặc test trực tiếp
psql -U postgres -d metabased -c "SELECT NOW()"
```

## Bước 7: Chạy ứng dụng

```bash
npm run dev
```

Kiểm tra console log:
```
Kết nối PostgreSQL local thành công!
Host: localhost
Port: 5432
Database: metabased
```

## Các lệnh PostgreSQL hữu ích

### Quản lý Database

```bash
# Liệt kê databases
psql -U postgres -c "\l"

# Kết nối vào database
psql -U postgres -d metabased

# Xóa database
DROP DATABASE metabased;

# Tạo database mới
CREATE DATABASE metabased;
```

### Trong psql shell

```sql
-- Liệt kê tables
\dt

-- Xem cấu trúc table
\d users

-- Query dữ liệu
SELECT * FROM users;

-- Đếm records
SELECT COUNT(*) FROM users;

-- Thoát
\q
```

### Backup và Restore

```bash
# Backup database
pg_dump -U postgres -d metabased -f backup.sql

# Restore database
psql -U postgres -d metabased -f backup.sql

# Backup với compressed format
pg_dump -U postgres -d metabased -Fc -f backup.dump

# Restore compressed backup
pg_restore -U postgres -d metabased backup.dump
```

## Quản lý PostgreSQL Service

### Windows

```powershell
# Kiểm tra service
Get-Service postgresql*

# Khởi động
Start-Service postgresql-x64-15

# Dừng
Stop-Service postgresql-x64-15

# Restart
Restart-Service postgresql-x64-15
```

### macOS

```bash
# Khởi động
brew services start postgresql@15

# Dừng
brew services stop postgresql@15

# Restart
brew services restart postgresql@15
```

### Linux

```bash
# Kiểm tra status
sudo systemctl status postgresql

# Khởi động
sudo systemctl start postgresql

# Dừng
sudo systemctl stop postgresql

# Restart
sudo systemctl restart postgresql
```

## Troubleshooting

### Lỗi: "password authentication failed"

**Nguyên nhân**: Password trong `.env.local` không đúng.

**Giải pháp**:
1. Kiểm tra password đã đặt khi cài PostgreSQL
2. Cập nhật `LOCAL_DB_PASSWORD` trong `.env.local`
3. Restart app

### Lỗi: "database 'metabased' does not exist"

**Giải pháp**:
```bash
psql -U postgres -c "CREATE DATABASE metabased;"
```

### Lỗi: "relation 'users' does not exist"

**Giải pháp**: Import lại schema
```bash
psql -U postgres -d metabased -f database/postgrelocal.sql
```

### Lỗi: "could not connect to server"

**Nguyên nhân**: PostgreSQL service không chạy.

**Giải pháp**:
```bash
# Windows
Start-Service postgresql-x64-15

# macOS
brew services start postgresql@15

# Linux
sudo systemctl start postgresql
```

### Lỗi: "psql: command not found"

**Giải pháp**: Thêm PostgreSQL vào PATH

**Windows**:
```powershell
$env:Path += ";C:\Program Files\PostgreSQL\15\bin"
```

**macOS/Linux**:
```bash
export PATH="/usr/local/opt/postgresql@15/bin:$PATH"
```

### Lỗi: "Thiếu biến môi trường"

**Giải pháp**: Kiểm tra file `.env.local` có đầy đủ các biến:
- `LOCAL_DB_HOST`
- `LOCAL_DB_PORT`
- `LOCAL_DB_USER`
- `LOCAL_DB_PASSWORD`
- `LOCAL_DB_NAME`

## Chuyển đổi Database Mode

### Dùng PostgreSQL Local

```env
USE_LOCAL_DB=true
```

### Dùng Supabase Cloud

```env
USE_LOCAL_DB=false
```

Sau khi thay đổi, restart Next.js app.

## Cấu trúc Database

### Tables chính

- `users` - Thông tin người dùng
- `posts` - Bài đăng
- `comments` - Bình luận
- `nfts` - NFT metadata
- `nft_listings` - NFT listings trên marketplace
- `transactions` - Lịch sử giao dịch
- `notifications` - Thông báo
- `messages` - Tin nhắn
- `follows` - Quan hệ follow
- `likes` - Lượt thích

### Indexes

Database đã được tối ưu với các indexes:
- `wallet_address` trên table `users`
- `user_id`, `created_at` trên table `posts`
- Foreign key indexes cho joins

## Best Practices

### Development

1. Luôn dùng PostgreSQL local khi dev (`USE_LOCAL_DB=true`)
2. Test query performance bằng `EXPLAIN ANALYZE`
3. Backup database thường xuyên trước khi test migration
4. Dùng pgAdmin hoặc DBeaver để quản lý database

### Production

1. Chuyển sang Supabase (`USE_LOCAL_DB=false`)
2. Enable connection pooling
3. Monitor slow queries
4. Setup automated backups

## Tools hữu ích

### pgAdmin 4

GUI tool để quản lý PostgreSQL, đã được cài cùng PostgreSQL installer.

### DBeaver

Universal database tool, hỗ trợ nhiều database engines.

```bash
# Download
https://dbeaver.io/download/
```

### VS Code Extensions

- PostgreSQL by Chris Kolkman
- SQL Tools by Matheus Teixeira

## Tài liệu tham khảo

- PostgreSQL Documentation: https://www.postgresql.org/docs/
- node-postgres (pg): https://node-postgres.com/
- Supabase CLI: https://supabase.com/docs/guides/cli
