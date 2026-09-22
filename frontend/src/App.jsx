import { useCallback, useEffect, useRef, useState } from 'react'
import { API_ORIGIN, apiRequest, newIdempotencyKey, newReference, setApiKey } from './api/client.js'
import { clearSession, loadSession, saveSession } from './api/session.js'
import AccountMenu from './components/AccountMenu.jsx'
import AuthScreen from './components/AuthScreen.jsx'
import Icon, { Logo } from './components/icons.jsx'
import MerchantStore from './components/MerchantStore.jsx'
import SandboxConsole from './components/SandboxConsole.jsx'

const FINAL_STATUSES = new Set(['success', 'failed', 'timeout', 'refunded'])
const POLL_INTERVAL_MS = 1000

const newOrder = () => ({ reference: newReference(), idempotencyKey: newIdempotencyKey() })

export default function App() {
  // undefined = still checking the saved session, null = signed out
  const [session, setSession] = useState(undefined)

  // Restore the saved session and make sure its key is still valid.
  useEffect(() => {
    const saved = loadSession()
    if (!saved?.apiKey) return setSession(null)
    setApiKey(saved.apiKey)
    apiRequest('GET', '/api/v1/auth/me').then((res) => {
      if (res.ok) setSession({ ...saved, merchant: res.data })
      else if (res.status === 401) { clearSession(); setApiKey(''); setSession(null) }
      else setSession(saved) // server unreachable: keep the session, errors will show in the console
    })
  }, [])

  const signIn = (next) => {
    setApiKey(next.apiKey)
    saveSession(next)
    setSession(next)
  }

  const signOut = () => {
    clearSession()
    setApiKey('')
    setSession(null)
  }

  if (session === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-indigo-400" />
      </div>
    )
  }
  if (session === null) return <AuthScreen onAuthenticated={signIn} />
  return <Dashboard key={session.merchant.id} session={session} onSignOut={signOut} />
}

function Dashboard({ session, onSignOut }) {
  const [mode, setMode] = useState('force_success')
  const [payment, setPayment] = useState(null)
  const [log, setLog] = useState([])
  const [busy, setBusy] = useState(false)
  const [refunding, setRefunding] = useState(false)
  // One Idempotency-Key per checkout attempt: clicking "Pay" twice can never charge twice.
  const order = useRef(newOrder())

  const addLog = useCallback((entry) => {
    setLog((prev) => [{ ...entry, id: crypto.randomUUID() }, ...prev].slice(0, 50))
  }, [])

  const call = useCallback(async (method, path, options) => {
    const res = await apiRequest(method, path, options)
    addLog(res)
    return res
  }, [addLog])

  // Poll GET /payments/{id} until the payment reaches a final status. Only status changes are logged.
  useEffect(() => {
    if (!payment || FINAL_STATUSES.has(payment.status)) return
    const timer = setTimeout(async () => {
      const res = await apiRequest('GET', `/api/v1/payments/${payment.id}`)
      if (!res.ok) return addLog(res)
      if (res.data.status !== payment.status) addLog(res)
      setPayment(res.data)
    }, POLL_INTERVAL_MS)
    return () => clearTimeout(timer)
  }, [payment, addLog])

  const pay = async () => {
    setBusy(true)
    const res = await call('POST', '/api/v1/payments', {
      body: { amount: '100.00', currency: 'LYD', reference: order.current.reference, simulation_mode: mode },
      idempotencyKey: order.current.idempotencyKey,
    })
    if (res.ok) setPayment(res.data)
    setBusy(false)
  }

  const retry = async () => {
    order.current = newOrder()
    setPayment(null)
  }

  const refund = async () => {
    setRefunding(true)
    const res = await call('POST', `/api/v1/payments/${payment.id}/refund`, { idempotencyKey: newIdempotencyKey() })
    if (res.ok) setPayment(res.data)
    setRefunding(false)
  }

  const secure = API_ORIGIN.startsWith('https://')

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 lg:h-screen">
      <nav className="relative z-20 shrink-0 bg-slate-950/90 backdrop-blur">
        <div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <Logo className="h-7 w-7" />
            <span className="text-[15px] font-bold tracking-tight text-white">PaySim</span>
            <span className="rounded-md bg-amber-400/15 px-2 py-0.5 text-[11px] font-semibold text-amber-300 ring-1 ring-inset ring-amber-400/25">
              Sandbox
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className={`hidden items-center gap-1.5 font-mono md:flex ${secure ? 'text-emerald-400' : 'text-amber-400'}`}
              title={secure ? 'Encrypted connection (TLS)' : 'Plain HTTP (local preview only)'}>
              <Icon name={secure ? 'lock' : 'shield'} className="h-3.5 w-3.5" />
              {API_ORIGIN.replace(/^https?:\/\//, '')}
            </span>
            <a href={`${API_ORIGIN}/docs`} target="_blank" rel="noreferrer"
              className="rounded-lg px-2.5 py-1.5 font-semibold text-slate-300 ring-1 ring-white/10 transition hover:bg-white/5 hover:text-white">
              API docs
            </a>
            <AccountMenu session={session} onSignOut={onSignOut} />
          </div>
        </div>
        <div className="gradient-line h-px w-full" />
      </nav>

      <div className="grid flex-1 lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
        <MerchantStore payment={payment} busy={busy} onPay={pay} onRetry={retry} onNewOrder={retry} />
        <SandboxConsole
          mode={mode}
          onModeChange={setMode}
          payment={payment}
          onRefund={refund}
          refunding={refunding}
          log={log}
          call={call}
          onCreated={setPayment}
        />
      </div>
    </div>
  )
}
