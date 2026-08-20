import { useState, useEffect, useCallback } from 'react'
import { FileSignature } from 'lucide-react'
import { get, errMsg } from '../api/client'
import { useToast } from '../components/Toast'
import { Loader, Empty, Pagination, StatusBadge } from '../components/ui'

export default function Contracts() {
  const toast = useToast()
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, pageSize: 20, sortBy: 'createdAt', sortOrder: 'desc' }
      if (status) params.status = status
      setData(await get('/contracts', params))
    } catch (e) { toast.error(errMsg(e)) } finally { setLoading(false) }
  }, [page, status])

  useEffect(() => { load() }, [load])

  if (loading && !data) return <Loader />

  return (
    <>
      <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, marginBottom: 4 }}>Contracts</h1>
      <p style={{ color: 'var(--text-dim)', marginBottom: 22 }}>All contracts linked to bookings.</p>

      <div className="toolbar">
        <div className="pill-tabs">
          <button className={`pill-tab${status === '' ? ' active' : ''}`} onClick={() => { setStatus(''); setPage(1) }}>All</button>
          {['Draft', 'Pending', 'Signed', 'Expired', 'Cancelled'].map((s) => (
            <button key={s} className={`pill-tab${status === s ? ' active' : ''}`} onClick={() => { setStatus(s); setPage(1) }}>{s}</button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Contract</th><th>Booking</th><th>Status</th><th>Created</th><th>PDF</th></tr></thead>
            <tbody>
              {(data?.data || []).map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="cell-user">
                      <div className="cell-avatar"><FileSignature size={15} /></div>
                      <div><div className="cell-name">{c.title || `Contract #${c.id}`}</div><div className="cell-sub">#{c.id}</div></div>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-dim)' }}>#{c.bookingId}</td>
                  <td><StatusBadge status={c.status} /></td>
                  <td style={{ color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'}</td>
                  <td>{c.pdfUrl ? <a href={c.pdfUrl} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">View</a> : <span className="badge badge-gray">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data?.data?.length === 0 && <Empty title="No contracts yet" icon={<FileSignature size={40} />} />}
        {data && <div style={{ padding: '0 16px' }}><Pagination page={page} totalPages={data.totalPages} total={data.total} onChange={setPage} /></div>}
      </div>
    </>
  )
}
