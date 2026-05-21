// src/utils/cn.js
// Tiny className helper. Filters falsy values and joins with spaces.
//   cn('btn', isActive && 'btn-active', maybeNull, ['a', 'b'])
export function cn(...args) {
  const out = []
  for (const a of args) {
    if (!a) continue
    if (typeof a === 'string') out.push(a)
    else if (Array.isArray(a)) out.push(cn(...a))
    else if (typeof a === 'object') {
      for (const k in a) if (a[k]) out.push(k)
    }
  }
  return out.join(' ')
}
