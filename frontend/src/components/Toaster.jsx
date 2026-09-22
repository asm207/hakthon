import Icon from './icons.jsx'

const TONES = {
  success: { icon: 'check', ring: 'bg-emerald-400/15 text-emerald-300' },
  error: { icon: 'x', ring: 'bg-rose-400/15 text-rose-300' },
  warning: { icon: 'clock', ring: 'bg-orange-400/15 text-orange-300' },
  info: { icon: 'refund', ring: 'bg-white/10 text-white' },
}

/** Small notifications in the bottom-right corner. */
export default function Toaster({ toasts, onDismiss }) {
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2" aria-live="polite">
      {toasts.map((t) => {
        const tone = TONES[t.tone] ?? TONES.info
        return (
          <div key={t.id}
            className="toast-in pointer-events-auto flex items-start gap-3 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/95 p-3.5 shadow-2xl shadow-black/50 backdrop-blur-xl">
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tone.ring}`}>
              <Icon name={tone.icon} className="h-4 w-4" strokeWidth={2.4} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">{t.title}</p>
              {t.text && <p className="truncate text-xs text-zinc-400">{t.text}</p>}
            </div>
            <button onClick={() => onDismiss(t.id)} className="rounded-md p-1 text-zinc-500 hover:bg-white/10 hover:text-white" aria-label="Dismiss">
              <Icon name="x" className="h-3.5 w-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
