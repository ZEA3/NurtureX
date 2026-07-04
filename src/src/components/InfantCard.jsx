// src/components/InfantCard.jsx
import { Baby, ChevronRight } from 'lucide-react'
import StatusBadge from './StatusBadge'
import { cn } from '../utils/cn'

const STATUS_COLORS = {
  monitoring: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  healthy:    'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  at_risk:    'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400',
  critical:   'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
}

function ageOf(dob) {
  if (!dob) return '—'
  const d = new Date(dob)
  const now = new Date()
  const months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth())
  if (months < 1) {
    const days = Math.max(0, Math.floor((now - d) / 86400000))
    return `${days} days`
  }
  if (months < 24) return `${months} months`
  return `${Math.floor(months / 12)} years`
}

export default function InfantCard({ infant, onClick }) {
  const accent = STATUS_COLORS[infant.status] ?? STATUS_COLORS.monitoring
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative block w-full text-left rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 hover:shadow-card hover:-translate-y-px transition"
    >
      <div className="flex items-start gap-3">
        <div className={cn('h-11 w-11 rounded-xl grid place-items-center', accent)}>
          <Baby size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-slate-900 dark:text-white truncate">{infant.name}</div>
          <div className="text-xs text-slate-500 dark:text-zinc-500 mt-0.5">
            {ageOf(infant.date_of_birth)} · {infant.gender ?? '—'}
          </div>
        </div>
        <ChevronRight size={16} className="text-slate-300 dark:text-zinc-700 group-hover:text-slate-600 dark:group-hover:text-zinc-300 mt-1" />
      </div>
      <hr className="my-3 border-slate-100 dark:border-zinc-800" />
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-slate-500 dark:text-zinc-500">
          {infant.mother?.full_name ? `Mother: ${infant.mother.full_name}` : '—'}
        </span>
        <StatusBadge status={infant.status} />
      </div>
    </button>
  )
}
