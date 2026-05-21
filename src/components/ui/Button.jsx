// src/components/ui/Button.jsx
import { cn } from '../../utils/cn'
import Spinner from './Spinner'

const VARIANTS = {
  primary:   'bg-brand-700 hover:bg-brand-800 text-white shadow-soft hover:shadow-card dark:bg-white dark:hover:bg-zinc-200 dark:text-black',
  secondary: 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-white dark:border-zinc-800',
  ghost:     'hover:bg-slate-100 text-slate-600 hover:text-slate-900 dark:hover:bg-zinc-800 dark:text-zinc-400 dark:hover:text-white',
  danger:    'bg-red-50 text-red-600 border border-red-200 hover:bg-red-600 hover:text-white dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30 dark:hover:bg-red-500 dark:hover:text-white',
  outline:   'border border-slate-200 hover:bg-slate-50 text-slate-700 dark:border-zinc-800 dark:hover:bg-zinc-900 dark:text-zinc-200',
}

const SIZES = {
  xs: 'h-7 px-2.5 text-xs gap-1',
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-5 text-base gap-2',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  block = false,
  className,
  type = 'button',
  ...rest
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-semibold rounded-lg',
        'transition-all duration-150 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-black',
        'disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0',
        'active:translate-y-0',
        VARIANTS[variant],
        SIZES[size],
        block && 'w-full',
        className
      )}
      {...rest}
    >
      {loading ? <Spinner size="sm" /> : null}
      {children}
    </button>
  )
}
