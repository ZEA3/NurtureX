// src/components/Logo.jsx
//
// NurtureX brand mark. Uses the user-provided logo PNG with a transparent
// background, so it sits cleanly on any surface in either theme.
//
// In dark mode we lift the contrast slightly with a soft white halo behind
// the mark — the original logo is dark-blue and would otherwise get lost on
// a black background.

import { cn } from '../utils/cn'
import logoSrc from '../assets/logo.png'

export default function Logo({
  size = 36,
  withWordmark = false,
  subtitle,
  wordmarkClass = 'text-lg',
  className,
  iconClassName,
}) {
  const Mark = (
    <span
      className={cn(
        'inline-grid place-items-center shrink-0 rounded-xl',
        // The PNG is dark-blue; on dark surfaces we put a light backdrop
        // so it stays legible. On light, no backdrop needed.
        'dark:bg-white/95',
        iconClassName,
      )}
      style={{ width: size, height: size, padding: size > 40 ? 4 : 2 }}
    >
      <img
        src={logoSrc}
        alt="NurtureX"
        width={size}
        height={size}
        className="block w-full h-full object-contain"
        draggable={false}
      />
    </span>
  )

  if (!withWordmark) return Mark

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {Mark}
      <div className="leading-tight">
        <div className={cn('font-extrabold tracking-tight text-slate-900 dark:text-white', wordmarkClass)}>
          NurtureX
        </div>
        {subtitle && (
          <div className="text-[11px] text-slate-500 dark:text-zinc-500 mt-0.5">
            {subtitle}
          </div>
        )}
      </div>
    </div>
  )
}
