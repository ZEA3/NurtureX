// src/components/EmptyState.jsx
//
// Empty state placeholder. icon is a lucide-react component (or any element).

import { Inbox } from 'lucide-react'
import { isValidElement } from 'react'

export default function EmptyState({
  icon,
  title = 'Nothing here yet',
  description,
  action,
}) {
  let rendered
  if (isValidElement(icon)) {
    rendered = icon
  } else if (typeof icon === 'function') {
    const Icon = icon
    rendered = <Icon size={24} />
  } else {
    rendered = <Inbox size={24} />
  }

  return (
    <div className="text-center py-14 px-6">
      <div className="mx-auto mb-4 h-14 w-14 grid place-items-center rounded-2xl bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500">
        {rendered}
      </div>
      <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">{title}</h3>
      {description && (
        <p className="text-sm text-slate-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
