import { useState, useEffect, useCallback } from 'react'
import { BadgeCheck } from 'lucide-react'
import { get, put, errMsg } from '../api/client'
import { useToast } from '../components/Toast'
import { Loader, Empty, StatusBadge, UserCell } from '../components/ui'
import Modal from '../components/Modal'
import ImageLightbox from '../components/ImageLightbox'
import { API_BASE } from '../config'

function resolveUrl(u) {
  if (!u) return ''
  if (u.startsWith('http')) return u
  const base = API_BASE.replace('/api', '') || 'https://brandmarketplace.runasp.net'
  return u.startsWith('/') ? `${base}${u}` : `${base}/${u}`
}

function parseJson(s) {
  try { return JSON.parse(s) } catch { return [] }
}

export default function Verifications() {
  const toast = useToast()
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [sel, setSel] = useState(null)
  const [form, setForm] = useState({ adminNotes: '', rejectionReason: '' })
  const [lightbox, setLightbox] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await get('/admin/verifications', status ? { status } : {}))
    } catch (e) { toast.error(errMsg(e)) } finally { setLoading(false) }
  }, [status])

  useEffect(() => { load() }, [load])

  const act = async (s) => {
    try {
      await put(`/admin/verifications/${sel.id}`, { status: s, adminNotes: form.adminNotes, rejectionReason: s === 'Rejected' ? form.rejectionReason : null })
      toast.success(`Verification ${s}`)
      setSel(null)
      load()
    } catch (e) { toast.error(errMsg(e)) }
  }

  if (loading && !data) return <Loader />

  const docs = sel ? parseJson(sel.documentUrls) : []

  return (
    <>
      <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, marginBottom: 4 }}>Verifications</h1>
      <p style={{ color: 'var(--text-dim)', marginBottom: 22 }}>Identity &amp; professional verification requests.</p>

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
            <thead><tr><th>User</th><th>Type</th><th>Document</th><th>Status</th><th>Created</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
            <tbody>
              {(data || []).map((v) => (
                <tr key={v.id}>
                  <td>
                    <UserCell
                      name={v.userDisplayName || v.userName || v.userId?.slice(0, 8)}
                      email={v.userEmail || v.userId}
                      img={v.userPhoto ? (v.userPhoto.startsWith('http') ? v.userPhoto : `${API_BASE.replace('/api', '') || 'https://brandmarketplace.runasp.net'}${v.userPhoto.startsWith('/') ? v.userPhoto : '/' + v.userPhoto}`) : null}
                    />
                  </td>
                  <td>{v.verificationType || '—'}</td>
                  <td style={{ color: 'var(--text-dim)' }}>{v.documentType || (parseJson(v.documentUrls).length ? `${parseJson(v.documentUrls).length} doc(s)` : '—')}</td>
                  <td><StatusBadge status={v.status} /></td>
                  <td style={{ color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{new Date(v.createdAt).toLocaleDateString()}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-outline btn-sm" onClick={() => { setSel(v); setForm({ adminNotes: v.adminNotes || '', rejectionReason: v.rejectionReason || '' }) }}>Review</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data?.length === 0 && <Empty title="No verification requests" icon={<BadgeCheck size={40} />} />}
      </div>

      <Modal open={!!sel} onClose={() => setSel(null)} title={sel ? `Verification — ${sel.userDisplayName || sel.userName || sel.userEmail || '#' + sel.id}` : ''}>
        {sel && (
          <div>
            <div className="detail-grid">
              <div className="detail-item"><div className="k">Type</div><div className="v">{sel.verificationType || '—'}</div></div>
              <div className="detail-item"><div className="k">Document type</div><div className="v dim">{sel.documentType || '—'}</div></div>
              <div className="detail-item"><div className="k">User</div><div className="v">{sel.userDisplayName || sel.userName || sel.userEmail || '—'}</div></div>
              <div className="detail-item"><div className="k">User ID</div><div className="v mono">{sel.userId}</div></div>
              <div className="detail-item"><div className="k">Status</div><div className="v"><StatusBadge status={sel.status} /></div></div>
            </div>

            {docs.length > 0 && (
              <div style={{ margin: '14px 0' }}>
                <label className="label">Documents</label>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {docs.map((d, i) => (
                    <div key={i} onClick={() => setLightbox({ images: docs.map(resolveUrl), index: i })} style={{ cursor: 'pointer', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', position: 'relative' }}>
                      <img src={resolveUrl(d)} alt={`doc ${i + 1}`} style={{ width: 110, height: 110, objectFit: 'cover', display: 'block' }} />
                      <div style={{ position: 'absolute', bottom: 4, right: 4, background: 'rgba(0,0,0,.6)', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 4 }}>#{i + 1}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {sel.selfieUrl && (
              <div style={{ margin: '14px 0' }}>
                <label className="label">Selfie</label>
                <div onClick={() => setLightbox({ images: [resolveUrl(sel.selfieUrl)], index: 0 })} style={{ cursor: 'pointer', display: 'inline-block', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <img src={resolveUrl(sel.selfieUrl)} alt="selfie" style={{ width: 110, height: 110, objectFit: 'cover', display: 'block' }} />
                </div>
              </div>
            )}

            <div className="field">
              <label className="label">Admin notes</label>
              <textarea className="textarea" value={form.adminNotes} onChange={(e) => setForm({ ...form, adminNotes: e.target.value })} placeholder="Optional note…" />
            </div>
            <div className="field">
              <label className="label">Rejection reason</label>
              <textarea className="textarea" value={form.rejectionReason} onChange={(e) => setForm({ ...form, rejectionReason: e.target.value })} placeholder="Required when rejecting…" />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-success" onClick={() => act('Approved')}>Approve</button>
              <button className="btn btn-danger" onClick={() => act('Rejected')}>Reject</button>
            </div>
          </div>
        )}
      </Modal>
      {lightbox && <ImageLightbox images={lightbox.images} index={lightbox.index} onClose={() => setLightbox(null)} />}
    </>
  )
}
