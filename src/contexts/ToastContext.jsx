// src/contexts/ToastContext.jsx
import { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react'
import { cn } from '../utils/cn'

const ToastContext = createContext(null)
let nextId = 1

const ICONS = {
  success: CheckCircle2,
  error:   XCircle,
  info:    Info,
  warning: AlertTriangle,
}

const TONE = {
  success: 'border-emerald-500/40 dark:border-emerald-500/30',
  error:   'border-red-500/40 dark:border-red-500/30',
  info:    'border-brand-500/40 dark:border-zinc-700',
  warning: 'border-amber-500/40 dark:border-amber-500/30',
}

const ICON_TONE = {
  success: 'text-emerald-500',
  error:   'text-red-500',
  info:    'text-brand-600 dark:text-brand-400',
  warning: 'text-amber-500',
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const remove = (id) => setToasts(prev => prev.filter(t => t.id !== id))

  const toast = useCallback((message, type = 'info', duration = 4000) => {
    const id = nextId++
    setToasts(prev => [...prev, { id, message, type }])
    if (duration > 0) {
      setTimeout(() => remove(id), duration)
    }
    return id
  }, [])

  const api = {
    toast,
    success: (m, d) => toast(m, 'success', d),
    error:   (m, d) => toast(m, 'error',   d),
    info:    (m, d) => toast(m, 'info',    d),
    warning: (m, d) => toast(m, 'warning', d),
    dismiss: remove,
  }

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed top-5 right-5 z-[500] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => {
          const Icon = ICONS[t.type] ?? Info
          return (
            <div
              key={t.id}
              role="status"
              className={cn(
                'pointer-events-auto min-w-[280px] max-w-sm flex items-start gap-3',
                'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white',
                'border border-l-[3px] rounded-xl px-4 py-3 shadow-lift',
                'animate-slide-up',
                TONE[t.type]
              )}
            >
              <Icon size={18} className={cn('shrink-0 mt-0.5', ICON_TONE[t.type])} />
              <span className="flex-1 text-sm leading-relaxed">{t.message}</span>
              <button
                onClick={() => remove(t.id)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 -mr-1"
                aria-label="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
