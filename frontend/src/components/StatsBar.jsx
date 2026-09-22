import { useEffect, useRef, useState } from 'react'
import Icon from './icons.jsx'

/** Number that counts up/down smoothly when it changes. */
function CountUp({ value }) {
  const [shown, setShown] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    const start = performance.now()
    const a = from.current
    let raf
    const tick = (t) => {
      const k = Math.min(1, (t - start) / 600)
      setShown(Math.round(a + (value - a) * (1 - (1 - k) ** 3)))
      if (k < 1) raf = requestAnimationFrame(tick)
      else from.current = value
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return shown
}

/** Session statistics for the payments made from this console. */
export default function StatsBar({ statuses }) {
  const list = Object.values(statuses)
  const succeeded = list.filter((s) => s === 'success' || s === 'refunded').length
  const declined = list.filter((s) => s === 'failed' || s === 'timeout').length
  const refunded = list.filter((s) => s === 'refunded').length
  const finished = succeeded + declined
  const rate = finished ? Math.round((succeeded / finished) * 100) : 0

  const tiles = [
    { label: 'Payments', value: list.length, icon: 'list', tone: 'text-white bg-white/10' },
    { label: 'Succeeded', value: succeeded, icon: 'check', tone: 'text-emerald-300 bg-emerald-400/10' },
    { label: 'Declined / timed out', value: declined, icon: 'x', tone: 'text-rose-300 bg-rose-400/10' },
    { label: 'Refunded', value: refunded, icon: 'refund', tone: 'text-zinc-300 bg-white/10' },
  ]

  return (
    <div className="grid animate-fade-up grid-cols-2 gap-3 sm:grid-cols-5" style={{ animationDelay: '0.03s' }}>
      {tiles.map((t) => (
        <div key={t.label} className="rounded-2xl border border-white/[0.07] bg-zinc-900/70 p-3.5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${t.tone}`}>
              <Icon name={t.icon} className="h-3.5 w-3.5" strokeWidth={2.2} />
            </span>
            <span className="text-2xl font-bold tabular-nums text-white"><CountUp value={t.value} /></span>
          </div>
          <p className="mt-2 truncate text-[11px] font-medium text-zinc-400">{t.label}</p>
        </div>
      ))}
      <div className="col-span-2 rounded-2xl border border-white/[0.07] bg-zinc-900/70 p-3.5 backdrop-blur-sm sm:col-span-1">
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] font-medium text-zinc-400">Success rate</span>
          <span className="text-lg font-bold tabular-nums text-white"><CountUp value={rate} />%</span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800">
          <div className="h-full rounded-full bg-gradient-to-r from-zinc-500 to-white transition-all duration-700 ease-out"
            style={{ width: `${rate}%` }} />
        </div>
      </div>
    </div>
  )
}
