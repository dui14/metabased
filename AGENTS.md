---
description: "Workspace instructions for Metabased. Use this file when working anywhere in this repository to understand architecture, conventions, and guardrails before making changes."
---

# Metabased Workspace Guide

## Project Summary

Metabased is a Next.js 14 full-stack application for a social NFT platform on Base Sepolia.

Core product intent:
- Wallet/email-based login through Dynamic Labs.
- Social posting flow with image or text posts.
- Follow, like, profile, discover, and direct messages.
- NFT minting and marketplace flows are planned, but only partially implemented in the current codebase.

Important current reality:
- Social features are much more complete than blockchain features.
- ERC721 and ERC1155 contracts exist.
- Marketplace smart contract is currently empty.
- Marketplace, notifications, and parts of admin are still mock or placeholder UI.
- Do not assume on-chain minting or buying is already wired end-to-end.

## Repository Architecture

### Root folders

- `contracts/`
  - Solidity contracts.
  - `nft721.sol`: ERC721 minting with whitelist and mint deadline.
  - `nft1155.sol`: ERC1155 minting with whitelist and mint deadline.
  - `marketplace.sol`: currently empty placeholder.

- `database/`
  - SQL schema and local inspection queries.
  - `postgrelocal.sql`: schema for local PostgreSQL.
  - `postgresupabase.sql`: schema and RLS setup for Supabase.
  - `test.sql`: manual inspection queries only.

- `docs/`
  - Product and setup documentation.
  - `ARCHITECHTURE.md`: intended system design and endpoint map.
  - `AUTH_FLOW.md`: authoritative auth/profile completion behavior.
  - `LOCAL_SETUP.md`, `SUPABASE_SETUP.md`: environment setup.

- `src/`
  - Main application code.

## Application Structure Inside `src/`

### `app/`

Next.js App Router entrypoint.

- `layout.tsx`
  - Root layout, wraps app with Dynamic and Chat providers.

- `page.tsx`
  - Redirects root route to `/login`.

- Route groups:
  - `(auth)/`
    - Login and logout pages.
  - `(public)/`
    - Public post detail route.
  - `(user)/`
    - Authenticated user pages such as create, marketplace, messages.
  - `(admin)/`
    - Admin-only routes.
  - `api/`
    - Route handlers used as the backend.

- Non-group pages:
  - `/home`, `/discover`, `/notifications`, `/profile`, `/settings`, `/user/[username]`.

### `components/`

Shared UI and feature components.

- `common/`
  - Design-system-like primitives and shared widgets.
  - Includes `Avatar`, `Button`, `Card`, `Input`, `Modal`, `ProfileSetupModal`, `AutoWalletConnect`.

- `layout/`
  - `MainLayout`, `Sidebar`, `BottomNav`, `RightPanel`, `TopBar`, `MobileDrawer`.

- `post/`
  - `PostCard`, `PostDetail` and related post UI.

- `nft/`
  - `NFTCard`, `MintButton`.
  - Treat these as partial UI, not proof of real chain integration.

### `lib/`

Core utilities, data access, and shared logic.

- `db.ts`
  - Local PostgreSQL connection via `pg`.
- `supabase.ts`
  - Supabase client helpers and shared query/service functions.
- `supabase-client.ts`
  - Client-side Supabase instance.
- `jwt.ts`
  - Dynamic Labs JWT verification via JWKS.
- `cache.ts`
  - In-memory cache helpers for feeds and user discovery.
- `constants.ts`
  - App and network constants. Contract addresses are placeholders today.
- `i18n.ts`
  - English/Vietnamese translation dictionary.

### `providers/`

Global context and app bootstrap.

- `DynamicProvider.tsx`
  - Dynamic Labs SDK setup.
- `AuthProvider.tsx`
  - Main auth state, user bootstrap, profile completion flow.
- `ChatProvider.tsx`
  - Messaging state with WebSocket or Supabase realtime behavior.
