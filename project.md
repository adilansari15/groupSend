# GroupSpend Web

A web version of the GroupSpend Android app: shared expense management for students, friends and roommates.

## Objective
Record shared expenses, track who paid what, calculate each member's share, and show the fewest payments needed to settle up, with reports by day, week and month.

## Features
| Area | What it does |
|---|---|
| Groups | Create, switch and delete groups, each with a name, description and members |
| Expenses | Title, amount, category, date, payer(s), notes; equal or custom split |
| Balances | Net balance per member (paid minus share) |
| Settlements | Minimal "who pays whom" transfers; "Settle now" records a payment |
| Reports | Daily / Weekly / Monthly totals, category donut chart, expense list |
| Home | Group spend, pending settlements, today/week/month totals, recent expenses |

## Tech stack (target)
- **Frontend:** React (Vite), React Router, Zustand or Context, Recharts for the donut chart
- **Backend:** Node.js, Express
- **Database:** MongoDB with Mongoose
- **Auth:** JWT (access token in httpOnly cookie)
- **Realtime (phase 2):** Socket.io
- **Deploy:** Vercel (frontend), Render (API), MongoDB Atlas

## Data model
- **User**: name, email, passwordHash
- **Group**: name, description, ownerId, members[{ _id, name, userId? }]
- **Expense**: groupId, title, amount, category, date, notes, payments[{ memberId, amount }], shares[{ memberId, amount }]
- **Settlement**: groupId, fromMemberId, toMemberId, amount, date

Store money as integer paise to avoid floating point errors.

## Core algorithm
1. `net[m] = sum(paid by m) - sum(share of m)`, then adjust for recorded settlements (`from` gains, `to` loses).
2. Split members into debtors (net < 0) and creditors (net > 0).
3. Repeatedly match the largest debtor with the largest creditor, transferring `min(debt, credit)`.

## API (draft)
```
POST   /api/auth/register | /login | /logout
GET    /api/groups                 POST /api/groups
GET    /api/groups/:id             DELETE /api/groups/:id
POST   /api/groups/:id/members
GET    /api/groups/:id/expenses    POST /api/groups/:id/expenses
DELETE /api/expenses/:id
GET    /api/groups/:id/balances    (net balance per member)
GET    /api/groups/:id/transfers   (minimal settlement list)
POST   /api/groups/:id/settlements
GET    /api/groups/:id/reports?period=daily|weekly|monthly
```

## Folder structure
```
root/
  AGENTS.md  project*.md  README.md  .env.example
  frontend/   React (Vite) app: src/, public/
  backend/    Express API: src/, controllers/, routes/, models/, middleware/, config/
  docs/       API, DATABASE, DEPLOYMENT, ARCHITECTURE, DECISIONS
  prompts/    reusable AI prompts
  scripts/    setup.sh, seed.js
  assets/     screenshots/, diagrams/
```
