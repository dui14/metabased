# Authentication Flow

## Overview

Authentication is handled using **Dynamic Labs JWT**.  
Users are identified in the database via **wallet address and/or email**.

A user can only access protected routes when the profile is **complete**.

Required fields:


wallet_address
email
username
display_name


If any field is missing → user must complete profile.

---

# Authentication Process

Login flow:


Client Login (Dynamic)
↓
Client receives JWT
↓
POST /api/auth/verify
↓
Backend verifies JWT (JWKS)
↓
Resolve user identity (wallet/email)
↓
Check profile completeness
↓
Return authentication state


---

# Identity Resolution

User identity is determined by:


wallet_address
email


Possible outcomes:

| Case | Result |
|-----|-----|
| User not found | Create minimal user |
| User found | Validate profile |
| Wallet/email mismatch | Return conflict |

---

# New User Flow

If wallet/email does not exist:


create user
is_profile_complete = false


User must complete profile:


username
display_name


After completion:


is_profile_complete = true


User is redirected to:


/home


---

# Existing User Flow

If wallet/email matches existing user:

Check:

wallet &&
email &&
username &&
display_name


If complete:


role = admin → /admin
role = user → /home


If incomplete:


show ProfileSetupModal


---

# Identity Conflict

Conflict occurs when:


email belongs to user A
wallet belongs to user B


Response:


409 Conflict


User must re-authenticate with correct identity.

---

# Profile Completion

Profile is considered complete when:


wallet_address
email
username
display_name


Database flag:


is_profile_complete = true


---

# Protected Routes

Protected routes require:


isAuthenticated = true
is_profile_complete = true


Examples:


/home
/profile
/create
/marketplace
/messages
/notifications


If conditions fail:


redirect → /login


---

# Admin Routes

Admin routes require:


role = admin
is_profile_complete = true


Example:


/admin


Otherwise:


redirect → /login


---

# Database

Table used:


users


Important fields:


id
wallet_address
email
username
display_name
is_profile_complete
role
status
created_at
updated_at


---

# Security Rules

Authentication must follow:


verify JWT signature
verify issuer and audience
do not trust identity from client body
handle token expiration
avoid leaking internal errors