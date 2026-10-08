# GroupSpend Web: Project Plan

## Phase 0: Prototype (done)
- [x] Single-file HTML prototype with localStorage
- [x] Groups, members, expenses, equal/custom split, settlements, reports

## Phase 1: MERN foundation
- [x] Create repo with `frontend/` and `backend/`
- [x] Mongoose models: User, Group, Expense, Settlement
- [x] Settlement pure functions in `backend/src/settlement.js` (integer paise)
- [x] REST routes for groups, members, expenses, settlements, reports, auth
- [x] Unit tests for the settlement service and auth (12/12 passing)

## Phase 2: Frontend port
- [x] Vite + React + Router; pages: Home, Expenses, Reports, Members, Settlements
- [x] State store and API client
- [x] Add Expense form with live split preview
- [x] Donut chart (Recharts), period tabs
- [x] Responsive layout: sidebar on desktop, bottom nav on mobile

## Phase 3: Auth and multi-user
- [x] Register / login with JWT (AuthContext, AuthModal, password hashing, JWT storage)
- [x] Email verification via Nodemailer (6-digit OTP code & one-click link)
- [x] Invite members by link; link a member to a user account (InviteModal, JoinGroup page at `/join/:id`)
- [x] Permissions: optional/authenticated group association and member account linking

## Phase 4: Parity and extras
- [x] Multiple payers per expense (single vs multi-payer toggle with live split validation)
- [x] Notifications (live socket notification toasts on expense & settlement events)
- [x] Settings: currency formatting (INR), dark/light theme toggle with persistence
- [x] Export report to CSV / Print to PDF
- [x] Socket.io live updates across group rooms
- [ ] Optional PWA for offline use

## Phase 5: Ship
- [x] Deploy (Vercel + Render + Atlas), env config
- [x] Production audit and performance optimization (Route splitting, bundle optimization, SEO, A11y, DB indexes)
- [ ] README with screenshots and live link
- [ ] Add to resume and LinkedIn