- `ThemeProvider.tsx`
  - Theme and language state.

### `types/`

Central app-facing TypeScript types for users, posts, NFTs, and API responses.

## Data and Runtime Model

### Auth flow

- Dynamic Labs provides auth state and JWT.
- Backend verifies JWT using `lib/jwt.ts`.
- User must have all of the following before being treated as fully onboarded:
  - wallet address
  - email
  - username
  - display name
- `docs/AUTH_FLOW.md` is the source of truth for this behavior.

### Database modes

The repo supports two execution modes.

- Local mode
  - `USE_LOCAL_DB=true`
  - Uses PostgreSQL through `lib/db.ts`
  - Local chat can also use `server-ws.ts`

- Cloud mode
  - `USE_LOCAL_DB=false`
  - Uses Supabase clients from `lib/supabase.ts`

Rule: when changing data-access behavior, preserve parity between local PostgreSQL and Supabase paths unless the task explicitly scopes the change to one mode.

### Upload behavior

- Upload APIs currently write files to `public/uploads/...`.
- Settings page still contains partial avatar-upload behavior.
- Do not claim storage is fully integrated with Supabase unless you actually wire and test it.

## Feature Status Guide

Treat the following as implemented enough to extend carefully:
- auth and profile bootstrap
- post creation and feed fetching
- likes and follows
- user discovery and trending users
- profile pages
- conversation and message APIs

Treat the following as partial or mock-first areas:
- NFT minting UI
- marketplace page and buy/list flows
- notifications page
- admin dashboard and admin users UI
- comments UI/backend
- right panel chat mock data

Rule: prefer honest end-to-end implementation over adding more mock behavior.

## Code Conventions

### Language and framework

- Use TypeScript everywhere in `src/`.
- Use React function components.
- Follow Next.js App Router conventions.
- Prefer server route handlers in `app/api/**/route.ts` for backend logic.

### Naming

- React components: PascalCase.
- Utility files: kebab-case or descriptive lowercase names already used in the repo.
- Route folder names: Next.js route naming conventions.
- Type names and interfaces: PascalCase.
- Usernames are stored and compared in lowercase.
- Wallet addresses should be normalized to lowercase before persistence or comparison.

### Imports

- Prefer `@/` path aliases over deep relative paths when working inside `src/`.
- Reuse existing exports from `components/*/index.ts` or `providers/index.ts` when appropriate.

### Styling

- Styling is Tailwind-first.
- Reuse the existing orange primary palette defined in `tailwind.config.js`.
- Preserve current visual language unless the task is explicitly a redesign.
- When editing user-facing screens that already use translations, prefer `useTheme().t(...)` over hardcoded text.
- If a component is already mostly hardcoded English or Vietnamese, keep the change consistent with nearby code instead of partially internationalizing unrelated strings.

### API route style

- Existing API routes typically export:
  - `export const dynamic = 'force-dynamic'`
  - `export const runtime = 'nodejs'`
- Keep this pattern unless there is a clear reason not to.
- Return `NextResponse.json(...)` with explicit status codes.
- Validate request payloads early.

### State and behavior

- Prefer minimal local state in components.
- Reuse provider state before introducing new global state.
- Do not introduce a new state library unless explicitly requested.
- Avoid new abstractions unless the pattern already repeats in the codebase.

## Important Guardrails

### Files and areas that require explicit user intent

Do not modify these unless the task clearly asks for it:
- `contracts/*`
- `database/*.sql`
- auth rules described in `docs/AUTH_FLOW.md`
- middleware access behavior in `src/middleware.ts`

Reason: these areas define schema, auth, and blockchain boundaries for the whole project.

### Avoid unsafe assumptions

- Do not assume marketplace contract logic exists.
- Do not hardcode real contract addresses, private keys, or secrets.
- Do not replace incomplete features with mock data if the task is to make them real.
- Do not remove the local-vs-Supabase split accidentally.

