import { useState, useEffect, useCallback } from 'react'
import { Receipt } from 'lucide-react'
import { get, put, errMsg } from '../api/client'
import { useToast } from '../components/Toast'
import { Loader, Empty, StatusBadge } from '../components/ui'
import Modal from '../components/Modal'
import ImageLightbox from '../components/ImageLightbox'
import { API_BASE } from '../config'

function proofUrl(p) {
  if (!p) return ''
  if (p.startsWith('http')) return p
  const base = API_BASE.replace('/api', '') || 'http://brandmarketplace.runasp.net'
  return p.startsWith('/') ? `${base}${p}` : `${base}/${p}`
}

export default function PaymentProofs() {
  const toast = useToast()
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [sel, setSel] = useState(null)
  const [notes, setNotes] = useState('')
  const [lightbox, setLightbox] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await get('/admin/payment-proofs', status ? { status } : {}))
    } catch (e) { toast.error(errMsg(e)) } finally { setLoading(false) }
  }, [status])

  useEffect(() => { load() }, [load])

  const act = async (s) => {
    try {
      await put(`/admin/payment-proofs/${sel.id}`, { status: s, adminNotes: notes })
      toast.success(`Proof ${s} — balance updated`)
      setSel(null); setNotes('')
      load()
    } catch (e) { toast.error(errMsg(e)) }
  }

  if (loading && !data) return <Loader />

  return (
    <>
      <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, marginBottom: 4 }}>Payment proofs</h1>
      <p style={{ color: 'var(--text-dim)', marginBottom: 22 }}>Manual deposit requests. Approving credits the user's wallet.</p>

      <div className="toolbar">
        <div className="pill-tabs">
          <button className={`pill-tab${status === '' ? ' active' : ''}`} onClick={() => setStatus('')}>All</button>
          {['Pending', 'Approved', 'Rejected'].map((s) => (
            <button key={s} className={`pill-tab${status === s ? ' active' : ''}`} onClick={() => setStatus(s)}>{s}</button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>ID</th><th>Amount</th><th>Method</th><th>Sender</th><th>Reference</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
            <tbody>
              {(data || []).map((p) => (
                <tr key={p.id}>
                  <td className="mono">#{p.id}</td>
                  <td style={{ fontWeight: 700 }}>${Number(p.amount).toLocaleString()}</td>
                  <td>{p.method}</td>
                  <td style={{ color: 'var(--text-dim)' }}>{p.senderName || '—'}{p.senderPhone ? ` (${p.senderPhone})` : ''}</td>
                  <td className="mono" style={{ color: 'var(--text-dim)' }}>{p.referenceNumber || '—'}</td>
                  <td><StatusBadge status={p.status} /></td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-outline btn-sm" disabled={p.status !== 'Pending'} onClick={() => { setSel(p); setNotes(p.adminNotes || '') }}>Review</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data?.length === 0 && <Empty title="No payment proofs" icon={<Receipt size={40} />} />}
      </div>

      <Modal open={!!sel} onClose={() => setSel(null)} title={sel ? `Payment proof from ${sel.senderName || 'Unknown'}` : ''}>
        {sel && (
          <div>
            <div className="detail-grid">
              <div className="detail-item"><div className="k">Amount</div><div className="v">${Number(sel.amount).toLocaleString()}</div></div>
              <div className="detail-item"><div className="k">Method</div><div className="v">{sel.method}</div></div>
              <div className="detail-item"><div className="k">Sender</div><div className="v dim">{sel.senderName || '—'} {sel.senderPhone ? `· ${sel.senderPhone}` : ''}</div></div>
              <div className="detail-item"><div className="k">Reference</div><div className="v mono">{sel.referenceNumber || '—'}</div></div>
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
            {sel.imagePath && (
              <div style={{ margin: '14px 0' }}>
                <label className="label">Transfer screenshot</label>
                <div
                  style={{ cursor: 'pointer', display: 'inline-block', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}
                  onClick={() => setLightbox([proofUrl(sel.imagePath)])}
                >
                  <img
                    src={proofUrl(sel.imagePath)}
                    alt="proof"
                    style={{ maxHeight: 220, display: 'block', objectFit: 'cover' }}
                  />
                </div>
              </div>
            )}
            {sel.notes && <div className="quote">{sel.notes}</div>}
            <div className="field" style={{ marginTop: 12 }}>
              <label className="label">Admin notes</label>
              <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional note…" />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-success" onClick={() => act('Approved')}>Approve</button>
              <button className="btn btn-danger" onClick={() => act('Rejected')}>Reject</button>
            </div>
          </div>
        )}
      </Modal>
      {lightbox && <ImageLightbox images={lightbox} index={0} onClose={() => setLightbox(null)} />}
    </>
  )
}
