export const STATUS_STYLES = {
  pending: { badge: 'bg-amber-400/15 text-amber-500 ring-amber-400/30', dot: 'bg-amber-400' },
  processing: { badge: 'bg-zinc-400/15 text-zinc-400 ring-zinc-400/30', dot: 'bg-zinc-300' },
  success: { badge: 'bg-emerald-400/15 text-emerald-500 ring-emerald-400/30', dot: 'bg-emerald-400' },
  failed: { badge: 'bg-rose-400/15 text-rose-500 ring-rose-400/30', dot: 'bg-rose-400' },
  timeout: { badge: 'bg-orange-400/15 text-orange-500 ring-orange-400/30', dot: 'bg-orange-400' },
  refunded: { badge: 'bg-zinc-500/15 text-zinc-500 ring-zinc-500/30', dot: 'bg-zinc-500' },
}

const FALLBACK = { badge: 'bg-zinc-400/15 text-zinc-500 ring-zinc-400/30', dot: 'bg-zinc-400' }

export default function StatusBadge({ status, size = 'sm' }) {
  const style = STATUS_STYLES[status] ?? FALLBACK
  const pulse = status === 'pending' || status === 'processing'
  return (
    <span key={status} className={`inline-flex animate-pop items-center gap-1.5 rounded-full font-semibold ring-1 ring-inset ${style.badge} ${
      size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2.5 py-0.5 text-xs'}`}>
      <span className="relative flex h-1.5 w-1.5">
        {pulse && <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${style.dot}`} />}
        <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${style.dot}`} />
      </span>
      {status}
    </span>
  )
}
