// src/components/ui/Field.jsx
//
// Form primitives. <Field> wraps <Input>/<Select>/<Textarea> with label + hint + error.

import { forwardRef } from 'react'
import { cn } from '../../utils/cn'

const baseInput =
  'block w-full px-3.5 h-11 rounded-lg text-sm ' +
  'bg-white dark:bg-zinc-900 ' +
  'text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 ' +
  'border border-slate-200 dark:border-zinc-800 ' +
  'transition-shadow ' +
  'focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 ' +
  'disabled:opacity-60 disabled:cursor-not-allowed'

export const Input = forwardRef(function Input({ className, error, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(baseInput, error && 'border-red-400 focus:border-red-500 focus:ring-red-500/15', className)}
      {...props}
    />
  )
})

export const Textarea = forwardRef(function Textarea({ className, error, rows = 4, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(baseInput, 'h-auto py-3 resize-y', error && 'border-red-400 focus:border-red-500', className)}
      {...props}
    />
  )
})

export const Select = forwardRef(function Select({ className, error, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(baseInput, 'pr-10 cursor-pointer', error && 'border-red-400', className)}
      {...props}
    >
      {children}
    </select>
  )
})

export function Field({ label, hint, error, required, children, className }) {
  return (
    <div className={cn('mb-4', className)}>
      {label && (
        <label className="block text-sm font-semibold text-slate-700 dark:text-zinc-200 mb-1.5">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      {children}
      {error
        ? <p className="text-xs text-red-600 dark:text-red-400 mt-1.5">{error}</p>
        : hint
          ? <p className="text-xs text-slate-500 dark:text-zinc-500 mt-1.5 flex items-center gap-1">{hint}</p>
          : null}
    </div>
  )
}
