# Decisions
| Date | Decision | Reason |
|---|---|---|
| 2026-10-04 | MERN stack | Owner's main stack; portfolio fit |
| 2026-10-04 | Money as integer paise | Avoid floating point errors |
| 2026-10-04 | Members are names inside a group first, accounts later | Matches the Android app |
| 2026-10-04 | Greedy settlement matching | Simple and near-minimal transfers |
| 2026-10-06 | validateExpense pure function in settlement.js | Pure validation ensures payments and shares sum to exact total in paise |
| 2026-10-06 | JWT auth with bcryptjs | Secure stateless authentication with password hashing |
| 2026-10-06 | Cascading deletion on group removal | Prevent orphaned expenses and settlements in MongoDB |
| 2026-10-06 | Shared settlement logic in frontend utils | Eliminates discrepancy between live preview and saved settlements |
| 2026-10-06 | Responsive sidebar + mobile bottom nav | Supports 360px phones without horizontal scrolling and clean desktop sidebar |
| 2026-10-06 | Hybrid member accounts (unlinked names + user accounts) | Preserves offline/quick group creation while allowing registered users to claim their profile |
| 2026-10-06 | Shareable group invite links (/join/:id) | Allows seamless friend invitations without requiring pre-registered emails |
| 2026-10-06 | Socket.io rooms per group | Isolate real-time expense and settlement events to respective group members |
| 2026-10-06 | Client-side CSV generation | Instant spreadsheet export without server load or file storage overhead |
| 2026-10-06 | CSS data-theme switching | Clean, flash-free light/dark mode support with persistent tokens |
| 2026-10-06 | Strict JWT secret enforcement & credential separation | Removed hardcoded secrets, isolated Atlas URI to .env, sanitized .env.example |
| 2026-10-06 | Rate limiting on auth endpoints | Prevent brute-force password guessing and credential stuffing via express-rate-limit |
| 2026-10-06 | Group & expense deletion authorization checks | Fixed IDOR vulnerability by validating group owner/member identity |
| 2026-10-06 | CSV formula injection sanitization | Prepend apostrophe to cells starting with [=,+,-,@,\t,\r] to protect spreadsheet viewers |
| 2026-10-06 | Dual email verification (OTP + Link) via Nodemailer | Provides high-friction-free 6-digit code entry in-app or one-click verification from email link with automatic Ethereal fallback in development |
| 2026-10-06 | Strict unverified login block & SHA-256 token hashing | Unverified users blocked with 403; verification tokens & OTPs stored as SHA-256 hashes; brute force OTP attempts lockout after 5 fails; HTML escaping in emails prevents stored XSS |
| 2026-10-06 | Splitwise-style real & verified member enforcement | Group creation and member addition strictly enforce real, registered, email-verified accounts via GET /api/users/search and server-side validateVerifiedUser; dummy/arbitrary emails completely blocked |
| 2026-10-06 | Socket.IO room authentication & real-time chat | JWT handshake verification enforces identity; membership checks enforce authorized room joins; ChatMessage schema stores persistent group chats with member-only access |
| 2026-10-06 | Multi-party peer settlement approval system | Eliminated unilateral settlement abuse. Requester creates SettlementRequest; requesters strictly forbidden from self-approving; at least one group peer must approve before debt balance updates and Settlement records are finalized |
| 2026-10-06 | Immutable audit trail & live notifications | Real-time notifications and immutable AuditLog records capture payment creation, edits, deletions, settlement requests, approvals, and membership actions |
| 2026-10-06 | Multi-party peer expense deletion approval system | Eliminated unilateral expense removal. Any deletion attempt creates an ExpenseDeletionRequest; requesters cannot self-approve; at least one group peer must approve before expense is deleted from DB and balance impact is updated; direct unilateral deletion returns HTTP 403 |

