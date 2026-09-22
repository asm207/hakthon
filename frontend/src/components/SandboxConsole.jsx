import { useState } from 'react'
import { newIdempotencyKey, newReference } from '../api/client.js'
import { AuditSummary } from './AiAssistant.jsx'
import { Aurora } from './effects.jsx'
import Icon from './icons.jsx'
import RequestLog from './RequestLog.jsx'
import QuickStart from './QuickStart.jsx'
import SmokeTestPanel from './SmokeTestPanel.jsx'
import StatsBar from './StatsBar.jsx'
import StatusBadge, { STATUS_STYLES } from './StatusBadge.jsx'
import { Card } from './ui.jsx'

const MODES = [
  { value: 'force_success', label: 'force_success', hint: '→ success' },
  { value: 'force_failure', label: 'force_failure', hint: '→ failed' },
  { value: 'force_timeout', label: 'force_timeout', hint: '→ timeout' },
]

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

const Field = ({ label, children, mono }) => (
  <div className="rounded-lg bg-white/[0.03] px-3 py-2 ring-1 ring-white/[0.06]">
    <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
    <p className={`truncate text-sm text-zinc-100 ${mono ? 'font-mono text-xs leading-5' : 'font-semibold'}`}>{children}</p>
  </div>
)

function TransactionCard({ payment, onRefund, refunding }) {
  if (!payment) {
    return (
      <Card icon="list" title="Current transaction" subtitle="Live view of GET /api/v1/payments/{id}" delay={0.05}>
        <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-zinc-500">
          Click <span className="font-semibold text-zinc-300">Pay with PaySim</span> in the store to create a transaction.
        </div>
      </Card>
    )
  }
  return (
    <Card
      icon="list"
      title="Current transaction"
      subtitle={<span className="font-mono">{payment.id}</span>}
      delay={0.05}
      action={<StatusBadge status={payment.status} size="lg" />}
    >
      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Field label="Amount">{payment.amount} {payment.currency}</Field>
        <Field label="Reference" mono>{payment.reference}</Field>
        <Field label="Mode" mono>{payment.simulation_mode}</Field>
        <Field label="Updated" mono>{formatTime(payment.updated_at)}</Field>
      </div>

      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">State history · audit log</p>
      <ol className="relative mb-5 space-y-3 pl-5 before:absolute before:bottom-1.5 before:left-[5px] before:top-1.5 before:w-px before:bg-zinc-700">
        {payment.history.map((h, i) => (
          <li key={i} className="relative flex animate-slide-in flex-wrap items-baseline gap-x-2 text-xs">
            <span className={`absolute -left-5 top-1 h-[11px] w-[11px] rounded-full ring-4 ring-zinc-900 ${STATUS_STYLES[h.to_status]?.dot ?? 'bg-zinc-500'}`} />
            <span className="font-mono tabular-nums text-zinc-500">{formatTime(h.at)}</span>
            <span className="font-mono text-zinc-200">{h.from_status ?? '∅'} → {h.to_status}</span>
            <span className="text-zinc-500">{h.event}</span>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-start gap-3 border-t border-white/[0.06] pt-4">
        <button
          onClick={onRefund}
          disabled={refunding || payment.status !== 'success'}
          title={payment.status !== 'success' ? 'Refunds are only allowed for successful payments' : ''}
          className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500 disabled:shadow-none"
        >
          <Icon name="refund" className="h-3.5 w-3.5" />
          {refunding ? 'Refunding…' : 'Request Refund'}
        </button>
        <div className="min-w-0 flex-1"><AuditSummary key={payment.id + payment.status} paymentId={payment.id} /></div>
      </div>
    </Card>
  )
}

/** Hand-written request to POST /api/v1/payments, so developers can test (and break) the payload. */
function RequestPlayground({ call, mode, onCreated }) {
  const [text, setText] = useState(() => JSON.stringify({ amount: '100.00', currency: 'LYD', reference: newReference() }, null, 2))
  const [withKey, setWithKey] = useState(true)
  const [sending, setSending] = useState(false)

  const send = async () => {
    setSending(true)
    let body = text
    try {
      body = { simulation_mode: mode, ...JSON.parse(text) }
    } catch {
      // send the raw text so the API (and the AI assistant) can report the malformed JSON
    }
    const res = await call('POST', '/api/v1/payments', { body, idempotencyKey: withKey ? newIdempotencyKey() : undefined })
    if (res.ok) onCreated(res.data)
    setSending(false)
  }

  return (
    <Card icon="terminal" title="Request playground" subtitle={<span className="font-mono">POST /api/v1/payments</span>} delay={0.2}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        spellCheck={false}
        className="console-scroll w-full resize-none rounded-lg border border-white/10 bg-zinc-950 p-3 font-mono text-xs leading-relaxed text-zinc-100 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/10"
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-400">
          <input type="checkbox" checked={withKey} onChange={(e) => setWithKey(e.target.checked)} className="h-3.5 w-3.5 accent-white" />
          Send <span className="font-mono text-zinc-300">Idempotency-Key</span>
        </label>
        <button onClick={send} disabled={sending} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-zinc-950 shadow-lg shadow-black/30 transition hover:bg-zinc-200 disabled:opacity-60">
          <Icon name="send" className="h-3.5 w-3.5" />
          {sending ? 'Sending…' : 'Send request'}
        </button>
      </div>
    </Card>
  )
}

export default function SandboxConsole({ mode, onModeChange, payment, onRefund, refunding, log, call, onCreated, statuses, apiKey, notify }) {
  return (
    <section className="console-scroll relative bg-zinc-950 px-4 py-8 text-zinc-100 sm:px-8 lg:overflow-y-auto">
      <Aurora tone="dark" />
      <div className="relative mx-auto max-w-4xl space-y-5">
        <header className="flex animate-fade-up flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">Developer</p>
            <h2 className="text-xl font-bold">Sandbox Console</h2>
          </div>
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Simulation mode</p>
            <div className="relative">
              <select
                value={mode}
                onChange={(e) => onModeChange(e.target.value)}
                aria-label="Simulation mode"
                className="appearance-none rounded-lg border border-white/10 bg-zinc-900 py-2 pl-3 pr-9 font-mono text-xs text-zinc-100 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/10"
              >
                {MODES.map((m) => <option key={m.value} value={m.value}>{m.label} {m.hint}</option>)}
              </select>
              <Icon name="chevron" className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
            </div>
          </div>
        </header>

        <StatsBar statuses={statuses} />

        <TransactionCard payment={payment} onRefund={onRefund} refunding={refunding} />

        <div className="grid gap-5 2xl:grid-cols-2">
          <SmokeTestPanel call={call} notify={notify} />
          <RequestPlayground call={call} mode={mode} onCreated={onCreated} />
        </div>

        <QuickStart apiKey={apiKey} />

        <Card icon="list" title="Request log" subtitle="Every call the UI made, newest first. Failed calls can be explained by Gemini." delay={0.28}>
          <RequestLog log={log} />
        </Card>
      </div>
    </section>
  )
}
