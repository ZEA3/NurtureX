// src/components/ui/Modal.jsx
//
// Accessible modal: ESC closes, body scroll locked, click-outside dismiss,
// focus trap is approximate (autofocus on first focusable element).

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../utils/cn'

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

export default function Modal({
  open, onClose, title, description, children, footer,
  size = 'md',
  hideClose = false,
}) {
  const dialogRef = useRef(null)
  const focusedOnceRef = useRef(false)

  // Keep the latest onClose in a ref so the ESC handler always calls the
  // current one without needing onClose in the effect's dependency array.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  // Lock body scroll + ESC to close. Re-runs only when `open` changes, not on
  // every parent re-render (which would otherwise re-trigger autofocus and
  // steal focus from the field you're typing in).
  useEffect(() => {
    if (!open) {
      focusedOnceRef.current = false
      return
    }
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => e.key === 'Escape' && onCloseRef.current?.()
    document.addEventListener('keydown', onKey)
    // Autofocus the first field ONCE, only when the modal first opens.
    if (!focusedOnceRef.current) {
      focusedOnceRef.current = true
      setTimeout(() => {
        const el = dialogRef.current?.querySelector(
          'input, button, textarea, select, [tabindex]:not([tabindex="-1"])')
        el?.focus()
      }, 0)
    }
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        className={cn(
          'relative w-full bg-white dark:bg-zinc-900 rounded-2xl shadow-lift',
          'border border-slate-200 dark:border-zinc-800',
          'max-h-[90vh] overflow-y-auto animate-slide-up',
          SIZES[size]
        )}
      >
        {(title || !hideClose) && (
          <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-slate-200 dark:border-zinc-800">
            <div>
              {title && (
                <h2 id="modal-title" className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                  {title}
                </h2>
              )}
              {description && (
                <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">{description}</p>
              )}
            </div>
            {!hideClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}
        <div className="px-6 py-5">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-end gap-2 bg-slate-50/50 dark:bg-black/30 rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}