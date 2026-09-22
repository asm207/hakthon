import { useMemo } from 'react'

const COLORS = ['#6366f1', '#a855f7', '#10b981', '#f59e0b', '#ec4899', '#38bdf8']

/** A short one-off burst of confetti from the centre of its (relative) parent. */
export function Confetti({ count = 26 }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4
        const distance = 70 + Math.random() * 90
        return {
          x: `${Math.cos(angle) * distance}px`,
          y: `${Math.sin(angle) * distance - 30}px`,
          r: `${Math.random() * 540 - 270}deg`,
          color: COLORS[i % COLORS.length],
          delay: `${Math.random() * 0.12}s`,
          round: i % 3 === 0,
        }
      }),
    [count],
  )
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          className={`absolute h-2 animate-confetti ${p.round ? 'w-2 rounded-full' : 'w-1.5 rounded-[1px]'}`}
          style={{ backgroundColor: p.color, '--x': p.x, '--y': p.y, '--r': p.r, animationDelay: p.delay }}
        />
      ))}
    </div>
  )
}

const RESULT_PATHS = {
  check: 'M8 12.5l2.8 2.8L16.5 9.5',
  x: 'M9 9l6 6M15 9l-6 6',
  clock: 'M12 7.5V12l3 2',
  refund: 'M9.5 9.5L7 12l2.5 2.5M7 12h7a3 3 0 010 6h-1',
}

/** Result icon whose circle and symbol are drawn in with a stroke animation. */
export function DrawnIcon({ name, className = '' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" pathLength="1" strokeDasharray="1" strokeDashoffset="1"
        className="animate-draw" style={{ animationDelay: '0s' }} />
      <path d={RESULT_PATHS[name]} pathLength="1" strokeDasharray="1" strokeDashoffset="1" className="animate-draw"
        style={{ animationDelay: '0.35s' }} />
    </svg>
  )
}
