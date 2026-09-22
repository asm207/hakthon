import { useMemo } from 'react'

const AURORA = {
  dark: ['bg-white/[0.13]', 'bg-zinc-400/20', 'bg-white/[0.09]', 'bg-zinc-300/15'],
  light: ['bg-zinc-400/40', 'bg-zinc-300/60', 'bg-zinc-500/25', 'bg-zinc-200/80'],
}

/** Floating light particles that rise slowly (clearly visible motion). */
function Particles({ count, tone }) {
  const dots = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        left: `${Math.random() * 100}%`,
        size: 2 + Math.random() * 3,
        duration: `${12 + Math.random() * 14}s`,
        delay: `${-Math.random() * 26}s`,
        drift: `${(Math.random() - 0.5) * 80}px`,
      })),
    [count],
  )
  const color = tone === 'dark' ? 'bg-white/70 shadow-[0_0_8px_rgb(255_255_255/0.7)]' : 'bg-zinc-900/30'
  return dots.map((d, i) => (
    <span
      key={i}
      className={`particle absolute bottom-0 rounded-full ${color}`}
      style={{ left: d.left, width: d.size, height: d.size, animationDuration: d.duration, animationDelay: d.delay, '--drift': d.drift }}
    />
  ))
}

/** Site-wide animated background: drifting aurora glows, rising particles and a moving dot grid. */
export function Aurora({ tone = 'dark', particles = 28 }) {
  const [a, b, c, d] = AURORA[tone]
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {tone === 'dark' && <div className="dot-grid dot-grid-drift absolute inset-0" />}
      <div className={`aurora-1 absolute -left-40 -top-40 h-[32rem] w-[32rem] rounded-full blur-3xl ${a}`} />
      <div className={`aurora-2 absolute -bottom-48 -right-40 h-[36rem] w-[36rem] rounded-full blur-3xl ${b}`} />
      <div className={`aurora-3 absolute left-1/3 top-1/3 h-80 w-80 rounded-full blur-3xl ${c}`} />
      <div className={`aurora-4 absolute right-1/4 top-0 h-64 w-64 rounded-full blur-3xl ${d}`} />
      <Particles count={particles} tone={tone} />
    </div>
  )
}

const COLORS = ['#18181b', '#52525b', '#a1a1aa', '#10b981', '#d4d4d8', '#27272a']

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
