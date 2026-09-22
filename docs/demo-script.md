# PaySim Sandbox — 2-Minute Live Demo Script

**Before the judges arrive (5 min earlier):**
1. Start PostgreSQL (it runs as a Windows service), the backend and the frontend (see README).
2. Open `https://localhost:5173` in full screen. Keep a terminal ready in `backend/`.
3. Click "AI audit summary" once to check Gemini is responding (it can be slow when Google is busy).
4. Set Simulation mode to `force_success`.

| Time | Screen | What to say / do |
|---|---|---|
| 0:00–0:15 | Split screen | "Testing payments against real banks is risky and slow. PaySim is an isolated sandbox: the full payment lifecycle, with strong API security, and not a single real dinar." |
| 0:15–0:40 | Merchant Store | Click **Pay with PaySim** (100.00 LYD). Point at the stepper: *pending → processing → success*. "The merchant polls `GET /payments/{id}` and sees the status change live." |
| 0:40–0:55 | Sandbox Console | Point at the **state history** (audit log). Click **Request Refund** → status becomes `refunded`. "Only successful payments can be refunded; the state machine rejects anything else." |
| 0:55–1:10 | Console dropdown | Switch to `force_failure`, click **New order**, then **Pay** → *Payment declined*. "Developers can force success, failure or timeout to test their error handling deterministically." |
| 1:10–1:30 | Request playground | Untick **Send Idempotency-Key header**, change currency to `"lyd"`, click **Send request** → `400`. Click **Explain with AI**: Gemini explains the missing key and returns a corrected payload. |
| 1:30–1:50 | Smoke Test panel | Click **Run Smoke Test** → five green checkmarks in ~3 seconds: create, idempotency replay, query, forced success, refund. |
| 1:50–2:00 | — | "Bearer auth, idempotency, strict validation, rate limiting, HTTPS, a strict state machine and an automated smoke test: everything the track asks for." |

**Backup plan**
- If Gemini is slow: skip the AI step and show the `422`/`400` error response itself; mention the AI summary afterwards.
- If the UI misbehaves: run the CLI smoke test in the terminal:
  `.venv\Scripts\python scripts\smoke_test.py` (see README for the environment variables).
