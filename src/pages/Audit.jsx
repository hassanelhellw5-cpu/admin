import { useState, useEffect } from 'react'
import { ScrollText } from 'lucide-react'
import { post, errMsg } from '../api/client'
import { useToast } from '../components/Toast'
import { Loader, Empty, Pagination, StatusBadge } from '../components/ui'

export default function Audit() {
  const toast = useToast()
  const [data, setData] = useState(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [action, setAction] = useState('')
  const [method, setMethod] = useState('')
  const [userFilter, setUserFilter] = useState('')

  useEffect(() => {
    setLoading(true)
    post('/admin/audit', {}, { page, pageSize: 30 }).then(setData).catch((e) => toast.error(errMsg(e))).finally(() => setLoading(false))
  }, [page])

  const methods = [...new Set((data?.data || []).map((a) => a.requestMethod).filter(Boolean))]
  const actions = [...new Set((data?.data || []).map((a) => a.action).filter(Boolean))]

  const rows = (data?.data || []).filter((a) => {
    if (action && a.action !== action) return false
    if (method && (a.requestMethod || '—') !== method) return false
    if (userFilter.trim() && !String(a.userId || '').toLowerCase().includes(userFilter.trim().toLowerCase())) return false
    return true
  })

  const filteredCount = rows.length
  const totalShown = rows.length < (data?.data?.length || 0)

  if (loading && !data) return <Loader />

  return (
    <>
      <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, marginBottom: 4 }}>Audit log</h1>
      <p style={{ color: 'var(--text-dim)', marginBottom: 22 }}>System activity trail.</p>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          style={{ maxWidth: 220 }}
          className="input"
          placeholder="Filter by user ID…"
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
        />
        <select className="input" style={{ maxWidth: 200 }} value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="">All actions</option>
          {actions.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select className="input" style={{ maxWidth: 160 }} value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="">All methods</option>
          {methods.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        {(action || method || userFilter) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setAction(''); setMethod(''); setUserFilter('') }}>Clear</button>
        )}
        {totalShown && <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{filteredCount} of {data?.data?.length} on this page match</span>}
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Entity</th><th>Path</th><th>Method</th><th>Duration</th></tr></thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td style={{ color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{new Date(a.createdAt).toLocaleString()}</td>
                  <td className="mono" style={{ color: 'var(--text-dim)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.userId || '—'}</td>
                  <td><span className="badge badge-violet">{a.action}</span></td>
                  <td style={{ color: 'var(--text-dim)' }}>{a.entityType}{a.entityId ? ` #${a.entityId}` : ''}</td>
                  <td className="mono" style={{ color: 'var(--text-dim)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.requestPath || '—'}</td>
                  <td><StatusBadge status={a.requestMethod || '—'} /></td>
                  <td style={{ color: 'var(--text-dim)' }}>{a.durationMs != null ? `${a.durationMs}ms` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <Empty title={action || method || userFilter ? 'No matching entries' : 'No audit entries yet'} message={action || method || userFilter ? 'Nothing matches the current filters.' : 'No activity recorded yet.'} icon={<ScrollText size={40} />} />}
        {data && <div style={{ padding: '0 16px' }}><Pagination page={page} totalPages={data.totalPages} total={data.total} onChange={setPage} /></div>}
      </div>
    </>
  )
}
