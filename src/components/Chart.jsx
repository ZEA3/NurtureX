// src/components/Chart.jsx — Pure SVG/CSS bar chart (no external libs)

// Horizontal bar chart
export function BarChart({ data = [], height = 200 }) {
  if (!data.length) return null
  const max = Math.max(...data.map(d => d.value), 1)

  return (
    <div className="chart-container">
      {data.map((d, i) => (
        <div key={i} className="chart-bar-row">
          <span className="chart-bar-label">{d.label}</span>
          <div className="chart-bar-track">
            <div
              className="chart-bar-fill"
              style={{ width: `${(d.value / max) * 100}%` }}
            />
          </div>
          <span className="chart-bar-value">{d.value}</span>
        </div>
      ))}
    </div>
  )
}

// SVG vertical bar chart
export function ColumnChart({ data = [], height = 160 }) {
  if (!data.length) return null
  const max = Math.max(...data.map(d => d.value), 1)
  const w = 100 / data.length

  return (
    <div style={{ width: '100%', height }}>
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
        <defs>
          <linearGradient id="colGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand-mid)" />
            <stop offset="100%" stopColor="var(--brand)" />
          </linearGradient>
        </defs>
        {data.map((d, i) => {
          const barH = (d.value / max) * (height - 24)
          const x = i * w + w * .15
          const barW = w * .7
          return (
            <rect
              key={i}
              x={x} y={height - 20 - barH}
              width={barW} height={barH}
              rx="2" fill="url(#colGrad)"
              opacity=".9"
            />
          )
        })}
        {data.map((d, i) => (
          <text
            key={i}
            x={i * w + w / 2} y={height - 4}
            textAnchor="middle" fontSize="5"
            fill="var(--text-muted)"
          >
            {d.label}
          </text>
        ))}
      </svg>
    </div>
  )
}

// Donut chart
export function DonutChart({ segments = [], size = 120 }) {
  const total = segments.reduce((s, d) => s + d.value, 0) || 1
  const r = 40; const cx = 60; const cy = 60
  let angle = -90

  const arc = (pct) => {
    const rad = (angle * Math.PI) / 180
    const endRad = ((angle + pct * 360) * Math.PI) / 180
    const x1 = cx + r * Math.cos(rad)
    const y1 = cy + r * Math.sin(rad)
    const x2 = cx + r * Math.cos(endRad)
    const y2 = cy + r * Math.sin(endRad)
    const large = pct * 360 > 180 ? 1 : 0
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`
  }

  return (
    <svg width={size} height={size} viewBox="0 0 120 120">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg-alt)" strokeWidth="14" />
      {segments.map((seg, i) => {
        const pct = seg.value / total
        const path = arc(pct)
        angle += pct * 360
        return (
          <path key={i} d={path} fill="none"
            stroke={seg.color || 'var(--brand)'}
            strokeWidth="14" strokeLinecap="round"
          />
        )
      })}
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="14" fontWeight="800" fill="var(--text-primary)">
        {total}
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize="7" fill="var(--text-muted)">Total</text>
    </svg>
  )
}
