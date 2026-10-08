# GroupSpend Web: Status

**Last updated:** 2026-10-06
**Stage:** Phase 1-4 Complete, Security Hardened & Tested (12/12 passing), Ready for Production Deployment (Phase 5)

## Done
- **Phase 0:** Single-file web prototype (`groupspend.html`)
- **Phase 1 Backend foundation:**
  - Express API with MongoDB Mongoose models: `User`, `Group`, `Expense`, `Settlement`
  - Pure settlement logic with `validateExpense` in `backend/src/settlement.js` (integer paise)
  - Unit tests for all 10 scenarios in `projectTest.md` + auth tests (12/12 passing)
  - Full REST API: Groups, Members, Balances, Transfers, Expenses, Settlements, Reports, Auth
- **Phase 2 Frontend port (React + Vite):**
  - Modern design system in `frontend/src/index.css` (Teal `#1f8a7a` palette, soft mint cards, purple preview card, responsive layout)
  - Desktop sidebar + Mobile bottom navigation (5 tabs: Home, Expenses, Reports, Members, Settlements)
  - State store & API client in `frontend/src/context/GroupContext.jsx` and `api.js`
  - Home, Expenses, Reports, Members, Settlements pages
  - Modals: Create Group, Add Expense (equal/custom split with live preview), Settle Now
- **Phase 3 Auth and Multi-user:**
  - JWT session management with token persistence in `localStorage`
  - User authentication context (`frontend/src/context/AuthContext.jsx`)
  - Login / Register modal (`AuthModal.jsx`)
  - Group invitation system (`InviteModal.jsx` and shareable link generation)
  - Join invitation landing page (`frontend/src/pages/JoinGroup.jsx` at `/join/:id`)
  - Member account linking (links registered user ID to existing group member names or adds new members)
  - Header & Sidebar user account state indicator with quick Login/Logout
- **Phase 4 Parity and Extras:**
  - Multiple payers per expense support with live balance validation
  - Socket.io real-time live sync across group rooms (`expense:created`, `expense:deleted`, `settlement:created`)
  - Live activity notification toast banner in the header
  - Report export to CSV (`.csv` download) & browser print-to-PDF styles
  - Light & dark mode theme toggle with `localStorage` persistence
- **Security Hardening (All Vulnerabilities Remediated):**
  - Live Atlas credentials separated into gitignored `.env` files; `.env.example` sanitized with placeholders
  - Removed default fallback secret in `auth.js`; fail-fast in production if secret missing
  - Fixed IDOR on group & expense deletion with ownership/membership authorization checks
  - Rate limiting added to `/api/auth/login` and `/api/auth/register` via `express-rate-limit`
  - CSV formula injection mitigated by escaping `=,+,-,@` in exported reports
  - Upper bound validation on text lengths and paise amounts added to models and `validateExpense`
- **Email Verification (Nodemailer):**
  - Configured Nodemailer transporter with custom SMTP support and automated Ethereal dev fallback
  - Branded verification HTML email with 6-digit OTP code and direct activation link
  - Dual verification method support: OTP verification in `AuthModal` & one-click link at `/verify-email?token=...`
  - Resend verification code/link flow with status feedback
  - Unit tests for OTP code generation & expiration logic
- **Splitwise-Style Verified Member System:**
  - Strict server-side validation rejecting unverified, fake, dummy, or non-existent member accounts
  - Verified user autocomplete search endpoint (`GET /api/users/search`)
  - Redesigned `CreateGroupModal` and `Members` page member pickers
  - Replaced arbitrary free-text entry with live verified user search
  - 30/30 automated unit and security tests passing
- **Real-Time Collaboration & Peer Settlement Approvals:**
  - `ChatMessage` persistent schema, real-time Socket.IO room messaging (`join-group`, `leave-group`, `send-message`, `new-message`) with member-only access.
  - Real-time `Notification` system across expense, settlement, and membership actions broadcasted via `group-notification`.
  - Multi-party peer settlement request workflow (`SettlementRequest`) with strict prohibition on self-approval (HTTP 403), duplicate approval prevention, and peer authorization before balance updates.
  - Immutable `AuditLog` records for complete financial audit trail (`payment_created`, `payment_deleted`, `settlement_requested`, `settlement_approved`, `settlement_rejected`, `member_added`, `member_removed`).
  - Frontend Group Navigation tabs: Expenses, Members, Chat, Activity, Settlements with live auto-updating UI.
  - 40/40 automated unit, security, and integrity tests passing.
