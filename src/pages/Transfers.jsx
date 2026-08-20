import { useState, useEffect, useCallback } from 'react'
import { ArrowLeftRight } from 'lucide-react'
import { get, put, errMsg } from '../api/client'
import { useToast } from '../components/Toast'
import { Loader, Empty, StatusBadge, Pagination } from '../components/ui'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'

const MONEY = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export default function Transfers() {
  const toast = useToast()
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [sel, setSel] = useState(null)
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [busyAction, setBusyAction] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await get('/admin/transfers', { status: status || undefined, page, pageSize: 20 }))
    } catch (e) { toast.error(errMsg(e)) } finally { setLoading(false) }
  }, [status, page, toast])

  useEffect(() => { load() }, [load])

  const ask = (s) => {
    if (!notes.trim()) { toast.error('A reason is required before acting on this transfer'); return }
    setConfirm({ action: s })
  }

  const doAct = async () => {
    if (!confirm) return
    setBusyAction(true)
    try {
      await put(`/admin/transfers/${sel.id}`, { status: confirm.action, adminNotes: notes })
      toast.success(`Transfer ${confirm.action}`)
      setSel(null); setNotes(''); setConfirm(null)
      load()
    } catch (e) { toast.error(errMsg(e)) } finally { setBusyAction(false) }
  }

  if (loading && !data) return <Loader />

  return (
    <>
      <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, marginBottom: 4 }}>Transfers</h1>
      <p style={{ color: 'var(--text-dim)', marginBottom: 22 }}>Wallet-to-wallet transfers between users. Funds are reserved until approved or cancelled.</p>

      <div className="toolbar">
        <div className="pill-tabs">
          <button className={`pill-tab${status === '' ? ' active' : ''}`} onClick={() => { setStatus(''); setPage(1) }}>All</button>
          {['Pending', 'Approved', 'Cancelled'].map((s) => (
            <button key={s} className={`pill-tab${status === s ? ' active' : ''}`} onClick={() => { setStatus(s); setPage(1) }}>{s}</button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>ID</th><th>Amount</th><th>Sender</th><th>Receiver</th><th>Status</th><th>Requested</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
            <tbody>
              {(data?.data || []).map((t) => (
                <tr key={t.id}>
                  <td className="mono">#{t.id}</td>
                  <td style={{ fontWeight: 700 }}>{MONEY.format(Number(t.amount))}</td>
                  <td>{t.senderName || t.senderUserId}</td>
                  <td>{t.receiverName || t.receiverUserId}</td>
                  <td><StatusBadge status={t.status} /></td>
                  <td style={{ color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-outline btn-sm" disabled={t.status !== 'Pending'} onClick={() => { setSel(t); setNotes(t.adminNotes || '') }}>Review</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data?.data?.length === 0 && <Empty title="No transfers" message="Nothing matches this filter." icon={<ArrowLeftRight size={40} />} />}
        {data && <div style={{ padding: '0 16px' }}><Pagination page={page} totalPages={data.totalPages} total={data.total} onChange={setPage} /></div>}
      </div>

      <Modal open={!!sel} onClose={() => setSel(null)} title={`Transfer #${sel?.id || ''}`}>
        {sel && (
          <div>
            <div className="detail-grid">
              <div className="detail-item"><div className="k">Amount</div><div className="v">{MONEY.format(Number(sel.amount))}</div></div>
              <div className="detail-item"><div className="k">Status</div><div className="v"><StatusBadge status={sel.status} /></div></div>
              <div className="detail-item"><div className="k">Sender</div><div className="v">{sel.senderName || sel.senderUserId}<div className="dim">{sel.senderEmail}</div></div></div>
              <div className="detail-item"><div className="k">Receiver</div><div className="v">{sel.receiverName || sel.receiverUserId}<div className="dim">{sel.receiverEmail}</div></div></div>
              <div className="detail-item"><div className="k">Sender balance</div><div className="v">{sel.senderBalance != null ? MONEY.format(Number(sel.senderBalance)) : '—'} <span className="dim">pending {sel.senderPendingBalance != null ? MONEY.format(Number(sel.senderPendingBalance)) : '—'}</span></div></div>
              <div className="detail-item"><div className="k">Receiver balance</div><div className="v">{sel.receiverBalance != null ? MONEY.format(Number(sel.receiverBalance)) : '—'}</div></div>
              <div className="detail-item"><div className="k">Requested</div><div className="v dim">{new Date(sel.createdAt).toLocaleString()}</div></div>
              {sel.reviewedAt && <div className="detail-item"><div className="k">Reviewed</div><div className="v dim">{new Date(sel.reviewedAt).toLocaleString()}</div></div>}
            </div>
            {(sel.latitude != null || sel.ipAddress) && (
              <div style={{ marginTop: 14 }}>
                <label className="label">Location & device</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12, color: 'var(--text-dim)' }}>
                  <div>IP: <span className="mono">{sel.ipAddress || '—'}</span></div>
                  <div>Location: <span className="mono">{sel.clientLocation || '—'}</span></div>
                  {sel.latitude != null && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      Coordinates: <a href={`https://www.google.com/maps?q=${sel.latitude},${sel.longitude}`} target="_blank" rel="noreferrer" className="mono" style={{ color: 'var(--primary)' }}>{sel.latitude}, {sel.longitude}</a>
                    </div>
                  )}
                  {sel.userAgent && <div style={{ gridColumn: '1 / -1' }}>Agent: <span className="mono">{sel.userAgent}</span></div>}
                </div>
              </div>
            )}
            {sel.note && <div className="quote" style={{ marginTop: 10 }}>{sel.note}</div>}
            {sel.adminNotes && <div className="quote" style={{ marginTop: 10, color: 'var(--text-dim)' }}>Admin: {sel.adminNotes}</div>}
            {sel.status === 'Pending' && (
              <>
                <div className="field" style={{ marginTop: 14 }}>
                  <label className="label">Reason *</label>
                  <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Required before approving or cancelling…" />
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                  <button className="btn btn-success" disabled={busy} onClick={() => ask('Approved')}>Approve</button>
                  <button className="btn btn-danger" disabled={busy} onClick={() => ask('Cancelled')}>Cancel &amp; refund</button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        title={`${confirm?.action} transfer?`}
        message={`${MONEY.format(Number(sel?.amount || 0))} will be ${confirm?.action === 'Approved' ? 'released to the receiver' : 'refunded to the sender'}. Reason: "${notes}"`}
        confirmLabel={confirm?.action || 'Confirm'}
        busy={busyAction}
        onClose={() => setConfirm(null)}
        onConfirm={doAct}
      />
    </>
  )
}
