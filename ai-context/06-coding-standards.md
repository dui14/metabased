# Coding Standards

Nguyen tac tong quat:
- Viet code production-ready, de maintain
- Uu tien tinh ro rang cua data flow va permission boundaries
- Khong tron lan trach nhiem giua cac layer MVC

Standards cho API routes:
- Validate input som, tra ma loi dung semantic
- Verify auth token o server-side cho mutation nhay cam
- Check ownership/role truoc moi operation write
- Dung transaction khi cap nhat nhieu bang

Standards cho data access:
- Su dung Supabase PostgreSQL lam nguon su that duy nhat
- Tranh duplicate query khong can thiet
- Khong over-fetch fields

Standards cho cache:
- GET read-heavy duoc cache theo key co tham so
- Mutation bat buoc invalidation key lien quan
- TTL phu hop do bien dong cua du lieu

Standards cho security:
- Khong trust identity tu client payload
- Khong log token/secrets
- Enforce upload validation MIME, extension, size

Standards cho blockchain/storage integration:
- Verify chain/network truoc xu ly on-chain
- Ghi transaction status pending/confirmed/failed cho su kien blockchain
- Production upload huong toi Supabase Storage

Standards cho documentation:
- Moi thay doi endpoint phai cap nhat api contract
- Moi feature phai co spec trong spec/features
- Tai lieu phai phan biet ro implementation hien tai va target architecture

