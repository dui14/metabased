# API Contract

Convention chung:
- Base path: /api
- JSON response
- Runtime: nodejs route handlers

Nhom endpoint da co implementation:

Auth:
- POST /api/auth/verify
- GET /api/auth/verify

Users:
- POST /api/users/verify-auth
- GET/POST/PUT /api/users/profile
- GET /api/users/check-username
- GET /api/users/discover
- GET /api/users/trending
- GET/PUT /api/users/message-settings

Posts:
- GET/POST /api/posts
- GET/PUT/DELETE /api/posts/[postId]

Social:
- GET/POST /api/likes
- GET/POST /api/follows
- GET/POST /api/reposts
- GET/POST /api/comments

Messaging:
- GET/POST /api/conversations
- GET/POST/PATCH /api/messages

Upload:
- POST /api/upload
- POST /api/upload/avatar

Nhom endpoint chua thay day du trong src/app/api:
- notifications
- nft
- marketplace
- admin

HTTP error mapping quy uoc:
- 400 validate error
- 401 unauthorized
- 403 forbidden
- 404 not found
- 409 conflict
- 500 internal server error

