import { Aurora, Confetti, DrawnIcon } from './effects.jsx'
import Icon from './icons.jsx'
import StatusBadge from './StatusBadge.jsx'

const RESULT = {
  success: { icon: 'check', title: 'Payment successful', text: 'Thank you! Order {ref} is confirmed.', color: 'text-emerald-600 bg-emerald-100', box: 'border-emerald-200 bg-emerald-50/70' },
  failed: { icon: 'x', title: 'Payment declined', text: 'Your payment could not be completed. No money was taken.', color: 'text-rose-600 bg-rose-100', box: 'border-rose-200 bg-rose-50/70' },
  timeout: { icon: 'clock', title: 'Payment timed out', text: 'The processor did not respond in time. It is safe to try again.', color: 'text-orange-600 bg-orange-100', box: 'border-orange-200 bg-orange-50/70' },
  refunded: { icon: 'refund', title: 'Order refunded', text: 'The full amount of 100.00 LYD was returned.', color: 'text-violet-600 bg-violet-100', box: 'border-violet-200 bg-violet-50/70' },
}

const FAIL_STEP = { failed: 'bg-rose-500 shadow-rose-500/30', timeout: 'bg-orange-500 shadow-orange-500/30' }

function Progress({ status }) {
  const final = ['success', 'failed', 'timeout', 'refunded'].includes(status)
  const steps = [
    { label: 'Created', done: true },
    { label: 'Processing', done: status !== 'pending', active: status === 'pending' },
    { label: final ? status[0].toUpperCase() + status.slice(1) : 'Result', done: final, active: status === 'processing' },
  ]
  return (
    <div className="flex items-start">
      {steps.map((step, i) => {
        const last = i === steps.length - 1
        const doneColor = last && FAIL_STEP[status] ? FAIL_STEP[status] : 'bg-indigo-600 shadow-indigo-600/30'
        return (
          <div key={i} className={`flex items-start ${last ? '' : 'flex-1'}`}>
            <div className="flex w-16 flex-col items-center gap-1.5">
              <span className={`flex h-9 w-9 items-center justify-center rounded-full transition-all duration-500 ${
                step.done ? `${doneColor} text-white shadow-lg` : step.active ? 'animate-pulse-ring bg-white text-indigo-600 ring-2 ring-indigo-500' : 'bg-slate-100 text-slate-400 ring-1 ring-slate-200'}`}>
                {step.done ? (
                  <span key="done" className="animate-pop">
                    <Icon name={last && FAIL_STEP[status] ? (status === 'failed' ? 'x' : 'clock') : 'check'} className="h-4 w-4" strokeWidth={2.6} />
                  </span>
                ) : step.active ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-current" />
                )}
              </span>
              <span className={`text-xs font-medium transition-colors ${step.done || step.active ? 'text-slate-900' : 'text-slate-400'}`}>{step.label}</span>
            </div>
            {!last && (
              <div className="mt-[18px] h-1 flex-1 overflow-hidden rounded-full bg-slate-200">
                <div className={`h-full rounded-full bg-gradient-to-r from-indigo-600 to-violet-500 transition-all duration-700 ease-out ${steps[i + 1].done ? 'w-full' : steps[i + 1].active ? 'w-1/2' : 'w-0'}`} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function MerchantStore({ payment, busy, onPay, onRetry, onNewOrder }) {
  const result = payment && RESULT[payment.status]

  return (
    <section className="relative overflow-hidden bg-slate-50 px-4 py-8 sm:px-8 lg:overflow-y-auto">
      <Aurora tone="light" />

      <div className="relative mx-auto w-full max-w-md">
        <div className="mb-6 flex animate-fade-up items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white shadow-lg shadow-slate-900/20">
            <Icon name="bag" className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-600">Merchant Store</p>
            <h1 className="text-lg font-bold leading-tight text-slate-900">Benghazi Tech Store</h1>
          </div>
        </div>

        <div className="animate-fade-up overflow-hidden rounded-3xl bg-white/90 shadow-2xl shadow-indigo-900/10 ring-1 ring-slate-200/80 backdrop-blur" style={{ animationDelay: '0.08s' }}>
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h2 className="font-semibold text-slate-900">Order summary</h2>
            <span className="text-xs text-slate-400">1 item</span>
          </div>

          <div className="space-y-4 px-6 py-5">
            <div className="flex items-center gap-4">
              <div className="shine relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/30">
                <svg viewBox="0 0 24 24" className="relative h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
                  <path d="M4 14v-2a8 8 0 0116 0v2" />
                  <rect x="3" y="14" width="4" height="6" rx="1.5" />
                  <rect x="17" y="14" width="4" height="6" rx="1.5" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900">Wireless Headphones</p>
                <p className="text-sm text-slate-500">Noise cancelling · Qty 1</p>
              </div>
              <p className="font-semibold tabular-nums text-slate-900">85.00</p>
            </div>

            <dl className="space-y-2 border-t border-dashed border-slate-200 pt-4 text-sm">
              <div className="flex justify-between text-slate-600"><dt>Subtotal</dt><dd className="tabular-nums">85.00 LYD</dd></div>
              <div className="flex justify-between text-slate-600">
                <dt className="flex items-center gap-1.5"><Icon name="truck" className="h-4 w-4" /> Delivery · Benghazi</dt>
                <dd className="tabular-nums">15.00 LYD</dd>
              </div>
              <div className="flex items-baseline justify-between pt-2 text-slate-900">
                <dt className="font-semibold">Total</dt>
                <dd className="text-xl font-extrabold tabular-nums">100.00 <span className="text-sm font-semibold text-slate-500">LYD</span></dd>
              </div>
            </dl>
          </div>

          <div className="border-t border-slate-100 bg-slate-50/80 px-6 py-5">
            {!payment && (
              <div key="checkout" className="animate-fade-up">
                <div className="mb-4 flex items-center gap-3 rounded-2xl border-2 border-indigo-500/70 bg-white px-4 py-3 shadow-sm">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full border-[5px] border-indigo-600" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">PaySim</p>
                    <p className="text-xs text-slate-500">Sandbox payment · no real funds</p>
                  </div>
                  <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold tracking-wide text-amber-800">TEST</span>
                </div>
                <button
                  onClick={onPay}
                  disabled={busy}
                  className="shine group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 py-4 font-semibold text-white shadow-xl shadow-indigo-600/30 transition duration-200 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-indigo-600/40 active:translate-y-0 active:scale-[0.99] disabled:cursor-wait disabled:opacity-80"
                >
                  {busy ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  ) : (
                    <Icon name="lock" className="h-4 w-4 transition-transform group-hover:scale-110" />
                  )}
                  <span className="relative">{busy ? 'Contacting PaySim…' : 'Pay 100.00 LYD with PaySim'}</span>
                </button>
              </div>
            )}

            {payment && (
              <div key={payment.id} className="animate-fade-up space-y-5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-slate-500">{payment.id}</span>
                  <StatusBadge status={payment.status} />
                </div>
                <Progress status={payment.status} />

                {result ? (
                  <div key={payment.status} className={`relative flex animate-pop gap-3 rounded-2xl border p-4 ${result.box}`}>
                    {payment.status === 'success' && <Confetti />}
                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${result.color}`}>
                      <DrawnIcon name={result.icon} className="h-7 w-7" />
                    </span>
                    <div>
                      <p className="font-semibold text-slate-900">{result.title}</p>
                      <p className="text-sm text-slate-600">{result.text.replace('{ref}', payment.reference)}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
                    <span className="flex gap-1" aria-hidden="true">
                      {[0, 1, 2].map((i) => (
                        <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-500" style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </span>
                    Waiting for the sandbox processor
                  </div>
                )}

                {(payment.status === 'failed' || payment.status === 'timeout') && (
                  <button onClick={onRetry} className="w-full animate-fade-up rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3 font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:-translate-y-0.5">
                    Try again
                  </button>
                )}
                {(payment.status === 'success' || payment.status === 'refunded') && (
                  <button onClick={onNewOrder} className="w-full animate-fade-up rounded-2xl border border-slate-300 bg-white py-3 font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-50">
                    Start a new order
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <p className="mt-5 flex animate-fade-up items-center justify-center gap-1.5 text-xs text-slate-500" style={{ animationDelay: '0.16s' }}>
          <Icon name="shield" className="h-4 w-4" />
          Sandbox environment · no real money moves and no bank is contacted
        </p>
      </div>
    </section>
  )
}
