# API
Base: `/api`. JSON in and out. Amounts in paise.

| Method | Path | Purpose | Status |
|---|---|---|---|
| GET | /health | Health check | done |
| GET | /groups | List groups | done |
| POST | /groups | Create group `{name, description, members[]}` | done |
| GET | /groups/:id | Get single group with members | done |
| DELETE | /groups/:id | Delete group + cascading cleanup | done |
| POST | /groups/:id/members | Add member `{name, userId?}` | done |
| GET | /groups/:id/balances | Net balance per member | done |
| GET | /groups/:id/transfers | Minimal settlement list | done |
| GET | /groups/:id/expenses | List group expenses | done |
| POST | /groups/:id/expenses | Add expense with payments & shares | done |
| DELETE | /expenses/:id | Delete expense | done |
| GET | /groups/:id/settlements | List recorded settlements | done |
| POST | /groups/:id/settlements | Record settlement `{from, to, amount, date?}` | done |
| GET | /groups/:id/reports?period= | Daily, weekly, monthly totals & breakdown | done |
| POST | /auth/register | Register `{name, email, password}` | done |
| POST | /auth/login | Login `{email, password}` | done |
| POST | /auth/logout | Logout | done |
| GET | /auth/me | Current authenticated user | done |
