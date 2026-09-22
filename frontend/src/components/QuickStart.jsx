import { useState } from 'react'
import { API_ORIGIN } from '../api/client.js'
import { Card, CopyButton } from './ui.jsx'

const BODY = '{"amount": "100.00", "currency": "LYD", "reference": "ORDER-1001", "simulation_mode": "force_success"}'

function snippets(key) {
  return {
    cURL: `curl -X POST ${API_ORIGIN}/api/v1/payments \\
  -H "Authorization: Bearer ${key}" \\
  -H "Idempotency-Key: order-1001-attempt-1" \\
  -H "Content-Type: application/json" \\
  -d '${BODY}'`,
    JavaScript: `const res = await fetch("${API_ORIGIN}/api/v1/payments", {
  method: "POST",
  headers: {
    "Authorization": "Bearer ${key}",
    "Idempotency-Key": crypto.randomUUID(),
    "Content-Type": "application/json",
  },
  body: JSON.stringify(${BODY}),
});
const payment = await res.json(); // { id, status: "pending", ... }`,
    Python: `import uuid, requests

res = requests.post(
    "${API_ORIGIN}/api/v1/payments",
    headers={
        "Authorization": "Bearer ${key}",
        "Idempotency-Key": str(uuid.uuid4()),
    },
    json=${BODY},
)
payment = res.json()  # {"id": ..., "status": "pending", ...}`,
  }
}

/** Ready-to-run integration code using the merchant's own sandbox key. */
export default function QuickStart({ apiKey }) {
  const [lang, setLang] = useState('cURL')
  const masked = `${apiKey.slice(0, 8)}••••${apiKey.slice(-4)}`
  const shown = snippets(masked)[lang]
  const real = snippets(apiKey)[lang]

  return (
    <Card icon="terminal" title="Quick start" subtitle="Create your first payment from your own code" delay={0.24}
      action={<CopyButton text={real} />}>
      <div className="mb-3 flex gap-1 rounded-lg bg-zinc-950/70 p-1 ring-1 ring-white/10">
        {Object.keys(snippets('')).map((l) => (
          <button key={l} onClick={() => setLang(l)}
            className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition ${lang === l ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}>
            {l}
          </button>
        ))}
      </div>
      <pre key={lang} className="console-scroll animate-fade-up overflow-x-auto rounded-lg bg-zinc-950 p-3 font-mono text-[11px] leading-relaxed text-zinc-200 ring-1 ring-white/5">
        {shown}
      </pre>
      <p className="mt-2 text-[11px] text-zinc-500">Copy includes your full API key. Keep it private.</p>
    </Card>
  )
}
