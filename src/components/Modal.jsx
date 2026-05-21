// src/components/Modal.jsx — Reusable modal portal
import { useEffect } from 'react'
import Icon from './Icon'

export default function Modal({ open, onClose, title, children, footer, size = '' }) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey) }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`modal ${size ? `modal-${size}` : ''}`} role="dialog" aria-modal="true">
        {title && (
          <div className="modal-header">
            <span className="modal-title">{title}</span>
            {onClose && (
              <button className="modal-close" onClick={onClose} aria-label="Close">
                <Icon name="x" size={18} />
              </button>
            )}
          </div>
        )}
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}
