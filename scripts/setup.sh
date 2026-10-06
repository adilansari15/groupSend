#!/usr/bin/env bash
set -e
[ -f .env ] || cp .env.example .env
(cd backend && npm install)
(cd frontend && npm install)
echo "Done. Edit .env, then run the backend and frontend dev servers."
