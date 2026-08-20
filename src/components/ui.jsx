import { useState } from 'react'
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react'

const _colors = ['#8B5CF6','#EC4899','#3B82F6','#10B981','#F59E0B','#EF4444','#06B6D4','#84CC16']
function _color(s) { let h = 0; for (let i = 0; i < (s||'?').length; i++) h = s.charCodeAt(i) + ((h << 5) - h); return _colors[Math.abs(h) % _colors.length] }

export function Avatar({ src, name, size = 36, style = {} }) {
  const [broken, setBroken] = useState(false)
  if (src && !broken) {
    return <img src={src} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, ...style }} onError={() => setBroken(true)} />
  }
  return <div style={{ width: size, height: size, borderRadius: '50%', background: `linear-gradient(135deg, ${_color(name)}, ${_color(name)}cc)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.4, fontWeight: 700, color: '#fff', flexShrink: 0, ...style }}>{(name || '?').charAt(0).toUpperCase()}</div>
}

export function Loader() {
  return <div className="loader"><div className="spinner" /></div>
}

export function Empty({ title = 'Nothing here yet', message, icon }) {
  return (
    <div className="empty">
      <div style={{ display: 'grid', placeItems: 'center' }}>{icon || <Inbox size={40} />}</div>
      <strong>{title}</strong>
      <span>{message}</span>
    </div>
  )
}

export function Pagination({ page, totalPages, total, onChange }) {
  if (!total || totalPages <= 1) return null
  const pages = []
  for (let p = 1; p <= totalPages; p++) pages.push(p)
  const show = pages.filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
  const items = []
  let prev = 0
  for (const p of show) {
    if (p - prev > 1) items.push('...')
    items.push(p)
    prev = p
  }
  return (
    <div style={{ padding: '6px 0 10px' }}>
      <div className="pagination">
        <button className="page-btn" disabled={page <= 1} onClick={() => onChange(page - 1)}><ChevronLeft size={16} /></button>
        {items.map((p, i) => (p === '...' ? <span key={`e${i}`} style={{ color: 'var(--text-faint)', padding: '0 2px', fontSize: 13 }}>…</span> : (
          <button key={p} className={`page-btn${p === page ? ' active' : ''}`} onClick={() => onChange(p)}>{p}</button>
        )))}
        <button className="page-btn" disabled={page >= totalPages} onClick={() => onChange(page + 1)}><ChevronRight size={16} /></button>
      </div>
      <div style={{ textAlign: 'center', color: 'var(--text-faint)', fontSize: 12, marginTop: 6 }}>
        Page {page} of {totalPages} · {total} total
      </div>
    </div>
  )
}

export function StatusBadge({ status }) {
  const map = {
    Pending: 'amber',
    Open: 'green',
    Active: 'green',
    Confirmed: 'green',
    InProgress: 'blue',
    Completed: 'green',
    Cancelled: 'red',
    Rejected: 'red',
    Blocked: 'red',
    Approved: 'green',
    Verified: 'green',
    Paid: 'green',
    Closed: 'gray',
    Resolved: 'green',
    Signed: 'green',
    Draft: 'gray',
    'In Review': 'violet',
    Processing: 'violet',
    InEscrow: 'blue',
    Released: 'green',
    Disputed: 'red',
  }
  const c = map[status] || 'gray'
  return <span className={`badge badge-${c}`}>{status}</span>
}

export function UserCell({ name, email, img }) {
  const [broken, setBroken] = useState(false)
  const showImg = img && !broken
  return (
    <div className="cell-user">
      {showImg ? <img src={img} alt="" className="cell-avatar" style={{ objectFit: 'cover' }} onError={() => setBroken(true)} /> : <div className="cell-avatar">{(name || '?').charAt(0).toUpperCase()}</div>}
      <div>
        <div className="cell-name">{name || '—'}</div>
        {email && <div className="cell-sub">{email}</div>}
      </div>
    </div>
  )
}