### Preserve existing behavior

- Keep public routes public and protected routes protected.
- Keep the profile-completion requirement intact unless the user explicitly wants to change it.
- Keep cache invalidation behavior in mind when mutating posts or user-derived feed data.

### Generated or uploaded files

- Do not manually edit files under `public/uploads/`.
- Treat uploaded assets as runtime artifacts, not source files.

## Verification Rules

Before committing or declaring a code change complete:

- Run from `src/`:
  - `npm run lint`
- If the change affects routing, build behavior, or shared types, also run when feasible:
  - `npm run build`
- If the task touches auth, posts, follows, likes, messaging, or uploads, validate the affected flow directly when practical.
- If you cannot run a meaningful check, say so explicitly in the final summary.

This repository does not currently expose a formal automated test suite in the checked-in root docs/scripts. For most changes, lint plus targeted functional verification is the minimum standard.

## Change Strategy for AI Agents

When working in this repo:

1. Read the relevant page, API route, and shared lib file together before editing.
2. Check whether the feature has both local PostgreSQL and Supabase paths.
3. Verify whether the UI is real or mock before extending it.
4. Fix root causes instead of patching symptoms.
5. Keep changes small and consistent with existing patterns.
6. Update docs when behavior or setup actually changes.

## Practical Pointers

- For auth issues, start with:
  - `src/providers/AuthProvider.tsx`
  - `src/app/api/users/verify-auth/route.ts`
  - `src/app/api/users/profile/route.ts`
  - `docs/AUTH_FLOW.md`

- For social feed issues, start with:
  - `src/app/home/page.tsx`
  - `src/components/post/PostCard.tsx`
  - `src/app/api/posts/route.ts`
  - `src/app/api/likes/route.ts`
  - `src/app/api/follows/route.ts`

- For chat issues, start with:
  - `src/app/(user)/messages/page.tsx`
  - `src/providers/ChatProvider.tsx`
  - `src/app/api/conversations/route.ts`
  - `src/app/api/messages/route.ts`
  - `src/server-ws.ts`

- For NFT or marketplace work, inspect first before changing:
  - `contracts/*`
  - `src/components/nft/*`
  - `src/app/(user)/marketplace/page.tsx`
  - `src/lib/constants.ts`

## Default Expectation

Prefer shipping correct social-platform behavior over expanding mock blockchain UI. If a task touches NFT or marketplace behavior, first confirm whether the requested change is expected to be UI-only, database-backed, or truly on-chain.

## Notification Implementation Blueprint

Use this section when implementing notifications for this repository.

Current status:
- `notifications` table exists in both SQL schemas.
- `/notifications` page is UI-only and currently uses mock data.
- No notification API routes are implemented yet.
- Event sources with real backend logic already exist for follows, likes, and messages.
- Comments are not fully implemented yet, so comment notifications are naturally last.

### Canonical model and mapping

Database source of truth:
- Table: `notifications`
- Columns: `id`, `user_id`, `type`, `title`, `message`, `reference_id`, `reference_type`, `actor_id`, `is_read`, `created_at`

Rules:
- Use `is_read` in backend and frontend state; do not introduce separate `read` field.
- Align UI notification types with DB enum. If adding a new type (for example `message`), update both local and Supabase schema explicitly.
- Keep actor-based rendering possible by joining `actor_id -> users` when listing notifications.

### Required foundation before event hooks

Implement the shared notification stack first:
1. `src/lib/notifications.ts`
   - Central helper/service for create/list/mark-read operations.
   - Must support both `USE_LOCAL_DB=true` and `USE_LOCAL_DB=false`.
