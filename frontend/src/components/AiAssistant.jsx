import { useState } from 'react'
import { apiRequest } from '../api/client.js'
import Icon from './icons.jsx'

function useAiCall() {
  const [state, setState] = useState({ loading: false, data: null, error: null })
  const run = async (method, path, body) => {
    setState({ loading: true, data: null, error: null })
    const res = await apiRequest(method, path, { body })
    setState(res.ok
      ? { loading: false, data: res.data, error: null }
      : { loading: false, data: null, error: res.data?.error?.message || `Request failed (${res.status})` })
  }
  return [state, run]
}

const AiButton = ({ onClick, loading, children }) => (
  <button
    onClick={onClick}
    disabled={loading}
    className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-fuchsia-600 to-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-fuchsia-900/30 transition hover:brightness-110 disabled:cursor-wait disabled:opacity-70"
  >
    {loading
      ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
      : <Icon name="sparkles" className="h-3.5 w-3.5" />}
    {loading ? 'Asking Gemini…' : children}
  </button>
)

const AiPanel = ({ children }) => (
  <div className="rounded-lg border border-fuchsia-500/25 bg-gradient-to-br from-fuchsia-500/10 to-violet-500/5 p-3">
    <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-fuchsia-300">
      <Icon name="sparkles" className="h-3.5 w-3.5" /> Gemini
    </p>
    {children}
  </div>
)

/** Sends a failed request/response pair to Gemini and shows the structured suggestion. */
export function DebugExplainer({ entry }) {
  const [{ loading, data, error }, run] = useAiCall()
  const explain = () =>
    run('POST', '/api/v1/ai/debug', {
      method: entry.request.method,
      path: entry.request.path,
      headers: entry.request.headers,
      body: entry.request.body,
      response_status: entry.status,
      response_body: entry.data,
    })

  return (
    <div className="space-y-2">
      <AiButton onClick={explain} loading={loading}>Explain with AI</AiButton>
      {error && <p className="text-xs text-rose-300">{error}</p>}
      {data && (
        <AiPanel>
          <dl className="space-y-2 text-xs leading-relaxed text-slate-200">
            <div><dt className="font-semibold text-white">Problem</dt><dd className="text-slate-300">{data.problem}</dd></div>
            <div><dt className="font-semibold text-white">Cause</dt><dd className="text-slate-300">{data.cause}</dd></div>
            <div><dt className="font-semibold text-white">Fix</dt><dd className="text-slate-300">{data.fix}</dd></div>
            {data.corrected_payload && (
              <div>
                <dt className="font-semibold text-white">Corrected payload</dt>
                <dd><pre className="mt-1 overflow-x-auto rounded-md bg-slate-950/80 p-2 font-mono text-[11px] text-emerald-300">{prettyJson(data.corrected_payload)}</pre></dd>
              </div>
            )}
          </dl>
        </AiPanel>
      )}
    </div>
  )
}

/** Plain-English audit summary of a transaction's ledger records. */
export function AuditSummary({ paymentId }) {
  const [{ loading, data, error }, run] = useAiCall()
  return (
    <div className="space-y-2">
      <AiButton onClick={() => run('POST', `/api/v1/ai/audit-summary/${paymentId}`)} loading={loading}>
        AI audit summary
      </AiButton>
      {error && <p className="text-xs text-rose-300">{error}</p>}
      {data && (
        <AiPanel>
          <p className="text-xs leading-relaxed text-slate-200">{data.summary}</p>
        </AiPanel>
      )}
    </div>
  )
}

function prettyJson(text) {
  try {
    return JSON.stringify(JSON.parse(text), null, 2)
  } catch {
    return text
  }
}
