# Feature Spec: User Profile

## Overview
Quan ly profile user, kiem tra username, discover/trending users va profile completion policy.

## User Stories
- Toi cap nhat username/display_name/bio/avatar/email.
- Toi tim profile bang wallet hoac username.
- Toi kiem tra username con trong truoc khi luu.
- Toi kham pha user trending/discover.

## API Endpoints
- `GET /api/users/profile`
- `POST /api/users/profile`
- `PUT /api/users/profile`
- `GET /api/users/check-username`
- `GET /api/users/discover`
- `GET /api/users/trending`

## Data Flow
1. Lay profile theo wallet/username
2. Validate uniqueness username khi cap nhat
3. Tinh `is_profile_complete` dua tren 4 truong bat buoc
4. Discover/trending query users active + profile complete

## Database Tables Used
- `users`
- lien quan social count tu `follows`

## Cache Usage
- `users:trending` TTL 5m
- `users:discover:{limit}:{offset}:{search}` TTL 120s
- Invalidate discover/trending khi social graph thay doi lon

## Blockchain Interaction
- Wallet address la identity chinh

## Edge Cases
- Username khong dung regex
- Username trung user khac
- Wallet/email conflict profile merge

## Security Considerations
- Profile update phai xac minh owner thong qua token
- Khong cho phep role escalation tu profile payload
