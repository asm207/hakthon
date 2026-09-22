import { useEffect, useRef, useState } from 'react'
import { API_ORIGIN } from '../api/client.js'
import Icon from './icons.jsx'
import { CopyButton } from './ui.jsx'

/** Navbar account button: merchant info, the sandbox API key (reveal / copy) and sign out. */
export default function AccountMenu({ session, onSignOut }) {
  const [open, setOpen] = useState(false)
  const [reveal, setReveal] = useState(false)
  const ref = useRef(null)
  const { merchant, apiKey, demo } = session

  useEffect(() => {
    if (!open) return
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const esc = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc) }
  }, [open])

  const masked = `${apiKey.slice(0, 8)}${'•'.repeat(16)}${apiKey.slice(-4)}`

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} aria-expanded={open}
        className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 ring-1 ring-white/10 transition hover:bg-white/5">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-blue-500 to-sky-500 text-xs font-bold text-white">
          {merchant.name.slice(0, 1).toUpperCase()}
        </span>
        <span className="hidden max-w-[10rem] truncate text-xs font-semibold text-slate-200 sm:block">{merchant.name}</span>
        <Icon name="chevron" className={`h-3.5 w-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 animate-pop rounded-2xl border border-white/10 bg-slate-900/95 p-4 shadow-2xl shadow-black/50 backdrop-blur-xl"
          style={{ transformOrigin: 'top right' }}>
          <p className="text-sm font-semibold text-white">{merchant.name}</p>
          <p className="text-xs text-slate-400">{demo ? 'Shared demo account' : merchant.email}</p>

          <div className="mt-4">
            <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              <Icon name="key" className="h-3.5 w-3.5" /> Sandbox API key
            </p>
            <div className="flex items-center gap-1.5 rounded-lg bg-slate-950 p-2 ring-1 ring-white/10">
              <code className="min-w-0 flex-1 truncate font-mono text-[11px] text-emerald-300">{reveal ? apiKey : masked}</code>
              <button onClick={() => setReveal(!reveal)} title={reveal ? 'Hide' : 'Show'}
                className="rounded-md p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white">
                <Icon name="eye" className="h-3.5 w-3.5" />
              </button>
              <CopyButton text={apiKey} />
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
              Use it in <a href={`${API_ORIGIN}/docs`} target="_blank" rel="noreferrer" className="font-semibold text-sky-400 hover:underline">API docs</a> → Authorize,
              or send <span className="font-mono text-slate-400">Authorization: Bearer</span> from your own code.
            </p>
          </div>

          <button onClick={onSignOut}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/5 hover:text-white">
            <Icon name="logout" className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      )}
    </div>
  )
}
