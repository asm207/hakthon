// Every call to the PaySim API goes through here. Adds the Bearer key and Idempotency-Key headers
// and returns a log entry (request + response) that the Sandbox Console can display.

// Empty = same origin (the deployed backend serves this UI itself).
export const BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
export const API_ORIGIN = BASE_URL || window.location.origin
const API_KEY = import.meta.env.VITE_PAYSIM_API_KEY || ''

export const hasApiKey = Boolean(API_KEY)

function maskKey(key) {
  return key ? `Bearer ${key.slice(0, 8)}••••${key.slice(-4)}` : '(none)'
}

/**
 * @param {string} method
 * @param {string} path
 * @param {{ body?: any, idempotencyKey?: string }} [options]
 */
export async function apiRequest(method, path, { body, idempotencyKey } = {}) {
  const headers = { Authorization: `Bearer ${API_KEY}` }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey

  const request = {
    method,
    path,
    headers: { ...headers, Authorization: maskKey(API_KEY) },
    body: body ?? null,
  }
  const started = performance.now()
  try {
    const res = await fetch(BASE_URL + path, {
      method,
      headers,
      body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
    })
    const data = await res.json().catch(() => null)
    return {
      ok: res.ok,
      status: res.status,
      data,
      replayed: res.headers.get('Idempotent-Replayed') === 'true',
      ms: Math.round(performance.now() - started),
      request,
    }
  } catch (err) {
    return {
      ok: false,
      status: 0,
      data: { error: { code: 'NETWORK_ERROR', message: `Could not reach ${API_ORIGIN}: ${err.message}` } },
      replayed: false,
      ms: Math.round(performance.now() - started),
      request,
    }
  }
}

export const newIdempotencyKey = () => crypto.randomUUID()
export const newReference = () => `ORDER-${Math.floor(1000 + Math.random() * 9000)}`
