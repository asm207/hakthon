import Icon from './icons.jsx'

/** Dark console card with an optional icon, subtitle and header action. */
export function Card({ icon, title, subtitle, action, children, className = '', delay = 0 }) {
  return (
    <div
      className={`animate-fade-up rounded-2xl border border-white/[0.07] bg-slate-900/70 p-5 shadow-xl shadow-black/30 backdrop-blur-sm transition-colors duration-300 hover:border-white/[0.12] ${className}`}
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {icon && (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-slate-300 ring-1 ring-white/10">
              <Icon name={icon} className="h-4 w-4" />
            </span>
          )}
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
            {subtitle && <p className="truncate text-xs text-slate-500">{subtitle}</p>}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </div>
  )
}

export function JsonBlock({ value }) {
  return (
    <pre className="console-scroll max-h-64 overflow-auto rounded-lg bg-slate-950 p-3 font-mono text-[11px] leading-relaxed text-slate-300 ring-1 ring-white/5">
      {JSON.stringify(value, null, 2)}
    </pre>
  )
}
