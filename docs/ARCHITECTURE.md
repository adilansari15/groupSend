# Architecture
Browser (React) -> REST API (Express) -> MongoDB.

The server is the source of truth for balances: it derives them from expenses and settlements on every request through `backend/src/settlement.js`. The client never sends computed balances. Phase 4 adds Socket.io so group members see changes live.
