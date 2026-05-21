// src/components/ui/Spinner.jsx
import { cn } from '../../utils/cn'

const SIZES = { sm: 'h-4 w-4 border-2', md: 'h-6 w-6 border-2', lg: 'h-10 w-10 border-[3px]' }

export default function Spinner({ size = 'md', className, label }) {
  return (
    <span
      role="status"
      aria-label={label ?? 'Loading'}
      className={cn('inline-flex items-center gap-2', className)}
    >
      <span
        className={cn(
          'inline-block rounded-full animate-spin',
          'border-current border-r-transparent opacity-90',
          SIZES[size]
        )}
      />
      {label && <span className="text-sm">{label}</span>}
    </span>
  )
}

export function FullPageSpinner({ message = 'Loading…' }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50 dark:bg-black">
      <Spinner size="lg" className="text-brand-700 dark:text-white" />
      <span className="text-sm text-slate-500 dark:text-zinc-400">{message}</span>
    </div>
  )
}
