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
  - Unit tests for OTP code generation & expiration logic (13/13 passing)

## In progress
- Ready for Phase 5: Ship (Production deployment to Render / Vercel + MongoDB Atlas)

## Next action
Deploy frontend on Vercel, backend on Render, connected to MongoDB Atlas.
