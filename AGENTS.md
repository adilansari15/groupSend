# AGENTS.md

Instructions for AI coding agents working on GroupSpend Web.

## Read first
1. `projectContext.md` for background and decisions
2. `projectStatus.md` for the current state
3. `projectPlan.md` for the next task
4. `project.md` for requirements

## Rules
- Stack: React (Vite) + Express + MongoDB (Mongoose). Do not add other frameworks without recording it in `docs/DECISIONS.md`.
- Store money as integer paise. Convert to rupees only in the UI.
- Settlement logic lives in `backend/src/settlement.js` as pure functions. Any change needs a test case from `projectTest.md`.
- Validate every request body; never trust client-calculated balances.
- Never commit `.env` or secrets. Add new variables to `.env.example`.
- Keep UI copy in sentence case; buttons name the action ("Settle now").
- Keep changes small; one feature or fix per commit.

## After every task
- Update `projectStatus.md` (done / next).
- Tick completed items in `projectPlan.md` and `projectTest.md`.
- Log non-obvious choices in `docs/DECISIONS.md`.

## Commands
- Setup: `bash scripts/setup.sh`
- Seed demo data: `cd backend && node ../scripts/seed.js`
- Backend: `cd backend && npm run dev`
- Frontend: `cd frontend && npm run dev`
- Tests: `cd backend && npm test`