2. API routes:
   - `src/app/api/notifications/route.ts`
     - `GET`: list notifications (supports `filter=all|unread`, pagination).
     - `PATCH`: mark a single notification as read (or use a separate `[id]` route if preferred).
   - `src/app/api/notifications/read-all/route.ts`
     - `PATCH`: mark all notifications as read for current user.
   - `src/app/api/notifications/unread-count/route.ts`
     - `GET`: return unread count for badges.
3. UI integration:
   - Replace mock data in `src/app/notifications/page.tsx` with API-driven data.
   - Keep existing all/unread tabs and wire them to real query params.
   - Wire "Mark all read" to the API.

### Event implementation order (simple -> complex)

#### Phase 1: Follow notifications (simplest)

Hook point:
- `src/app/api/follows/route.ts`

On successful follow:
- Create notification for `following_id`.
- `type='follow'`, `actor_id=follower_id`, `reference_type='user'`, `reference_id=follower_id`.

Guardrails:
- Do not create when follower equals following.
- Do not create duplicate notification for duplicate follow action.

Definition of done:
- New follow creates one unread notification for target user.
- Notification appears on `/notifications` after refresh.
- Unfollow does not break counts and does not create new notification.

#### Phase 2: Like notifications

Hook point:
- `src/app/api/likes/route.ts`

On successful like:
- Resolve post owner (`posts.user_id`) and notify owner.
- `type='like'`, `actor_id=liker_id`, `reference_type='post'`, `reference_id=post_id`.

Guardrails:
- No notification for self-like.
- No duplicate notification when like already exists.

Definition of done:
- Liking another user's post creates one unread notification.
- Unliking does not create notification and does not error.

#### Phase 3: Chat notifications

Hook point:
- `src/app/api/messages/route.ts` after successful insert.

Important product decision:
- Decide whether chat should appear in the global notifications feed or remain inbox-only.

If chat is included:
- Prefer adding a dedicated notification type (for example `message`) with explicit schema update.
- Use `reference_type='conversation'`, `reference_id=conversation_id`, `actor_id=sender_id`.

Guardrails:
- Avoid noisy spam behavior; optionally debounce/group by conversation.
- Avoid duplicate notification if the same message event is retried.

Definition of done:
- Receiving a new message can produce notification consistently (if product enables it).
- Mark-read behavior remains correct in both message inbox and notifications page.

#### Phase 4: Comment notifications (most complex here)

Dependency:
- Comments API must exist first.

Expected hook point (after comments backend exists):
- `src/app/api/comments/route.ts` (or equivalent route)

On successful comment creation:
- Notify post owner for new comment.
- `type='comment'`, `actor_id=commenter_id`, `reference_type='post'`, `reference_id=post_id`.

Optional advanced behavior:
- Reply notifications for parent comment owner.
- Mention parsing and `mention` notifications.

Definition of done:
- New comment on another user's post creates notification.
- Self-comment does not notify self.

### UI and badge integration

Primary places to surface unread count:
- `src/components/layout/Sidebar.tsx`
- `src/components/layout/MobileDrawer.tsx`

Optional:
- Add Notifications item to `src/components/layout/BottomNav.tsx` if mobile UX requires direct notification access.

### Caching and invalidation rules

When notifications change:
- Invalidate user notification cache key (for example `notifications:<userId>`).
- Invalidate unread count cache for that user.

Use existing cache utility patterns in `src/lib/cache.ts` and keep cache key naming consistent.

### Auth and security rules

- Notification list/read APIs must be scoped to current authenticated user.
- Never allow user A to mark user B's notification as read.
- For Supabase path, prefer server-side API with service role where needed; do not assume direct client access because RLS for notifications is not fully defined in schema docs.

### Suggested execution checklist

1. Build notification service and API routes.
2. Replace notifications page mock data with real API wiring.
3. Implement follow notifications.
4. Implement like notifications.
5. Add unread badge in sidebar/mobile drawer.
6. Implement chat notifications after product confirmation.
7. Implement comment notifications after comments API exists.
8. Run `npm run lint` in `src/` and validate flows manually.