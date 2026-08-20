import { useState } from 'react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart as RechartsArea, Area } from 'recharts'
import './charts.css'

export const PALETTE = {
  violet: '#7c3aed', pink: '#ec4899', amber: '#f59e0b', green: '#10b981',
  blue: '#3b82f6', red: '#ef4444', gray: '#9ca3af', cyan: '#06b6d4', slate: '#64748b',
}
const PIE_COLORS = ['#7c3aed', '#ec4899', '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#06b6d4', '#9ca3af', '#64748b']

export function orderedCounts(obj, order, fallback) {
  const keys = order || Object.keys(obj || {})
  const items = []
  keys.forEach((k) => {
    const v = obj?.[k] || 0
    if (v > 0) items.push({ label: k, value: v })
  })
  if (!items.length && fallback) return [{ label: fallback, value: 0 }]
  return items
}

export function monthKey(iso) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function monthlySeries(entries, months = 8) {
  const now = new Date()
  const labels = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    labels.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  const map = Object.fromEntries(labels.map((k) => [k, 0]))
  ;(entries || []).forEach((x) => { const k = monthKey(x); if (k in map) map[k]++ })
  return labels.map((k) => ({ label: `${k.slice(5)}/${k.slice(2, 4)}`, value: map[k] }))
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-label">{label || payload[0]?.name}</div>
      {payload.map((p, i) => (
        <div key={i} className="chart-tooltip-val" style={{ color: p.color || p.fill }}>
          {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </div>
      ))}
    </div>
  )
}

export function Donut({ items, tints, center, centerSub, onSliceClick }) {
  const [hovered, setHovered] = useState(null)
  const total = items.reduce((a, b) => a + b.value, 0)
  if (!total) return <div className="chart-empty">No data yet</div>

  const data = items.map((it, i) => ({
    name: it.label,
    value: it.value,
    fill: tints?.[it.label] || PIE_COLORS[i % PIE_COLORS.length],
  }))

  const clicked = hovered !== null ? data[hovered] : null

  return (
    <div className="donut-wrap">
      <div className="donut-chart-area">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={3}
              dataKey="value"
              onMouseEnter={(_, i) => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              onClick={(data, i) => onSliceClick?.(data)}
              style={{ cursor: onSliceClick ? 'pointer' : 'default' }}
            >
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.fill}
                  stroke="transparent"
                  style={{
                    filter: hovered === i ? 'brightness(1.2) drop-shadow(0 2px 8px rgba(0,0,0,0.3))' : 'none',
                    transition: 'filter 0.2s',
                  }}
                />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-center-overlay">
          <strong>{center ?? total}</strong>
          <span>{centerSub || 'total'}</span>
        </div>
      </div>
      <div className="legend">
        {items.map((it, i) => (
          <div
            className={`legend-item${hovered === i ? ' legend-hover' : ''}`}
            key={it.label}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            <span className="legend-dot" style={{ background: tints?.[it.label] || PIE_COLORS[i % PIE_COLORS.length] }} />
            <span className="lb">{it.label}</span>
            <span className="lv">{it.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function BarList({ items, tints, suffix = '', onBarClick }) {
  const [hovered, setHovered] = useState(null)
  if (!items.length) return <div className="chart-empty">No data yet</div>

  const data = items.map((it, i) => ({
    name: it.label,
    value: it.value,
    fill: tints?.[it.label] || PIE_COLORS[i % PIE_COLORS.length],
  }))

  return (
    <ResponsiveContainer width="100%" height={Math.max(70, items.length * 40 + 30)}>
      <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" horizontal={false} />
        <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} />
        <YAxis type="category" dataKey="name" tick={{ fill: '#374151', fontSize: 12, fontWeight: 600 }} width={100} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
        <Bar
          dataKey="value"
          radius={[0, 6, 6, 0]}
          barSize={22}
          onMouseEnter={(_, i) => setHovered(i)}
          onMouseLeave={() => setHovered(null)}
          onClick={(data) => onBarClick?.(data)}
          style={{ cursor: onBarClick ? 'pointer' : 'default' }}
        >
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.fill}
              style={{
                filter: hovered === i ? 'brightness(1.15)' : 'none',
                transition: 'filter 0.2s',
              }}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function VBars({ items, tint }) {
  if (!items.length) return <div className="chart-empty">No data yet</div>
  const max = Math.max(1, ...items.map((i) => i.value))
  return (
    <div className="vbars">
      {items.map((it) => (
        <div className="vbar-col" key={it.label}>
          <div className="vbar-val">{it.value}</div>
          <div className="vbar-track"><div className="vbar-fill" style={{ height: `${(it.value / max) * 100}%`, background: tint || '#7c3aed' }} /></div>
          <div className="vbar-label">{it.label}</div>
        </div>
      ))}
    </div>
  )
}

export function AreaChart({ series, months = 8, height = 190 }) {
  const now = new Date()
  const labels = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    labels.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  const data = labels.map((k, i) => {
    const point = { month: `${k.slice(5)}/${k.slice(2, 4)}` }
    ;(series || []).forEach((s) => {
      const map = Object.fromEntries(labels.map((l) => [l, 0]))
      ;(s.entries || []).forEach((x) => { const mk = monthKey(x); if (mk in map) map[mk]++ })
      point[s.name] = map[k]
    })
    return point
  })

  if (!series?.length) return <div className="chart-empty">No data yet</div>

  return (
    <div>
      <ResponsiveContainer width="100%" height={height + 40}>
        <RechartsArea data={data} margin={{ left: 0, right: 10, top: 10, bottom: 0 }}>
          <defs>
            {series.map((s) => (
              <linearGradient key={s.name} id={`grad-${s.name.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={s.color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
          <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} />
          <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
          <Tooltip content={<ChartTooltip />} />
          {series.map((s) => (
            <Area
              key={s.name}
              type="monotone"
              dataKey={s.name}
              stroke={s.color}
              fill={`url(#grad-${s.name.replace(/\s/g, '')})`}
              strokeWidth={2}
              dot={{ r: 3, fill: '#fff', stroke: s.color, strokeWidth: 2 }}
              activeDot={{ r: 5, fill: s.color, stroke: '#fff', strokeWidth: 2 }}
            />
          ))}
        </RechartsArea>
      </ResponsiveContainer>
      <div className="chart-series-legend">
        {series.map((s) => <span key={s.name}><i style={{ background: s.color }} />{s.name}</span>)}
      </div>
    </div>
  )
}
