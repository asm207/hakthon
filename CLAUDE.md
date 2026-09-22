# PaySim Sandbox — project notes for Claude

Hackathon project: an isolated payment sandbox (REST API + demo UI) that simulates the full payment
lifecycle without real money. Built from the spec in `hakathon.pdf` (4-member team split: backend/state
machine, security/smoke test, frontend, Gemini/docs/pitch).

## Working with the user
- The user is a beginner. Explain in **Arabic** (simple, step by step); code, commits and docs stay in English.
- Commit/push only when asked or when continuing an approved deploy task. Never commit secrets.
- Design preferences they asked for: **monochrome black/white/zinc** (no purple, no blue — they feel "AI-generic"),
  keep only semantic status colors; animated background (aurora + rising particles); store is **Benghazi Tech Store**.

## Live / repos
- Live: https://paysim-sandbox.onrender.com (Render, free plan, auto-deploys on push to `main`)
- GitHub: https://github.com/asm207/hakthon (push works from here via cached Git Credential Manager login)
- Render: one Docker web service `paysim-sandbox` + free Postgres `paysim-db` (expires 30 days after creation).
  Env on Render: `DATABASE_URL`, `DEMO_API_KEY` (generated), `GEMINI_API_KEY`, `GEMINI_MODEL`.

## Stack & layout
- `backend/` FastAPI + SQLAlchemy + PostgreSQL (Python 3.14 locally, 3.13 in Docker), venv at `backend/.venv`
  - `app/state_machine.py` single transition table; `app/sandbox_engine.py` background simulation
  - `app/routers/` payments, sandbox (smoke-test), ai (Gemini), accounts (register/login/me)
  - `app/security/` Bearer auth (SHA-256 key hashes, `api_keys` table), idempotency, rate limit, scrypt passwords
  - `app/bootstrap.py` create_all + idempotent `ALTER TABLE ... IF NOT EXISTS` upgrades + demo merchant
  - `app/smoke/runner.py` shared by `scripts/smoke_test.py` (CLI) and `POST /api/v1/sandbox/smoke-test`
- `frontend/` React 19 + Vite 8 + Tailwind v4. Auth screen → dashboard (store left, console right).
  Session (API key + merchant) in localStorage `paysim.session`.
- `Dockerfile` builds the UI and serves it from FastAPI (`frontend/dist` mounted at `/`), `render.yaml` blueprint.
- `docs/` openapi.json (regenerate: `backend/scripts/export_openapi.py`), compliance.md, demo-script.md.

## Run locally
- Secrets live only in `backend/.env` and `frontend/.env.local` (git-ignored). Local demo key is in `frontend/.env.local`.
- API (HTTPS, needs certs in `certs/`): from `backend/`
  `.venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --ssl-certfile ..\certs\localhost.pem --ssl-keyfile ..\certs\localhost-key.pem`
- UI: from `frontend/` `npm run dev` → https://localhost:5173
- The user has NOT run `mkcert -install`, so browsers distrust the local cert. For previews use plain HTTP:
  API `$env:CORS_ORIGINS='http://localhost:5174'` + uvicorn on port 8001 (no SSL);
  UI `$env:PAYSIM_HTTP='1'; $env:PORT='5174'; $env:VITE_API_BASE_URL='http://127.0.0.1:8001'; npm run dev`.
- Smoke test: `.venv\Scripts\python scripts\smoke_test.py --base-url <url> --api-key <key> [--ca-file <mkcert rootCA.pem>]`

## Gotchas learned
- slowapi does not work with this FastAPI version (routes are `_IncludedRouter`), so rate limiting is our own
  middleware on the `limits` library: 60/min per API key, 10/min per IP for register/login.
- Gemini: `gemini-2.5-flash` is unavailable for new keys; default `gemini-flash-latest`, falls back to
  `gemini-flash-lite-latest` after retries (429/500/503/504). Responses can take 5–20 s; lite is ~1 s.
- Windows: temp paths from the scratchpad exceed MAX_PATH — copy scripts to `%LOCALAPPDATA%\Temp` before running.
- On Windows, use `127.0.0.1` not `localhost` for the API (IPv6 fallback adds ~2 s).
- `uvicorn --reload` sometimes stops reloading; restart the process if new routes 404/405.

## Status / next ideas
- Done: API + state machine, security, smoke test, Gemini, accounts, deploy, monochrome animated UI.
- Not done: pitch deck (Member 4 task) — offer to build it.
