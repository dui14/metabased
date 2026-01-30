# Metabased

Social NFT Marketplace trên Base Sepolia - Chia sẻ khoảnh khắc của bạn dưới dạng NFT.

## Giới thiệu

Metabased là một nền tảng mạng xã hội phi tập trung cho phép người dùng chia sẻ bài đăng, biến chúng thành NFT và giao dịch trên marketplace. Xây dựng trên Base Sepolia testnet với Dynamic Labs authentication và PostgreSQL database.

### Tính năng chính

- Đăng nhập bằng ví crypto (Dynamic Labs)
- Đăng bài và chia sẻ nội dung
- Mint NFT từ bài đăng
- Marketplace mua/bán NFT
- Hệ thống follow, like, comment
- Tin nhắn giữa người dùng
- Admin dashboard quản lý hệ thống

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS, Framer Motion
- **Authentication**: Dynamic Labs (Wallet-based)
- **Database**: PostgreSQL (Supabase hoặc Local Docker)
- **Blockchain**: Base Sepolia Testnet
- **Smart Contracts**: Solidity (NFT721, NFT1155, Marketplace)
- **Deployment**: Vercel

## Cấu trúc thư mục

```
metabased/
├── contracts/                  # Smart contracts
│   ├── marketplace.sol
│   ├── nft721.sol
│   └── nft1155.sol
├── database/                   # SQL schemas
│   ├── postgrelocal.sql       # Local PostgreSQL
│   └── postgresupabase.sql    # Supabase
├── docs/                       # Documentation
│   ├── ARCHITECTURE.md        # Kiến trúc hệ thống
│   ├── LOCAL_SETUP.md         # Hướng dẫn setup local
│   ├── SUPABASE_SETUP.md      # Hướng dẫn setup Supabase
│   └── README.md              # File này
├── src/                        # Source code
│   ├── app/                   # Next.js App Router
│   │   ├── (auth)/            # Auth routes (login, logout)
│   │   ├── (public)/          # Public routes
│   │   ├── (user)/            # Protected user routes
│   │   ├── (admin)/           # Admin routes
│   │   └── api/               # API Routes
│   ├── components/            # React components
│   ├── lib/                   # Utilities & configs
│   ├── providers/             # Context providers
│   ├── types/                 # TypeScript types
│   └── docker-compose.yml     # Docker config
└── .env.example               # Environment template
```

## Hướng dẫn cài đặt

### 1. Clone repository

```bash
git clone <repository-url>
cd metabased
```

### 2. Cài đặt dependencies

```bash
cd src
npm install
```

### 3. Cấu hình môi trường

Chọn 1 trong 2 phương pháp:

#### Option A: Supabase (Khuyến nghị cho production)
Xem hướng dẫn chi tiết tại [SUPABASE_SETUP.md](SUPABASE_SETUP.md)

#### Option B: Local PostgreSQL (Docker)
Xem hướng dẫn chi tiết tại [LOCAL_SETUP.md](LOCAL_SETUP.md)

### 4. Chạy ứng dụng

```bash
# Development
npm run dev

# Production build
npm run build
npm start
```

Truy cập: http://localhost:3000

## Hướng dẫn phát triển

### Coding standards

- Sử dụng TypeScript cho type safety
- Component naming: PascalCase
- File naming: kebab-case hoặc PascalCase (components)
- Commit messages: Conventional Commits

### Database migrations

Khi thay đổi database schema:

1. Cập nhật file SQL trong `database/`
2. Chạy migration trên local
3. Test kỹ
4. Deploy lên Supabase (production)

## API Documentation

### Authentication

```typescript
POST /api/auth/verify
// Verify JWT token từ Dynamic Labs
```

### Users

```typescript
GET  /api/users/profile?wallet=0x...
POST /api/users/profile
PUT  /api/users/profile
```

### Posts

```typescript
GET    /api/posts
POST   /api/posts
GET    /api/posts/[postId]
DELETE /api/posts/[postId]
```

Xem đầy đủ tại [ARCHITECTURE.md](ARCHITECTURE.md)

## Deployment

### Vercel (Production)

1. Push code lên GitHub
2. Connect repository với Vercel
3. Cấu hình environment variables
4. Deploy

```bash
# Hoặc dùng Vercel CLI
vercel --prod
```

### Environment Variables (Production)

Cần cấu hình đầy đủ các biến trong `.env.example` tại Vercel Dashboard.

## Testing

```bash
# Run tests
npm test

# E2E tests
npm run test:e2e
```

## Troubleshooting

### Lỗi kết nối database
- Kiểm tra `.env.local` đã đúng chưa
- Verify Docker container đang chạy (nếu dùng local)
- Check Supabase project status (nếu dùng Supabase)

### Lỗi Dynamic Labs
- Verify `NEXT_PUBLIC_DYNAMIC_ENV_ID` đúng
- Check JWKS URL
- Kiểm tra network (Base Sepolia)

### Build errors
- Xóa `.next/` folder
- Clear node_modules và reinstall

## Contributing

1. Fork repository
2. Tạo feature branch
3. Commit changes
4. Push to branch
5. Tạo Pull Request

## License

MIT License

## Contact

- GitHub Issues cho bug reports

## Acknowledgments

- Next.js team
- Dynamic Labs
- Supabase
- Base (Coinbase L2)
