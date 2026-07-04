// src/components/StatCard.jsx
//
// Stat card. Tailwind premium look. Backward-compatible icon API:
//   icon={Stethoscope}              ← lucide-react component (preferred)
//   icon={<Icon name="users" />}    ← legacy element
import { TrendingUp, TrendingDown } from 'lucide-react'
import { isValidElement } from 'react'
import { cn } from '../utils/cn'

export default function StatCard({
  icon,
  label,
  value,
  delta,
  iconClass,
  // legacy props (still accepted)
  bg,
  color,
}) {
  const trendingUp = typeof delta === 'string' && delta.startsWith('+')

  // Resolve icon: element (legacy), or component (new)
  let renderedIcon = null
  if (isValidElement(icon)) renderedIcon = icon
  else if (typeof icon === 'function') {
    const Icon = icon
    renderedIcon = <Icon size={20} />
  }

  // Build legacy bg/color into inline style if provided
  const legacyStyle = (bg || color) ? { background: bg, color } : undefined

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 transition hover:shadow-card hover:-translate-y-px">
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn(
            'h-11 w-11 rounded-xl grid place-items-center',
            !legacyStyle && (iconClass ?? 'bg-brand-50 text-brand-700 dark:bg-zinc-800 dark:text-zinc-200')
          )}
          style={legacyStyle}
        >
          {renderedIcon}
        </div>
        {delta && (
          <span className={cn(
            'inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full',
            trendingUp
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
              : 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400'
          )}>
            {trendingUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {delta}
          </span>
        )}
      </div>
      <div className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
        {value}
      </div>
      <div className="mt-1 text-xs font-medium text-slate-500 dark:text-zinc-500">{label}</div>
    </div>
  )
}
