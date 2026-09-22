import { useState } from 'react'
import { apiRequest, DEMO_API_KEY, setApiKey } from '../api/client.js'
import { Aurora } from './effects.jsx'
import Icon, { Logo } from './icons.jsx'
import { CopyButton } from './ui.jsx'

const FEATURES = [
  { icon: 'shield', title: 'Secure by design', text: 'Bearer keys, idempotency, validation, rate limits and HTTPS.' },
  { icon: 'beaker', title: 'Controllable outcomes', text: 'Force success, failure or timeout and test every path.' },
  { icon: 'sparkles', title: 'AI assistant', text: 'Gemini explains failed requests and summarises transactions.' },
]

const LIFECYCLE = ['pending', 'processing', 'success', 'refunded']

function Field({ label, type = 'text', value, onChange, autoComplete, error, placeholder }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-300">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required
        className={`w-full rounded-xl border bg-slate-950/60 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 transition focus:outline-none focus:ring-2 ${
          error ? 'border-rose-500/60 focus:ring-rose-500/30' : 'border-white/10 focus:border-blue-400/60 focus:ring-blue-500/25'}`}
      />
      {error && <span className="mt-1 block text-xs text-rose-300">{error}</span>}
    </label>
  )
}

/** Sign up / sign in. On success shows the merchant's sandbox API key once, then opens the console. */
export default function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('register')
  const [form, setForm] = useState({ business_name: '', email: '', password: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [issued, setIssued] = useState(null) // { apiKey, merchant } waiting for "Continue"

  const set = (field) => (value) => setForm((f) => ({ ...f, [field]: value }))

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setFieldErrors({})
    const body = mode === 'register' ? form : { email: form.email, password: form.password }
    const res = await apiRequest('POST', `/api/v1/auth/${mode === 'register' ? 'register' : 'login'}`, { body })
    setBusy(false)
    if (res.ok) {
      setIssued({ apiKey: res.data.api_key, merchant: res.data.merchant })
      return
    }
    const err = res.data?.error
    setError(err?.message || `Request failed (${res.status})`)
    const fields = {}
    for (const f of err?.details?.fields ?? []) fields[f.field] = f.message
    setFieldErrors(fields)
  }

  const useDemo = async () => {
    setBusy(true)
    setError(null)
    setApiKey(DEMO_API_KEY)
    const res = await apiRequest('GET', '/api/v1/auth/me')
    setBusy(false)
    if (res.ok) onAuthenticated({ apiKey: DEMO_API_KEY, merchant: res.data, demo: true })
    else {
      setApiKey('')
      setError(res.data?.error?.message || 'The demo account is not available.')
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10">
      <Aurora tone="dark" />

      <div className="relative grid w-full max-w-5xl items-center gap-10 lg:grid-cols-2">
        {/* Pitch */}
        <div className="animate-fade-up text-white">
          <div className="mb-8 flex items-center gap-3">
            <Logo className="h-10 w-10" />
            <span className="text-2xl font-extrabold tracking-tight">PaySim</span>
            <span className="rounded-md bg-amber-400/15 px-2 py-0.5 text-xs font-semibold text-amber-300 ring-1 ring-inset ring-amber-400/25">Sandbox</span>
          </div>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Test payments
            <span className="block bg-gradient-to-r from-sky-300 via-cyan-300 to-emerald-300 bg-clip-text text-transparent">
              without real money.
            </span>
          </h1>
          <p className="mt-4 max-w-md text-slate-400">
            An isolated payment sandbox: simulate the full transaction lifecycle, break things on purpose, and fix them before going live.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-2 font-mono text-xs">
            {LIFECYCLE.map((s, i) => (
              <span key={s} className="flex items-center gap-2">
                <span className="animate-fade-up rounded-full bg-white/5 px-3 py-1 text-slate-200 ring-1 ring-white/10" style={{ animationDelay: `${0.3 + i * 0.25}s` }}>{s}</span>
                {i < LIFECYCLE.length - 1 && <span className="animate-fade-up text-slate-600" style={{ animationDelay: `${0.4 + i * 0.25}s` }}>→</span>}
              </span>
            ))}
          </div>

          <ul className="mt-8 hidden space-y-4 sm:block">
            {FEATURES.map((f, i) => (
              <li key={f.title} className="flex animate-fade-up gap-3" style={{ animationDelay: `${0.5 + i * 0.1}s` }}>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 text-blue-300 ring-1 ring-white/10">
                  <Icon name={f.icon} className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-100">{f.title}</p>
                  <p className="text-sm text-slate-400">{f.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Card */}
        <div className="animate-fade-up rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-8" style={{ animationDelay: '0.1s' }}>
          {issued ? (
            <div key="issued" className="animate-pop space-y-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30">
                <Icon name="check" className="h-6 w-6" strokeWidth={2.4} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Welcome, {issued.merchant.name}</h2>
                <p className="mt-1 text-sm text-slate-400">This is your sandbox API key. Copy it now: it is shown only once.</p>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950 p-3">
                <code className="min-w-0 flex-1 truncate font-mono text-sm text-emerald-300">{issued.apiKey}</code>
                <CopyButton text={issued.apiKey} />
              </div>
              <p className="text-xs leading-relaxed text-slate-500">
                Send it as <span className="font-mono text-slate-300">Authorization: Bearer &lt;key&gt;</span>, or paste it in
                API docs → <span className="font-semibold text-slate-300">Authorize</span>. Signing in again gives you a new key; old keys keep working.
              </p>
              <button
                onClick={() => onAuthenticated({ ...issued, demo: false })}
                className="shine relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 py-3 font-semibold text-white shadow-lg shadow-blue-900/40 transition hover:-translate-y-0.5"
              >
                Open the sandbox console
              </button>
            </div>
          ) : (
            <>
              <div className="relative mb-6 grid grid-cols-2 rounded-xl bg-slate-950/70 p-1 ring-1 ring-white/10">
                <span className={`absolute inset-y-1 w-[calc(50%-4px)] rounded-lg bg-white/10 transition-transform duration-300 ease-out ${mode === 'login' ? 'translate-x-[calc(100%+0px)]' : 'translate-x-0'}`} style={{ left: 4 }} />
                {[['register', 'Create account'], ['login', 'Sign in']].map(([m, label]) => (
                  <button key={m} type="button" onClick={() => { setMode(m); setError(null); setFieldErrors({}) }}
                    className={`relative rounded-lg py-2 text-sm font-semibold transition-colors ${mode === m ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                    {label}
                  </button>
                ))}
              </div>

              <form onSubmit={submit} className="space-y-4">
                {mode === 'register' && (
                  <Field label="Business name" value={form.business_name} onChange={set('business_name')}
                    autoComplete="organization" placeholder="Benghazi Tech Store" error={fieldErrors.business_name} />
                )}
                <Field label="Email" type="email" value={form.email} onChange={set('email')}
                  autoComplete="email" placeholder="you@example.com" error={fieldErrors.email} />
                <Field label="Password" type="password" value={form.password} onChange={set('password')}
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  placeholder={mode === 'register' ? 'At least 8 characters' : ''} error={fieldErrors.password} />

                {error && (
                  <p className="animate-pop rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300 ring-1 ring-rose-500/20">{error}</p>
                )}

                <button type="submit" disabled={busy}
                  className="shine relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 py-3 font-semibold text-white shadow-lg shadow-blue-900/40 transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-70">
                  {busy && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
                  {mode === 'register' ? 'Create account & get API key' : 'Sign in'}
                </button>
              </form>

              {DEMO_API_KEY && (
                <>
                  <div className="my-5 flex items-center gap-3 text-xs text-slate-500">
                    <span className="h-px flex-1 bg-white/10" /> or <span className="h-px flex-1 bg-white/10" />
                  </div>
                  <button onClick={useDemo} disabled={busy}
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10 disabled:opacity-60">
                    Try the demo account
                  </button>
                </>
              )}
              <p className="mt-5 text-center text-xs text-slate-500">Sandbox only · no real money, no bank connection</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
