import { useState, useEffect, useCallback } from 'react'
import { Briefcase, Megaphone, CalendarDays, Pencil, Trash2, Save, X } from 'lucide-react'
import { get, put, del, errMsg } from '../api/client'
import { useToast } from '../components/Toast'
import { Loader, Empty, Pagination, StatusBadge } from '../components/ui'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'

const META = {
  bookings: { title: 'Bookings', icon: Briefcase, endpoint: '/bookings' },
  castings: { title: 'Castings', icon: Megaphone, endpoint: '/castings' },
  campaigns: { title: 'Campaigns', icon: Megaphone, endpoint: '/campaigns' },
  events: { title: 'Events', icon: CalendarDays, endpoint: '/events' },
}

const STATUSES = {
  castings: ['Open', 'Closed', 'Draft', 'Cancelled'],
  campaigns: ['Active', 'Draft', 'Completed', 'Cancelled'],
}

export default function Listings({ kind }) {
  const meta = META[kind]
  const toast = useToast()
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, pageSize: 20, sortBy: 'createdAt', sortOrder: 'desc' }
      if (status) params.status = status
      setData(await get(meta.endpoint, params))
    } catch (e) { toast.error(errMsg(e)) } finally { setLoading(false) }
  }, [page, status, meta.endpoint, toast])

  useEffect(() => { load() }, [load])

  if (loading && !data) return <Loader />
  const Icon = meta.icon

  const statuses = {
    bookings: ['Pending', 'Confirmed', 'InProgress', 'Completed', 'Cancelled'],
    castings: STATUSES.castings,
    campaigns: STATUSES.campaigns,
    events: ['Draft', 'Open', 'Published', 'Completed', 'Cancelled'],
  }[kind]

  const canManage = kind === 'castings' || kind === 'campaigns'

  const openEdit = (x) => {
    setEditing(x)
    setEditForm({
      status: x.status,
      ...(kind === 'castings' ? {
        title: x.title, description: x.description || '', location: x.location || '',
        budget: x.budget ?? '', currency: x.currency || 'USD',
      } : {
        name: x.name, description: x.description || '', objective: x.objective || '',
        budget: x.budget ?? '', currency: x.currency || 'USD',
      }),
    })
    setEditOpen(true)
  }

  const saveEdit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await put(`${meta.endpoint}/${editing.id}`, editForm)
      toast.success(`${meta.title.slice(0, -1)} updated`)
      setEditOpen(false)
      setEditing(null)
      load()
    } catch (err) { toast.error(errMsg(err)) } finally { setSaving(false) }
  }

  const removeRow = async (x) => {
    setDeleteTarget(x)
  }

  const doDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await del(`${meta.endpoint}/${deleteTarget.id}`)
      toast.success(`${meta.title.slice(0, -1)} deleted`)
      setDeleteTarget(null)
      load()
    } catch (err) { toast.error(errMsg(err)) } finally { setDeleting(false) }
  }

  const rows = (data?.data || []).map((x) => {
    if (kind === 'bookings') return {
      id: x.id, title: x.projectName || `Booking #${x.id}`, raw: x,
      sub: x.location || (x.isVirtual ? 'Virtual' : ''),
      meta: x.agreedFee != null ? `${x.currency || 'USD'} ${x.agreedFee}` : '',
      date: x.startDate, status: x.status,
    }
    return {
      id: x.id, title: x.title || x.name, raw: x,
      sub: x.location || x.category || x.objective || '',
      meta: x.budget != null || x.price != null ? `${x.currency || 'USD'} ${x.budget ?? x.price}` : '',
      date: x.startDate || x.createdAt, status: x.status,
    }
  })

  return (
    <>
      <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, marginBottom: 4 }}>{meta.title}</h1>
      <p style={{ color: 'var(--text-dim)', marginBottom: 22 }}>All {meta.title.toLowerCase()} across the platform.</p>

      <div className="toolbar">
        <div className="pill-tabs">
          <button className={`pill-tab${status === '' ? ' active' : ''}`} onClick={() => { setStatus(''); setPage(1) }}>All</button>
          {statuses.map((s) => (
            <button key={s} className={`pill-tab${status === s ? ' active' : ''}`} onClick={() => { setStatus(s); setPage(1) }}>{s}</button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>{kind === 'bookings' ? 'Booking' : 'Title'}</th><th>Location</th><th>Value</th><th>Date</th><th>Status</th>{canManage && <th style={{ textAlign: 'right' }}>Actions</th>}</tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><div className="cell-user"><div className="cell-avatar"><Icon size={15} /></div><div><div className="cell-name">{r.title}</div><div className="cell-sub">#{r.id}</div></div></div></td>
                  <td style={{ color: 'var(--text-dim)' }}>{r.sub || '—'}</td>
                  <td style={{ fontWeight: 600 }}>{r.meta || '—'}</td>
                  <td style={{ color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{r.date ? new Date(r.date).toLocaleDateString() : '—'}</td>
                  <td><StatusBadge status={r.status} /></td>
                  {canManage && (
                    <td>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button className="btn btn-outline btn-sm" onClick={() => openEdit(r.raw)}><Pencil size={13} /> Edit</button>
                        <button className="btn btn-outline btn-sm" style={{ color: 'var(--danger)', borderColor: 'rgba(244,63,94,0.4)' }} onClick={() => removeRow(r.raw)}><Trash2 size={13} /> Delete</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <Empty title={`No ${meta.title.toLowerCase()} found`} icon={<Icon size={40} />} />}
        {data && <div style={{ padding: '0 16px' }}><Pagination page={page} totalPages={data.totalPages || Math.max(1, Math.ceil((data.total || 0) / 20))} total={data.total} onChange={setPage} /></div>}
      </div>

      {canManage && editing && (
        <Modal open={editOpen} onClose={() => { setEditOpen(false); setEditing(null) }} title={`Edit ${editing.title || editing.name || meta.title.slice(0, -1)}`} width={540}>
          <form onSubmit={saveEdit}>
            <div className="field"><label>Status</label>
              <select value={editForm.status || ''} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                {(STATUSES[kind] || statuses).map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            {kind === 'castings' ? (
              <>
                <div className="field"><label>Title</label><input required value={editForm.title || ''} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} /></div>
                <div className="field"><label>Description</label><textarea rows={3} value={editForm.description || ''} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="field"><label>Location</label><input value={editForm.location || ''} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} /></div>
                  <div className="field"><label>Budget ($)</label><input type="number" value={editForm.budget || ''} onChange={(e) => setEditForm({ ...editForm, budget: e.target.value })} /></div>
                </div>
              </>
            ) : (
              <>
                <div className="field"><label>Campaign name</label><input required value={editForm.name || ''} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
                <div className="field"><label>Objective</label><input value={editForm.objective || ''} onChange={(e) => setEditForm({ ...editForm, objective: e.target.value })} /></div>
                <div className="field"><label>Description</label><textarea rows={3} value={editForm.description || ''} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} /></div>
                <div className="field"><label>Budget ($)</label><input type="number" value={editForm.budget || ''} onChange={(e) => setEditForm({ ...editForm, budget: e.target.value })} /></div>
              </>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="btn btn-ghost" onClick={() => { setEditOpen(false); setEditing(null) }}><X size={15} /> Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : <><Save size={15} /> Save changes</>}</button>
            </div>
          </form>
        </Modal>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete permanently?"
        message={`Delete "${deleteTarget?.title || deleteTarget?.name || ''}" permanently? This also removes its applications and cannot be undone.`}
        confirmLabel="Delete"
        busy={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={doDelete}
      />
    </>
  )
}
