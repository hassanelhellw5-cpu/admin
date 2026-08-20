import { useState, useEffect, useCallback } from 'react'
import { Wallet } from 'lucide-react'
import { get, put, errMsg } from '../api/client'
import { useToast } from '../components/Toast'
import { Loader, Empty, StatusBadge } from '../components/ui'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'

export default function Withdrawals() {
  const toast = useToast()
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [sel, setSel] = useState(null)
  const [notes, setNotes] = useState('')
  const [confirm, setConfirm] = useState(null)
  const [busyAction, setBusyAction] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await get('/admin/withdrawals', status ? { status } : {}))
    } catch (e) { toast.error(errMsg(e)) } finally { setLoading(false) }
  }, [status])

  useEffect(() => { load() }, [load])

  const ask = (s) => {
    if (!notes.trim()) { toast.error('A reason is required before acting on this withdrawal'); return }
    setConfirm({ action: s })
  }

  const doAct = async () => {
    if (!confirm) return
    setBusyAction(true)
    try {
      await put(`/admin/withdrawals/${sel.id}`, { status: confirm.action, adminNotes: notes })
      toast.success(`Withdrawal ${confirm.action}`)
      setSel(null); setNotes(''); setConfirm(null)
      load()
    } catch (e) { toast.error(errMsg(e)) } finally { setBusyAction(false) }
  }

  if (loading && !data) return <Loader />

  return (
    <>
      <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, marginBottom: 4 }}>Withdrawals</h1>
      <p style={{ color: 'var(--text-dim)', marginBottom: 22 }}>Payout requests from users.</p>

      <div className="toolbar">
        <div className="pill-tabs">
          <button className={`pill-tab${status === '' ? ' active' : ''}`} onClick={() => { setStatus(''); }}>All</button>
          {['Pending', 'Approved', 'Completed', 'Rejected'].map((s) => (
            <button key={s} className={`pill-tab${status === s ? ' active' : ''}`} onClick={() => setStatus(s)}>{s}</button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>User</th><th>Amount</th><th>Fee</th><th>Net</th><th>Method</th><th>Details</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
            <tbody>
              {(data || []).map((w) => (
                <tr key={w.id}>
                  <td style={{ fontWeight: 500 }}>{w.userName || '—'}</td>
                  <td style={{ fontWeight: 700 }}>${Number(w.amount).toLocaleString()}</td>
                  <td style={{ color: 'var(--text-dim)' }}>${Number(w.fee || 0).toLocaleString()}</td>
                  <td style={{ color: 'var(--green)' }}>${Number(w.netAmount || w.amount).toLocaleString()}</td>
                  <td>{w.paymentMethod || '—'}</td>
                  <td className="mono" style={{ color: 'var(--text-dim)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.paymentDetails || '—'}</td>
                  <td><StatusBadge status={w.status} /></td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-outline btn-sm" disabled={w.status !== 'Pending'} onClick={() => { setSel(w); setNotes(w.adminNotes || '') }}>Review</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data?.length === 0 && <Empty title="No withdrawals" message="Nothing matches this filter." icon={<Wallet size={40} />} />}
      </div>

      <Modal open={!!sel} onClose={() => setSel(null)} title={sel ? `Withdrawal — ${sel.userName || 'Unknown'}` : ''}>
        {sel && (
          <div>
            <div className="detail-grid">
              <div className="detail-item"><div className="k">Amount</div><div className="v">${Number(sel.amount).toLocaleString()}</div></div>
              <div className="detail-item"><div className="k">Net</div><div className="v" style={{ color: 'var(--green)' }}>${Number(sel.netAmount || sel.amount).toLocaleString()}</div></div>
              <div className="detail-item"><div className="k">Method</div><div className="v">{sel.paymentMethod || '—'}</div></div>
              <div className="detail-item"><div className="k">Details</div><div className="v mono">{sel.paymentDetails || '—'}</div></div>
              <div className="detail-item"><div className="k">Status</div><div className="v"><StatusBadge status={sel.status} /></div></div>
              <div className="detail-item"><div className="k">Created</div><div className="v dim">{new Date(sel.createdAt).toLocaleString()}</div></div>
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
            {sel.notes && <div className="quote">{sel.notes}</div>}
            <div className="field" style={{ marginTop: 14 }}>
              <label className="label">Reason *</label>
              <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Required before approving or rejecting…" />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-success" onClick={() => ask('Completed')} disabled={sel.status !== 'Pending'}>Approve &amp; pay</button>
              <button className="btn btn-primary" onClick={() => ask('Approved')} disabled={sel.status !== 'Pending'}>Approve</button>
              <button className="btn btn-danger" onClick={() => ask('Rejected')} disabled={sel.status !== 'Pending'}>Reject</button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        title={`${confirm?.action} withdrawal?`}
        message={`This will mark the $${sel ? Number(sel.amount).toLocaleString() : ''} payout as "${confirm?.action}". Reason: "${notes}"`}
        confirmLabel={confirm?.action || 'Confirm'}
        busy={busyAction}
        onClose={() => setConfirm(null)}
        onConfirm={doAct}
      />
    </>
  )
}
