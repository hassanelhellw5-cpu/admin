import { useState, useEffect, useCallback } from 'react'
import { Flag, Eye, Ban, AlertTriangle, CheckCircle, XCircle, ExternalLink, User, MessageSquare, ShieldAlert } from 'lucide-react'
import { get, put, post, errMsg } from '../api/client'
import { API_BASE } from '../config'
import { useToast } from '../components/Toast'
import { Loader, Empty, Pagination, StatusBadge, Avatar } from '../components/ui'
import Modal from '../components/Modal'
import ImageLightbox from '../components/ImageLightbox'

const API_ORIGIN = API_BASE.replace('/api', '') || 'https://brandmarketplace.runasp.net'
const resolveUrl = (u) => {
  if (!u) return ''
  if (u.startsWith('http')) return u
  return `${API_ORIGIN}${u.startsWith('/') ? '' : '/'}${u}`
}

function parseEvidence(s) {
  try {
    const arr = typeof s === 'string' ? JSON.parse(s) : s
    return Array.isArray(arr) ? arr.filter(Boolean) : []
  } catch { return [] }
}

export default function Reports() {
  const toast = useToast()
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [sel, setSel] = useState(null)
  const [resolution, setResolution] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [lightbox, setLightbox] = useState(null)
  const [warnModal, setWarnModal] = useState(null)
  const [warnMsg, setWarnMsg] = useState('Your account has received a warning due to a report violation. Please review our community guidelines.')
  const [banModal, setBanModal] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, pageSize: 20 }
      if (status) params.status = status
      const res = await get('/admin/reports', params)
      setData(res)
    } catch (e) {
      console.error('Reports load error:', e)
      toast.error(errMsg(e))
    } finally {
      setLoading(false)
    }
  }, [page, status])

  useEffect(() => { load() }, [load])

  const act = async (s) => {
    setActionLoading(true)
    try {
      const id = sel.id || sel.Id
      await put(`/admin/reports/${id}`, { status: s, resolution: resolution || (s === 'Resolved' ? 'Resolved by admin' : '') })
      toast.success(`Report ${s}`)
      setSel(null); setResolution('')
      load()
    } catch (e) { toast.error(errMsg(e)) } finally { setActionLoading(false) }
  }

  const warnUser = async () => {
    const userId = sel.targetUserId || sel.TargetUserId || sel.reporterUserId || sel.ReporterUserId
    if (!userId) { toast.error('No target user found'); return }
    setActionLoading(true)
    try {
      await post('/admin/notify', { userId, type: 'AdminMessage', title: 'Account Warning', body: warnMsg })
      const id = sel.id || sel.Id
      await put(`/admin/reports/${id}`, { status: 'Resolved', resolution: `Warning sent to user: ${warnMsg}` })
      toast.success('Warning sent to user')
      setWarnModal(null); setSel(null); setResolution(''); setWarnMsg('Your account has received a warning due to a report violation. Please review our community guidelines.')
      load()
    } catch (e) { toast.error(errMsg(e)) } finally { setActionLoading(false) }
  }

  const banUser = async () => {
    const userId = sel.targetUserId || sel.TargetUserId || sel.reporterUserId || sel.ReporterUserId
    if (!userId) { toast.error('No user to ban'); return }
    setActionLoading(true)
    try {
      await put(`/admin/users/${userId}/status`, { status: 'Banned' })
      const id = sel.id || sel.Id
      await put(`/admin/reports/${id}`, { status: 'Resolved', resolution: 'Reported user has been banned.' })
      toast.success('User banned')
      setBanModal(null); setSel(null); setResolution('')
      load()
    } catch (e) { toast.error(errMsg(e)) } finally { setActionLoading(false) }
  }

  const openReport = async (r) => {
    const id = r.id || r.Id
    try {
      const full = await get(`/admin/reports/${id}`)
      setSel({ ...r, ...full })
      setResolution(full.resolution || full.Resolution || '')
    } catch {
      setSel(r)
      setResolution(r.resolution || r.Resolution || '')
    }
  }

  const rows = data?.data || data || []
  const total = data?.total || 0
  const totalPages = Math.max(1, Math.ceil(total / 20))

  const evidence = sel ? parseEvidence(sel.evidenceUrls || sel.EvidenceUrls) : []
  const resolvedEvidence = evidence.map(resolveUrl)

  if (loading && !data) return <Loader />

  return (
    <>
      <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, marginBottom: 4 }}>Reports</h1>
      <p style={{ color: 'var(--text-dim)', marginBottom: 22 }}>User-submitted reports on content and profiles.</p>

      <div className="toolbar">
        <div className="pill-tabs">
          <button className={`pill-tab${status === '' ? ' active' : ''}`} onClick={() => { setStatus(''); setPage(1) }}>All</button>
          {['Pending', 'In Review', 'Resolved', 'Closed', 'Dismissed'].map((s) => (
            <button key={s} className={`pill-tab${status === s ? ' active' : ''}`} onClick={() => { setStatus(s); setPage(1) }}>{s}</button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Reason</th><th>Target</th><th>Reporter</th><th>Description</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
            <tbody>
              {rows.map((r) => {
                const id = r.id || r.Id
                const reason = r.reason || r.Reason || '—'
                const targetType = r.targetType || r.TargetType || ''
                const targetId = r.targetId || r.TargetId || ''
                const targetUserName = r.targetUserName || r.TargetUserName || r.targetUserEmail || r.TargetUserEmail || ''
                const reporterName = r.reporterName || r.ReporterName || r.reporterEmail || r.ReporterEmail || '—'
                const description = r.description || r.Description || '—'
                const reportStatus = r.status || r.Status || 'Pending'
                return (
                  <tr key={id}>
                    <td style={{ fontWeight: 600 }}>{reason}</td>
                    <td>
                      <span className="badge badge-violet">{targetType}</span>
                      {targetUserName && <span style={{ fontSize: 12, marginLeft: 6 }}>{targetUserName}</span>}
                    </td>
                    <td style={{ color: 'var(--text-dim)', fontSize: 13 }}>{reporterName}</td>
                    <td style={{ color: 'var(--text-dim)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{description}</td>
                    <td><StatusBadge status={reportStatus} /></td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <button className="btn btn-outline btn-sm" onClick={() => openReport(r)}><Eye size={13} /> Review</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && !loading && <Empty title="No reports" icon={<Flag size={40} />} />}
        {total > 0 && <div style={{ padding: '0 16px' }}><Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} /></div>}
      </div>

      {/* Detail / Action Modal */}
      <Modal open={!!sel} onClose={() => !actionLoading && setSel(null)} title={sel ? `Report — ${sel.targetUserName || sel.TargetUserName || sel.reason || sel.Reason || 'Report'}` : ''}>
        {sel && (
          <div>
            {/* Reporter info */}
            {(sel.reporterName || sel.ReporterName || sel.reporterEmail || sel.ReporterEmail || sel.reporterPhoto || sel.ReporterPhoto) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--bg)', borderRadius: 12, marginBottom: 16 }}>
                <Avatar src={(sel.reporterPhoto || sel.ReporterPhoto) ? resolveUrl(sel.reporterPhoto || sel.ReporterPhoto) : null} name={sel.reporterName || sel.ReporterName} size={40} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>Reporter: {sel.reporterName || sel.ReporterName || 'Unknown'}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>{sel.reporterEmail || sel.ReporterEmail || ''}</div>
                </div>
              </div>
            )}

            {/* Target user info */}
            {(sel.targetUserName || sel.TargetUserName || sel.targetUserEmail || sel.TargetUserEmail) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: (sel.targetUserStatus || sel.TargetUserStatus) === 'Banned' ? '#fef2f2' : 'var(--bg)', borderRadius: 12, marginBottom: 16 }}>
                <Avatar src={(sel.targetUserPhoto || sel.TargetUserPhoto) ? resolveUrl(sel.targetUserPhoto || sel.TargetUserPhoto) : null} name={sel.targetUserName || sel.TargetUserName} size={40} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>Reported user: {sel.targetUserName || sel.TargetUserName || 'Unknown'}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>{sel.targetUserEmail || sel.TargetUserEmail || ''}</div>
                </div>
                {(sel.targetUserStatus || sel.TargetUserStatus) && <StatusBadge status={sel.targetUserStatus || sel.TargetUserStatus} />}
              </div>
            )}

            <div className="detail-grid">
              <div className="detail-item"><div className="k">Reason</div><div className="v" style={{ fontWeight: 700 }}>{sel.reason || sel.Reason}</div></div>
              <div className="detail-item"><div className="k">Target</div><div className="v"><span className="badge badge-violet">{sel.targetType || sel.TargetType} #{sel.targetId || sel.TargetId}</span></div></div>
              <div className="detail-item"><div className="k">Status</div><div className="v"><StatusBadge status={sel.status || sel.Status} /></div></div>
              <div className="detail-item"><div className="k">Created</div><div className="v dim" style={{ fontSize: 13 }}>{new Date(sel.createdAt || sel.CreatedAt).toLocaleString()}</div></div>
              {(sel.resolution || sel.Resolution) && <div className="detail-item" style={{ gridColumn: '1 / -1' }}><div className="k">Resolution</div><div className="v">{sel.resolution || sel.Resolution}</div></div>}
            </div>

            {(sel.description || sel.Description) && (
              <div style={{ marginTop: 14 }}>
                <label className="label">Description</label>
                <div className="quote">{sel.description || sel.Description}</div>
              </div>
            )}

            {(sel.linkUrl || sel.LinkUrl) && (
              <div style={{ marginTop: 12 }}>
                <label className="label">Linked content</label>
                <a href={sel.linkUrl || sel.LinkUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ExternalLink size={14} /> {(sel.linkUrl || sel.LinkUrl).length > 60 ? (sel.linkUrl || sel.LinkUrl).slice(0, 60) + '…' : (sel.linkUrl || sel.LinkUrl)}
                </a>
              </div>
            )}

            {resolvedEvidence.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <label className="label">Evidence ({resolvedEvidence.length} file{resolvedEvidence.length > 1 ? 's' : ''})</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {resolvedEvidence.map((url, i) => (
                    <div key={i} style={{ position: 'relative', cursor: 'pointer', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}
                      onClick={() => setLightbox({ images: resolvedEvidence, index: i })}>
                      <img src={url} alt={`evidence ${i + 1}`} style={{ width: 110, height: 110, objectFit: 'cover', display: 'block' }} onError={(e) => { e.target.style.display = 'none' }} />
                      <div style={{ position: 'absolute', bottom: 4, right: 4, background: 'rgba(0,0,0,.6)', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 4 }}>#{i + 1}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="field">
                <label className="label">Resolution note</label>
                <textarea className="textarea" value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder="Resolution / action taken…" />
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn btn-success" disabled={actionLoading} onClick={() => act('Resolved')}><CheckCircle size={14} /> Resolve</button>
                <button className="btn btn-primary" disabled={actionLoading} onClick={() => act('In Review')}><Eye size={14} /> In Review</button>
                <button className="btn btn-outline" disabled={actionLoading} onClick={() => act('Dismissed')}><XCircle size={14} /> Dismiss</button>
                <button className="btn btn-outline" disabled={actionLoading} onClick={() => act('Closed')} style={{ borderColor: '#64748b', color: '#64748b' }}>Close</button>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn btn-sm" disabled={actionLoading} onClick={() => setWarnModal(sel)} style={{ background: '#f59e0b', color: '#fff' }}><AlertTriangle size={14} /> Warn User</button>
                <button className="btn btn-sm btn-danger" disabled={actionLoading} onClick={() => setBanModal(sel)}><Ban size={14} /> Ban User</button>
                {(sel.targetType === 'Post' || sel.TargetType === 'Post' || sel.targetType === 'Story' || sel.TargetType === 'Story') && (
                  <a href={`/content`} className="btn btn-outline btn-sm" style={{ textDecoration: 'none' }}><MessageSquare size={14} /> View Content</a>
                )}
                {(sel.targetUserId || sel.TargetUserId) && (
                  <a href={`/users?search=${sel.targetUserId || sel.TargetUserId}`} className="btn btn-outline btn-sm" style={{ textDecoration: 'none' }}><User size={14} /> View User</a>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Warn User Modal */}
      <Modal open={!!warnModal} onClose={() => !actionLoading && setWarnModal(null)} title="Send Warning">
        <div>
          <p style={{ color: 'var(--text-dim)', marginBottom: 14, fontSize: 13 }}>
            Send a warning notification to user <span className="mono">{warnModal?.targetUserId || warnModal?.TargetUserId || warnModal?.reporterUserId || warnModal?.ReporterUserId}</span>.
          </p>
          <div className="field">
            <label className="label">Warning message</label>
            <textarea className="textarea" value={warnMsg} onChange={(e) => setWarnMsg(e.target.value)} rows={4} />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button className="btn btn-sm" disabled={actionLoading} onClick={warnUser} style={{ background: '#f59e0b', color: '#fff' }}><ShieldAlert size={14} /> Send Warning</button>
            <button className="btn btn-outline btn-sm" disabled={actionLoading} onClick={() => setWarnModal(null)}>Cancel</button>
          </div>
        </div>
      </Modal>

      {/* Ban User Modal */}
      <Modal open={!!banModal} onClose={() => !actionLoading && setBanModal(null)} title="Ban User">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#fef2f2', borderRadius: 10, border: '1px solid #fecaca', marginBottom: 16 }}>
            <Ban size={18} color="#ef4444" />
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#991b1b' }}>This action will ban the user</div>
              <div style={{ fontSize: 12, color: '#b91c1c' }}>User <span className="mono">{banModal?.targetUserId || banModal?.TargetUserId || banModal?.reporterUserId || banModal?.ReporterUserId}</span> will be unable to log in.</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-danger btn-sm" disabled={actionLoading} onClick={banUser}><Ban size={14} /> Ban User</button>
            <button className="btn btn-outline btn-sm" disabled={actionLoading} onClick={() => setBanModal(null)}>Cancel</button>
          </div>
        </div>
      </Modal>

      {/* Image Lightbox */}
      {lightbox && (
        <ImageLightbox
          images={lightbox.images}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}
    </>
  )
}
