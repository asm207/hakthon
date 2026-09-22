import { useState } from 'react'
import Icon from './icons.jsx'
import { Card } from './ui.jsx'

const STEP_NAMES = ['Create payment', 'Idempotency replay', 'Query payment', 'Force outcome (success)', 'Refund payment']
const REVEAL_DELAY_MS = 350

function StepIcon({ status }) {
  if (status === 'passed') return <span className="flex h-6 w-6 animate-pop items-center justify-center rounded-full bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/40"><Icon name="check" className="h-3.5 w-3.5" strokeWidth={3} /></span>
  if (status === 'failed') return <span className="flex h-6 w-6 animate-pop items-center justify-center rounded-full bg-rose-500 text-white"><Icon name="x" className="h-3.5 w-3.5" strokeWidth={3} /></span>
  if (status === 'running') return <span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-700 border-t-emerald-400" />
  return <span className="h-6 w-6 rounded-full border-2 border-dashed border-slate-700" />
}

/** One click runs POST /api/v1/sandbox/smoke-test; results are revealed step by step. */
export default function SmokeTestPanel({ call, notify }) {
  const [running, setRunning] = useState(false)
  const [steps, setSteps] = useState(STEP_NAMES.map((name) => ({ name, status: 'idle' })))
  const [summary, setSummary] = useState(null)
  const done = steps.filter((s) => s.status === 'passed').length

  const run = async () => {
    setRunning(true)
    setSummary(null)
    setSteps(STEP_NAMES.map((name) => ({ name, status: 'running' })))
    const res = await call('POST', '/api/v1/sandbox/smoke-test')

    if (!res.ok) {
      setSteps(STEP_NAMES.map((name) => ({ name, status: 'idle' })))
      setSummary({ passed: false, text: res.data?.error?.message || `Request failed (${res.status})` })
      notify?.({ tone: 'error', title: 'Smoke test could not run', text: res.data?.error?.message })
      setRunning(false)
      return
    }
    const result = res.data
    for (let i = 0; i < result.steps.length; i++) {
      await new Promise((r) => setTimeout(r, REVEAL_DELAY_MS))
      setSteps((prev) => prev.map((s, j) => (j === i ? result.steps[i] : s)))
    }
    notify?.(result.passed
      ? { tone: 'success', title: 'Smoke test passed', text: `${result.steps.length}/${result.steps.length} steps in ${(result.total_ms / 1000).toFixed(1)} s` }
      : { tone: 'error', title: 'Smoke test failed', text: result.steps.find((s) => s.status === 'failed')?.name })
    setSummary({
      passed: result.passed,
      text: result.passed ? `All ${result.steps.length} steps passed in ${(result.total_ms / 1000).toFixed(1)} s` : 'Smoke test failed',
    })
    setRunning(false)
  }

  return (
    <Card
      icon="beaker"
      title="Automated Smoke Test"
      subtitle="Full lifecycle, end to end"
      delay={0.12}
      action={
        <button
          onClick={run}
          disabled={running}
          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-950 shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-400 disabled:cursor-wait disabled:opacity-70"
        >
          <Icon name="play" className="h-3.5 w-3.5" />
          {running ? 'Running…' : 'Run Smoke Test'}
        </button>
      }
    >
      <div className="mb-4 h-1 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-300 shadow-[0_0_12px_rgb(16_185_129/0.7)] transition-all duration-500 ease-out" style={{ width: `${(done / STEP_NAMES.length) * 100}%` }} />
      </div>
      <ol className="space-y-3">
        {steps.map((step) => (
          <li key={step.name} className="flex items-start gap-3 transition-opacity">
            <StepIcon status={step.status} />
            <div className="min-w-0 flex-1">
              <div className="flex justify-between gap-2 text-sm">
                <span className={step.status === 'idle' ? 'text-slate-500' : 'font-medium text-slate-100'}>{step.name}</span>
                {step.duration_ms !== undefined && <span className="font-mono text-xs tabular-nums text-slate-500">{step.duration_ms} ms</span>}
              </div>
              {step.detail && <p className="truncate text-xs text-slate-500" title={step.detail}>{step.detail}</p>}
            </div>
          </li>
        ))}
      </ol>
      {summary && (
        <p className={`mt-4 flex animate-pop items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${
          summary.passed ? 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20' : 'bg-rose-500/10 text-rose-300 ring-1 ring-rose-500/20'}`}>
          <Icon name={summary.passed ? 'check' : 'x'} className="h-4 w-4" strokeWidth={2.5} />
          {summary.text}
        </p>
      )}
    </Card>
  )
}
