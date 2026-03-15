# Tech Stack

Frontend:
- Next.js 14 App Router
- React 18
- Tailwind CSS
- Framer Motion

Backend:
- Next.js API Route Handlers
- Node.js runtime

Authentication:
- Dynamic Labs wallet login
- JWT verify qua JWKS (jose)

Database:
- PostgreSQL schema trong Supabase

Cache:
- In-memory cache cho feed/listing read-heavy

Storage:
- Hien tai: local filesystem trong public/uploads
- Muc tieu production: Supabase Storage buckets

Blockchain:
- Base Sepolia testnet
- Contracts trong repo: ERC721, ERC1155
- Marketplace contract file hien tai chua co noi dung logic

Thu vien backend/noi bat:
- @supabase/supabase-js
- pg
- jose
- jwt-decode
- ws
- ethers

