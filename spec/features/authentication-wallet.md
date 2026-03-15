# Feature Spec: Authentication Wallet

## Overview
Xac thuc nguoi dung bang Dynamic Labs JWT, mapping voi user trong DB theo wallet/email, va gate profile completion.

## User Stories
- Toi co the dang nhap bang wallet va duoc verify token.
- Toi co the link email-wallet khong bi conflict.
- Toi chi vao duoc luong user day du khi profile complete.

## API Endpoints
- `POST /api/auth/verify`
- `GET /api/auth/verify`
- `POST /api/users/verify-auth`
- `GET|POST|PUT /api/users/profile`
- `GET /api/users/check-username`

## Data Flow
1. Client lay Dynamic token
2. Backend verify JWT bang JWKS
3. Backend resolve user theo email/wallet
4. Neu user moi -> tao profile toi thieu
5. Neu conflict -> tra 409
6. Neu day du thong tin -> cho phep vao protected flows

## Database Tables Used
- `users`

## Cache Usage
- Khong co cache bat buoc cho auth verify
- Co the them session nonce/rate limit trong cache layer neu can

## Blockchain Interaction
- Co, o muc wallet identity (khong co tx on-chain)

## Edge Cases
- Token het han
- Token invalid signature
- Email va wallet thuoc 2 user khac nhau
- User ton tai nhung chua day du profile

## Security Considerations
- Khong trust identity tu client body
- Verify issuer/audience cua JWT
- Tra loi loi auth khong leak chi tiet noi bo
