// src/components/ui/Skeleton.jsx
import { cn } from '../../utils/cn'

const BASE = 'bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-zinc-800 dark:via-zinc-900 dark:to-zinc-800 bg-[length:200%_100%] animate-shimmer rounded-md'

export function Skeleton({ className }) {
  return <div className={cn(BASE, className)} />
}

export function SkeletonStatCard() {
  return (
    <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-6 space-y-4">
      <Skeleton className="h-10 w-10 rounded-xl" />
      <Skeleton className="h-8 w-24" />
      <Skeleton className="h-3 w-32" />
    </div>
  )
}

export function SkeletonRow({ cols = 5 }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full max-w-[160px]" />
        </td>
      ))}
    </tr>
  )
}
