# Architecture

Kieu kien truc:
- MVC tren Next.js App Router

Phan lop:
- View: pages/components trong src/app va src/components
- Controller: route handlers trong src/app/api
- Model: PostgreSQL schema + service/query layer trong src/lib

Luong xu ly chinh:
Client -> API Routes -> In-memory Cache -> Supabase PostgreSQL -> Smart Contracts (Base Sepolia)

Chi tiet implementation:
- Middleware xu ly auth gate va admin gate cho routes app
- API route xu ly validation + authz + orchestration
- Data access su dung Supabase PostgreSQL
- In-memory cache duoc su dung cho read-heavy trong runtime hien tai
- Messaging realtime ho tro bo sung qua WebSocket server

Rang buoc kien truc:
- Khong de UI layer truy cap DB truc tiep
- Mọi mutate operation phai check owner/role server-side
- Mọi mutate operation lien quan feed/profile/listing phai invalidation cache
- Khong thay doi API contract ma khong cap nhat tai lieu

