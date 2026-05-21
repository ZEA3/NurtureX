// src/components/ui/Avatar.jsx
//
// Image + fallback initials avatar. If `src` fails to load OR isn't given,
// renders initials inside a colored circle.

import { useState } from 'react'
import { cn } from '../../utils/cn'

const SIZES = {
  xs: 'h-6 w-6 text-[9px]',
  sm: 'h-8 w-8 text-[11px]',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-20 w-20 text-2xl',
}

function initialsOf(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .map(w => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?'
}

export default function Avatar({ src, name = '', size = 'md', className }) {
  const [errored, setErrored] = useState(false)
  const showImg = src && !errored

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full font-semibold tracking-tight shrink-0',
        'bg-brand-100 text-brand-700 dark:bg-zinc-800 dark:text-zinc-200',
        'overflow-hidden',
        SIZES[size],
        className
      )}
      aria-label={name || 'avatar'}
    >
      {showImg ? (
        <img
          src={src}
          alt={name}
          onError={() => setErrored(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span>{initialsOf(name)}</span>
      )}
    </div>
  )
}