- **Peer-Approved Expense Deletion System:**
  - Multi-party `ExpenseDeletionRequest` workflow: unilateral expense deletion is disabled (HTTP 403) to prevent debt tampering.
  - Strict anti-self-approval rule: requester cannot approve their own expense deletion.
  - Peer member approval triggers physical removal of the `Expense` document, recalculation of balances, audit logging, and Socket.IO broadcast.
  - Frontend Pending Deletion Approvals banner and modal on `Expenses.jsx` with instant real-time synchronization.
- **Strict Group Privacy & Authorization (Zero-Leakage Architecture):**
  - Gated all sensitive group endpoints behind `requireGroupMember` middleware: non-members and unauthenticated requests are strictly rejected with HTTP 401/403.
  - Sensitive data strictly restricted to enrolled members: balances, minimal debt transfers, expenses, settlements, chat messages, activity feeds, and financial reports.
  - Unauthenticated guests receive an empty group list (`[]`) from `GET /api/groups` instead of database leaks, completely preventing guest eavesdropping.
  - Safe `GET /api/groups/:id/invite` preview endpoint returns only room name, description, and member count for joiners without exposing private financial balances or expenses.
  - Frontend privacy gates installed across `Home`, `Expenses`, `Members`, `Settlements`, `Reports`, `Chat`, and `Activity` to display clean login welcome screens when unauthenticated.
  - 48/48 automated unit, security, privacy, and integrity tests passing.
- **System Chat Notifications for Payments & Settlements:**
  - `postSystemChatMessage()` helper added to `backend/src/socket.js`: creates a persisted `ChatMessage` with `isSystem: true` and broadcasts it as `new-message` to the group room.
  - Automatic system messages posted in group chat when: expense added (💸), direct settlement recorded (✅), settlement request created (💳), settlement request approved (✅), settlement request rejected (❌).
  - Messages appear in the Chat tab in the existing styled pill format with no frontend changes required.
  - `settlements.js` also gains `createAndBroadcastNotification` and `recordAuditLog` coverage (previously missing).
  - Documented feature in `README.md` with interactive UI mockup image (`assets/screenshots/chat-notifications.png`) and architecture diagram (`assets/diagrams/chat-notifications.svg`).
  - 50/50 automated unit, security, privacy, and integrity tests passing.

- **Full-Stack Production Audit & Performance Optimization:**
  - **Frontend Bundle & Code Splitting:** Replaced monolithic bundle (713.98 kB JS raw, 198 kB gzipped) with route-based `React.lazy()` and Rollup `manualChunks`. Initial entry JS bundle dropped to **62.54 kB** (15.04 kB gzipped), a **91.2% reduction**. Isolated heavy Recharts (224 kB) into `vendor-charts`, loaded exclusively on `/reports`.
  - **Suspense & Error Boundaries:** Wrapped all routes in `<Suspense fallback={<RouteLoadingSkeleton />}>` and custom `<ErrorBoundary>` to eliminate layout shift and white-screen failures. Added custom, accessible `<NotFound>` 404 page.
  - **Backend API & Network Compression:** Installed `compression` (gzip) and `helmet` security headers on Express server. Projected minimal fields in MongoDB queries (`.select('payments shares')`, `.select('from to amount')`), reducing payload weight and serialization overhead.
  - **Database Index Optimization:** Added compound indexes to `Expense` (`{ groupId: 1, date: -1, createdAt: -1 }`), `Settlement` (`{ groupId: 1, date: -1 }`), and `Group` (`{ ownerId: 1, createdAt: -1 }`, `{ 'members.userId': 1 }`, `{ 'members.email': 1 }`). Reused `req.group` from `requireGroupMember` middleware to eliminate duplicate `findById` database queries.
  - **SEO & Search Indexing:** Generated `robots.txt` and `sitemap.xml` in `/public`. Embedded OpenGraph tags, Twitter cards, canonical link, theme color, and JSON-LD structured data (`WebSite`, `SoftwareApplication`, `Organization`). Added dynamic `<SEO>` head updates per route.
  - **Render Cold-Start UX:** Added background `/api/health` warm-up check with sleek top indicator when Render free tier instance takes >2.8s to spin up.
  - **Accessibility (WCAG AA):** Adjusted text tokens for contrast compliance, added skip-to-content anchor, visible focus rings, skeleton shimmer loaders, and accessible ARIA labels on all navigation elements.
  - 50/50 automated unit, security, and integrity tests passing.

## In progress
- Production verification on live deployments (https://groupspend.vercel.app and https://groupspend.onrender.com)

## Next action
- Deploy and verify live Lighthouse scores on Vercel and Render environments.

