# Report and Guide - Repost, Sidebar Collapse, Post UI, API Debug

## Date
2026-03-15

## Scope Completed
- Added repost API route and connected repost actions in UI
- Added sidebar collapse button and persisted state in localStorage
- Updated post UI order to text first, image second
- Added explicit copy URL action at post detail page with post ID display
- Added profile timeline support to include reposted posts
- Performed API debug and endpoint verification

## Files Updated
- src/app/api/reposts/route.ts
- src/app/api/posts/route.ts
- src/lib/supabase.ts
- src/types/post.ts
- src/components/post/PostCard.tsx
- src/components/post/PostDetail.tsx
- src/components/layout/Sidebar.tsx
- src/components/layout/MainLayout.tsx
- src/components/layout/RightPanel.tsx
- src/app/profile/page.tsx
- src/app/user/[username]/page.tsx

## Feature Details

### 1. Repost API
Endpoint added:
- GET /api/reposts?user_id={id}&post_id={id}
- POST /api/reposts

POST body:
- user_id: string
- post_id: string
- action: repost | unrepost

Behavior:
- Reject repost own post with status 400
- Idempotent behavior when already reposted
- Updates posts.reposts_count based on actual repost rows
- Invalidates feed/user/detail cache keys after mutate

### 2. Repost in UI
- Post card now checks isReposted state
- Repost button toggles repost/unrepost with optimistic update
- Repost count is updated immediately and rolled back on API error
- Reposted items in profile timeline show repost badge and reposted time

### 3. Reposts on Profile
- Profile requests now include include_reposts=true
- API /api/posts supports include_reposts for user timeline mode
- Service layer merges own posts and reposted posts then sorts by event time

### 4. Sidebar Collapse
- Added collapse/expand toggle button in left sidebar
- Collapse state persisted in localStorage key sidebar-collapsed
- Main content margin adjusts for collapsed and expanded sidebar width

### 5. Post UI Layout
- Post content order changed to caption first, image second in PostCard
- Post detail also displays caption before image for consistency

### 6. Copy URL in Post Detail
- Added post ID row in PostDetail
- Added dedicated Copy URL button near Post ID
- Existing share button still supports quick copy behavior

## API Debug and Test Summary
Environment:
- Next.js dev server running on http://localhost:3001

Executed checks:
1. GET /api/posts?limit=2
- Status: 200
- Result: posts length returned > 0

2. GET /api/reposts without params
- Status: 400
- Result: validation works

3. POST /api/reposts with invalid empty body
- Status: 400
- Result: validation works

4. GET /api/posts?user_id={id}&include_reposts=true&limit=5
- Status: 200
- Result: include_reposts mode works

5. POST /api/reposts self repost using same post owner
- Status: 400
- Message: You cannot repost your own post

## Quick Verification Guide
1. Start app:
- cd src
- npm run dev

2. Home feed check:
- Open /home
- Repost button should toggle and update count

3. Profile check:
- Open /profile
- Reposted posts should appear in timeline mixed with own posts

4. Public user profile check:
- Open /user/{username}
- Reposts should appear similarly

5. Sidebar check:
- Click collapse icon in left sidebar (desktop)
- Refresh page and verify state persists

6. Post detail check:
- Open /post/{postId}
- Verify Post ID and Copy URL button exist and copy full URL

## Notes
- The repository currently contains additional unrelated modified files from previous work. This report only covers the scope listed above.
