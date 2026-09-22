import { useState } from 'react'
import { DebugExplainer } from './AiAssistant.jsx'
import Icon from './icons.jsx'
import { JsonBlock } from './ui.jsx'

function statusStyle(status) {
  if (status >= 200 && status < 300) return 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20'
  if (status >= 400 && status < 500) return 'bg-amber-500/10 text-amber-400 ring-amber-500/20'
  return 'bg-rose-500/10 text-rose-400 ring-rose-500/20'
}

const METHOD_STYLE = { GET: 'text-sky-400', POST: 'text-violet-400' }

function Entry({ entry }) {
  const [open, setOpen] = useState(!entry.ok)
  return (
    <li className="animate-slide-in overflow-hidden rounded-xl border border-white/[0.06] bg-slate-950/40">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-xs transition hover:bg-white/[0.03]">
        <span className={`w-9 font-mono font-semibold ${METHOD_STYLE[entry.request.method] ?? 'text-slate-300'}`}>{entry.request.method}</span>
        <span className="min-w-0 flex-1 truncate font-mono text-slate-300">{entry.request.path}</span>
        {entry.replayed && <span className="rounded-md bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-sky-300">replayed</span>}
        <span className={`rounded-md px-1.5 py-0.5 font-mono text-[11px] font-semibold ring-1 ring-inset ${statusStyle(entry.status)}`}>{entry.status || 'ERR'}</span>
        <span className="w-14 text-right font-mono tabular-nums text-slate-500">{entry.ms} ms</span>
        <Icon name="chevron" className={`h-3.5 w-3.5 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="space-y-3 border-t border-white/[0.06] p-3">
          <div className="grid gap-3 xl:grid-cols-2">
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Request</p>
              <JsonBlock value={{ headers: entry.request.headers, body: entry.request.body }} />
            </div>
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Response</p>
              <JsonBlock value={entry.data} />
            </div>
          </div>
          {!entry.ok && <DebugExplainer entry={entry} />}
        </div>
      )}
    </li>
  )
}

export default function RequestLog({ log }) {
  if (log.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-slate-500">
        No requests yet. Pay from the store or send a request from the playground.
      </div>
    )
  }
  return (
    <ul className="space-y-2">
      {log.map((entry) => <Entry key={entry.id} entry={entry} />)}
    </ul>
  )
}
