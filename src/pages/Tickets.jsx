import { useState, useCallback, useEffect } from 'react'
import { LifeBuoy, RefreshCw, Send, MessageCircle } from 'lucide-react'
import { useToast } from '../components/Toast'
import { Empty, StatusBadge, UserCell, Loader } from '../components/ui'
import Modal from '../components/Modal'
import { get, post, put, errMsg } from '../api/client'

const STATUS_OPTIONS = ['All', 'Open', 'WaitingOnCustomer', 'InProgress', 'Resolved', 'Closed']
const PRIORITY_TINTS = { Low: '#10b981', Normal: '#3b82f6', High: '#f59e0b', Urgent: '#ef4444' }

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString() : '—')
const fmtDateTime = (iso) => (iso ? new Date(iso).toLocaleString() : '—')

export default function Tickets() {
  const toast = useToast()
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('All')
  const [sel, setSel] = useState(null)
  const [detail, setDetail] = useState(null)
  const [messages, setMessages] = useState([])
  const [reply, setReply] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const pageSize = 20

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, pageSize }
      if (status !== 'All') params.status = status
      const res = await get('/admin/tickets', params)
      setRows(res.data || [])
      setTotal(res.total || 0)
    } catch { /* ignore */ }
    setLoading(false)
  }, [page, status])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [status])

  const openDetail = async (ticket) => {
    setSel(ticket)
    setDetail(null)
    setMessages([])
    setReply('')
    try {
      const res = await get(`/admin/tickets/${ticket.id}`)
      setDetail(res.ticket)
      setMessages(res.messages || [])
    } catch { /* ignore */ }
  }

  const sendReply = async () => {
    if (!sel || !reply.trim()) return
    setBusy(true)
    try {
      await post(`/admin/tickets/${sel.id}/messages`, { content: reply.trim() })
      setReply('')
      const res = await get(`/admin/tickets/${sel.id}`)
      setDetail(res.ticket)
      setMessages(res.messages || [])
      toast.success('Reply sent')
    } catch (e) { toast.error(errMsg(e)) }
    setBusy(false)
  }

  const updateStatus = async (newStatus) => {
    if (!sel) return
    setBusy(true)
    try {
      await put(`/admin/tickets/${sel.id}/status`, { status: newStatus })
      toast.success(`Ticket ${newStatus.toLowerCase()}`)
      setSel(null)
      setDetail(null)
      load()
    } catch (e) { toast.error(errMsg(e)) }
    setBusy(false)
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22 }}>Support Tickets</h1>
        <button className="btn btn-outline btn-sm" onClick={load} disabled={loading}><RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh</button>
      </div>
      <p style={{ color: 'var(--text-dim)', marginBottom: 18 }}>Customer support requests. View, reply, and manage ticket status.</p>

      <div className="toolbar">
        <div className="pill-tabs">
          {STATUS_OPTIONS.map((s) => (
            <button key={s} className={`pill-tab${status === s ? ' active' : ''}`} onClick={() => setStatus(s)}>
              {s === 'WaitingOnCustomer' ? 'Waiting' : s}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        {loading ? <Loader /> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>User</th>
                  <th>Subject</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="mono" style={{ color: 'var(--text-dim)' }}>#{r.id}</td>
                    <td><UserCell name={r.userName || 'Unknown'} email={r.userEmail} /></td>
                    <td style={{ fontWeight: 600, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.subject}</td>
                    <td><span className="badge">{r.category || 'General'}</span></td>
                    <td><span className="badge" style={{ background: (PRIORITY_TINTS[r.priority] || '#9ca3af') + '20', color: PRIORITY_TINTS[r.priority] || '#9ca3af' }}>{r.priority || 'Normal'}</span></td>
                    <td><StatusBadge status={r.status} /></td>
                    <td style={{ color: 'var(--text-dim)' }}>{fmtDate(r.createdAt)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-outline btn-sm" onClick={() => openDetail(r)}>View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {rows.length === 0 && !loading && <Empty title="No tickets" message="Support tickets from users will appear here." icon={<LifeBuoy size={40} />} />}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '12px 0' }}>
            <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
            <span style={{ lineHeight: '30px', fontSize: 13, color: 'var(--text-dim)' }}>Page {page} of {totalPages}</span>
            <button className="btn btn-outline btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        )}
      </div>

      <Modal open={!!sel} onClose={() => { setSel(null); setDetail(null) }} title={detail?.subject || sel?.subject || 'Ticket'}>
        {detail && (
          <div>
            <div className="detail-grid">
              <div className="detail-item"><div className="k">User</div><div className="v">{detail.userName || 'Unknown'}</div></div>
              <div className="detail-item"><div className="k">Email</div><div className="v dim">{detail.userEmail || '—'}</div></div>
              <div className="detail-item"><div className="k">Category</div><div className="v">{detail.category || 'General'}</div></div>
              <div className="detail-item"><div className="k">Priority</div><div className="v"><span className="badge" style={{ background: (PRIORITY_TINTS[detail.priority] || '#9ca3af') + '20', color: PRIORITY_TINTS[detail.priority] || '#9ca3af' }}>{detail.priority || 'Normal'}</span></div></div>
              <div className="detail-item"><div className="k">Status</div><div className="v"><StatusBadge status={detail.status} /></div></div>
              <div className="detail-item"><div className="k">Created</div><div className="v dim">{fmtDateTime(detail.createdAt)}</div></div>
            </div>

            {detail.description && (
              <div style={{ marginTop: 14 }}>
                <div className="label">Description</div>
                <div style={{ background: 'var(--surface)', borderRadius: 8, padding: '10px 14px', fontSize: 13.5, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{detail.description}</div>
              </div>
            )}

            <div style={{ marginTop: 16 }}>
              <div className="label" style={{ marginBottom: 8 }}><MessageCircle size={14} style={{ verticalAlign: -2 }} /> Conversation ({messages.length})</div>
              <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {messages.map((m) => (
                  <div key={m.id} style={{ background: m.isFromSupport ? 'var(--primary-soft, #7c3aed18)' : 'var(--surface)', borderRadius: 8, padding: '8px 12px', borderLeft: m.isFromSupport ? '3px solid var(--primary, #7c3aed)' : '3px solid transparent' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 4 }}>
                      <strong>{m.senderName || 'Unknown'}</strong> {m.isFromSupport ? '(Support)' : ''} · {fmtDateTime(m.createdAt)}
                    </div>
                    <div style={{ fontSize: 13.5, whiteSpace: 'pre-wrap' }}>{m.content}</div>
                  </div>
                ))}
                {messages.length === 0 && <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>No messages yet.</div>}
              </div>
            </div>

            {detail.status !== 'Closed' && (
              <div style={{ marginTop: 14 }}>
                <div className="label">Reply</div>
                <textarea className="textarea" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Type your reply..." rows={3} style={{ marginBottom: 8 }} />
                <button className="btn btn-primary btn-sm" disabled={busy || !reply.trim()} onClick={sendReply}><Send size={14} /> Send reply</button>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
              {detail.status === 'Open' && <button className="btn btn-outline btn-sm" disabled={busy} onClick={() => updateStatus('InProgress')}>Mark In Progress</button>}
              {(detail.status === 'Open' || detail.status === 'InProgress' || detail.status === 'WaitingOnCustomer') && (
                <button className="btn btn-success btn-sm" disabled={busy} onClick={() => updateStatus('Resolved')}>Resolve</button>
              )}
              {(detail.status === 'Resolved' || detail.status === 'InProgress') && (
                <button className="btn btn-outline btn-sm" disabled={busy} onClick={() => updateStatus('Closed')}>Close</button>
              )}
              {detail.status === 'Closed' && (
                <button className="btn btn-outline btn-sm" disabled={busy} onClick={() => updateStatus('Open')}>Reopen</button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
