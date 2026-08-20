import { useState, useEffect, useCallback } from 'react'
import { FileText, Image, Bookmark, Trash2, Eye, Clock, User, X, Pencil, Save, ChevronLeft, ChevronRight, Play } from 'lucide-react'
import { get, put, del, errMsg } from '../api/client'
import { API_BASE } from '../config'
import { useToast } from '../components/Toast'
import { Loader, Empty, Pagination, Avatar } from '../components/ui'
import ConfirmDialog from '../components/ConfirmDialog'
import ImageLightbox from '../components/ImageLightbox'

const API_ORIGIN = API_BASE.replace('/api', '') || ''
const assetUrl = (u) => {
  if (!u) return ''
  if (u.startsWith('http')) return u
  // Relative paths need full backend origin since /uploads is not proxied
  const backend = API_ORIGIN || 'http://brandmarketplace.runasp.net'
  return `${backend}${u.startsWith('/') ? '' : '/'}${u}`
}

const TABS = [
  { id: 'posts', label: 'Posts', icon: FileText },
  { id: 'stories', label: 'Stories', icon: Image },
  { id: 'highlights', label: 'Highlights', icon: Bookmark },
]

function DetailModal({ item, type, onClose, onUpdated }) {
  const toast = useToast()
  const [edit, setEdit] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [lightbox, setLightbox] = useState(null)

  useEffect(() => {
    if (!item) return
    if (type === 'posts') setForm({ content: item.content || '' })
    else if (type === 'stories') setForm({ text: item.text || '' })
    else if (type === 'highlights') setForm({ title: item.title || '', coverColor: item.coverColor || '#8B5CF6' })
  }, [item, type])

  if (!item) return null

  const save = async () => {
    setSaving(true)
    try {
      if (type === 'posts') {
        await put(`/admin/posts/${item.id}`, { content: form.content })
      } else if (type === 'highlights') {
        await put(`/admin/highlights/${item.id}`, { title: form.title, coverColor: form.coverColor })
      }
      toast.success('Updated')
      setEdit(false)
      onUpdated?.()
    } catch (e) { toast.error(errMsg(e)) }
    finally { setSaving(false) }
  }

  const mediaUrls = (() => {
    if (type === 'posts') {
      try { return JSON.parse(item.mediaUrls || '[]') } catch { return [] }
    }
    if (type === 'stories') return item.mediaUrl ? [item.mediaUrl] : []
    if (type === 'highlights') return item.coverMediaUrl ? [item.coverMediaUrl] : []
    return []
  })()

  const highlightStories = type === 'highlights' && item.stories?.length > 0

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontWeight: 700, fontSize: 16 }}>
              {type === 'posts' ? 'Post' : type === 'stories' ? 'Story' : 'Highlight'} details
            </span>
            <span className="badge badge-violet" style={{ fontSize: 11 }}>ID: {item.id}</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {type !== 'stories' && (
              <button className="btn btn-outline btn-sm" onClick={() => setEdit((v) => !v)}>
                <Pencil size={13} /> {edit ? 'Cancel' : 'Edit'}
              </button>
            )}
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}><X size={18} /></button>
          </div>
        </div>
        <div className="modal-body">
          {/* User info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, padding: 14, background: 'var(--bg)', borderRadius: 12 }}>
            <Avatar src={item.userPhoto ? assetUrl(item.userPhoto) : null} name={item.userName} size={44} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{item.userName || 'Unknown'}</div>
              <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>{item.userEmail || ''}</div>
            </div>
            <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-faint)' }}>
              {item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}
            </div>
          </div>

          {/* Content */}
          {type === 'posts' && (
            <>
              <div className="detail-block">
                <div className="label">Content</div>
                {edit ? (
                  <textarea className="textarea" rows={4} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
                ) : (
                  <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text)' }}>{item.content || '(no text)'}</p>
                )}
                <div style={{ display: 'flex', gap: 16, marginTop: 12, color: 'var(--text-faint)', fontSize: 12.5 }}>
                  <span>❤️ {item.likesCount || 0} likes</span>
                  <span>💬 {item.commentsCount || 0} comments</span>
                  <span>↗️ {item.sharesCount || 0} shares</span>
                  <span>👁️ {item.viewsCount || 0} views</span>
                </div>
                {item.isPinned && <span className="badge badge-amber" style={{ marginTop: 8 }}>📌 Pinned</span>}
                {item.location && <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 6 }}>📍 {item.location}</div>}
              </div>

              {/* Likers */}
              {item.likers?.length > 0 && (
                <div className="detail-block">
                  <div className="label">Liked by ({item.likers.length})</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {item.likers.map((l) => (
                      <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: 'var(--bg)', borderRadius: 8, fontSize: 12.5 }}>
                        <Avatar src={l.profilePictureUrl ? assetUrl(l.profilePictureUrl) : null} name={l.displayName || l.userName} size={22} />
                        <span style={{ fontWeight: 600 }}>{l.displayName || l.userName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Comments */}
              {item.comments?.length > 0 && (
                <div className="detail-block">
                  <div className="label">Comments ({item.comments.length})</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {item.comments.map((c) => (
                      <div key={c.id} style={{ display: 'flex', gap: 10, padding: '10px 12px', background: 'var(--bg)', borderRadius: 10 }}>
                        <Avatar src={c.userPhoto ? assetUrl(c.userPhoto) : null} name={c.userName} size={28} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontWeight: 600, fontSize: 12.5 }}>{c.userName || 'User'}</span>
                            <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{new Date(c.createdAt).toLocaleString()}</span>
                          </div>
                          <p style={{ fontSize: 13, color: 'var(--text)', marginTop: 3, lineHeight: 1.5 }}>{c.content}</p>
                          {c.likesCount > 0 && <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>❤️ {c.likesCount}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sharers */}
              {item.sharers?.length > 0 && (
                <div className="detail-block">
                  <div className="label">Shared by ({item.sharers.length})</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {item.sharers.map((s, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: 'var(--bg)', borderRadius: 8, fontSize: 12.5 }}>
                        <Avatar src={s.userPhoto ? assetUrl(s.userPhoto) : null} name={s.userName} size={22} />
                        <span style={{ fontWeight: 600 }}>{s.userName || 'User'}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{s.createdAt ? new Date(s.createdAt).toLocaleDateString() : ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {type === 'stories' && (
            <div className="detail-block">
              <div className="label">Text</div>
              <p style={{ fontSize: 14, color: 'var(--text)' }}>{item.text || '(no text)'}</p>
              <div style={{ display: 'flex', gap: 16, marginTop: 8, color: 'var(--text-faint)', fontSize: 12.5 }}>
                <span>Type: <span className="badge badge-violet">{item.mediaType || 'Image'}</span></span>
                {item.expiresAt && <span>Expires: {new Date(item.expiresAt).toLocaleString()}</span>}
              </div>
            </div>
          )}

          {type === 'highlights' && (
            <div className="detail-block">
              <div className="label">Title</div>
              {edit ? (
                <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={{ width: '100%' }} />
              ) : (
                <p style={{ fontSize: 15, fontWeight: 600 }}>{item.title || 'Untitled'}</p>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
                <div className="label" style={{ margin: 0 }}>Cover color:</div>
                {edit ? (
                  <div style={{ display: 'flex', gap: 4 }}>
                    {['#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444'].map((c) => (
                      <button key={c} onClick={() => setForm({ ...form, coverColor: c })}
                        style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: form.coverColor === c ? '3px solid #333' : '3px solid transparent', cursor: 'pointer' }} />
                    ))}
                  </div>
                ) : (
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: item.coverColor || '#8B5CF6', border: '2px solid var(--border)' }} />
                )}
              </div>
              {highlightStories && (
                <div style={{ marginTop: 14 }}>
                  <div className="label">Stories ({item.stories.length})</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {item.stories.map((s) => (
                      <div key={s.id} style={{ cursor: 'pointer' }} onClick={() => setLightbox({ images: [assetUrl(s.mediaUrl)], index: 0 })}>
                        {s.mediaType === 'Video' ? (
                          <div style={{ position: 'relative', width: 70, height: 90, borderRadius: 8, overflow: 'hidden', background: '#111' }}>
                            <video src={assetUrl(s.mediaUrl)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <Play size={16} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', color: '#fff' }} />
                          </div>
                        ) : (
                          <img src={assetUrl(s.mediaUrl)} alt="" style={{ width: 70, height: 90, borderRadius: 8, objectFit: 'cover' }} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Media */}
          {mediaUrls.length > 0 && (
            <div className="detail-block">
              <div className="label">Media ({mediaUrls.length})</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {mediaUrls.map((url, i) => (
                  <div key={i} style={{ cursor: 'pointer' }} onClick={() => setLightbox({ images: mediaUrls.map(assetUrl), index: i })}>
                    {type === 'stories' && item.mediaType === 'Video' ? (
                      <div style={{ position: 'relative', width: 120, height: 120, borderRadius: 10, overflow: 'hidden', background: '#111' }}>
                        <video src={assetUrl(url)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <Play size={20} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', color: '#fff' }} />
                      </div>
                    ) : (
                      <img src={assetUrl(url)} alt="" style={{ width: 120, height: 120, borderRadius: 10, objectFit: 'cover', border: '1px solid var(--border)' }} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {edit && (
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setEdit(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={save} disabled={saving}>
                <Save size={14} /> {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          )}
        </div>
      </div>
      {lightbox && <ImageLightbox images={lightbox.images} index={lightbox.index} onClose={() => setLightbox(null)} />}
    </div>
  )
}

export default function ContentManagement() {
  const toast = useToast()
  const [tab, setTab] = useState('posts')
  const [data, setData] = useState(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [detailItem, setDetailItem] = useState(null)
  const [detailType, setDetailType] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await get(`/admin/${tab}`, { page, pageSize: 20 })
      setData(res)
    } catch (e) { toast.error(errMsg(e)) } finally { setLoading(false) }
  }, [tab, page])

  useEffect(() => { setPage(1) }, [tab])
  useEffect(() => { load() }, [load])

  const remove = async (id) => {
    setDeleteTarget(id)
  }

  const doDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await del(`/admin/${tab}/${deleteTarget}`)
      toast.success('Deleted')
      if (detailItem?.id === deleteTarget) { setDetailItem(null); setDetailType(null) }
      setDeleteTarget(null)
      load()
    } catch (e) { toast.error(errMsg(e)) } finally { setDeleting(false) }
  }

  const openDetail = async (id) => {
    try {
      const res = await get(`/admin/${tab}/${id}`)
      setDetailItem(res)
      setDetailType(tab)
    } catch (e) { toast.error(errMsg(e)) }
  }

  const formatDate = (s) => s ? new Date(s).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—'

  return (
    <>
      <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, marginBottom: 4 }}>Content Management</h1>
      <p style={{ color: 'var(--text-dim)', marginBottom: 22 }}>View, edit, and manage all posts, stories, and highlights.</p>

      <div className="toolbar">
        <div className="pill-tabs">
          {TABS.map((t) => (
            <button key={t.id} className={`pill-tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
              <t.icon size={14} style={{ verticalAlign: -2, marginRight: 6 }} />{t.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? <Loader /> : (
        <div className="card">
          <div className="table-wrap">
            {tab === 'posts' && (
              <table>
                <thead><tr><th>User</th><th>Content</th><th>Likes</th><th>Comments</th><th>Created</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
                <tbody>
                  {(data?.data || []).map((p) => (
                    <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => openDetail(p.id)}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Avatar src={p.userPhoto ? assetUrl(p.userPhoto) : null} name={p.userName} size={30} />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{p.userName || 'Unknown'}</div>
                            {p.userEmail && <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{p.userEmail}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-dim)' }}>{p.content || '(media only)'}</td>
                      <td>{p.likesCount || 0}</td>
                      <td>{p.commentsCount || 0}</td>
                      <td style={{ whiteSpace: 'nowrap', color: 'var(--text-dim)', fontSize: 12.5 }}>{formatDate(p.createdAt)}</td>
                      <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button className="btn btn-outline btn-sm" onClick={() => openDetail(p.id)}><Eye size={13} /> View</button>
                          <button className="btn btn-danger btn-sm" onClick={() => remove(p.id)}><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {tab === 'stories' && (
              <table>
                <thead><tr><th>User</th><th>Preview</th><th>Type</th><th>Text</th><th>Created</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
                <tbody>
                  {(data?.data || []).map((s) => (
                    <tr key={s.id} style={{ cursor: 'pointer' }} onClick={() => openDetail(s.id)}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Avatar src={s.userPhoto ? assetUrl(s.userPhoto) : null} name={s.userName} size={30} />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{s.userName || 'Unknown'}</div>
                            {s.userEmail && <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{s.userEmail}</div>}
                          </div>
                        </div>
                      </td>
                      <td>
                        {s.mediaUrl ? (
                          <div style={{ position: 'relative', width: 48, height: 48, borderRadius: 8, overflow: 'hidden' }}>
                            {s.mediaType === 'Video' ? (
                              <>
                                <video src={assetUrl(s.mediaUrl)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                <Play size={14} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', color: '#fff' }} />
                              </>
                            ) : (
                              <img src={assetUrl(s.mediaUrl)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            )}
                          </div>
                        ) : <span style={{ color: 'var(--text-faint)', fontSize: 12 }}>Text</span>}
                      </td>
                      <td><span className="badge badge-violet">{s.mediaType || 'Image'}</span></td>
                      <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-dim)' }}>{s.text || '—'}</td>
                      <td style={{ whiteSpace: 'nowrap', color: 'var(--text-dim)', fontSize: 12.5 }}>{formatDate(s.createdAt)}</td>
                      <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button className="btn btn-outline btn-sm" onClick={() => openDetail(s.id)}><Eye size={13} /> View</button>
                          <button className="btn btn-danger btn-sm" onClick={() => remove(s.id)}><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {tab === 'highlights' && (
              <table>
                <thead><tr><th>User</th><th>Title</th><th>Cover</th><th>Stories</th><th>Created</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
                <tbody>
                  {(data?.data || []).map((h) => (
                    <tr key={h.id} style={{ cursor: 'pointer' }} onClick={() => openDetail(h.id)}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Avatar src={h.userPhoto ? assetUrl(h.userPhoto) : null} name={h.userName} size={30} />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{h.userName || 'Unknown'}</div>
                            {h.userEmail && <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{h.userEmail}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ fontWeight: 600 }}>{h.title || 'Untitled'}</td>
                      <td>
                        {h.coverMediaUrl ? (
                          <img src={assetUrl(h.coverMediaUrl)} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                        ) : <div style={{ width: 36, height: 36, borderRadius: '50%', background: h.coverColor || '#8B5CF6', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 700, fontSize: 13 }}>{h.title?.[0] || 'H'}</div>}
                      </td>
                      <td><span className="badge badge-amber">{h.storyIds ? JSON.parse(h.storyIds).length : 0} stories</span></td>
                      <td style={{ whiteSpace: 'nowrap', color: 'var(--text-dim)', fontSize: 12.5 }}>{formatDate(h.createdAt)}</td>
                      <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button className="btn btn-outline btn-sm" onClick={() => openDetail(h.id)}><Eye size={13} /> View</button>
                          <button className="btn btn-danger btn-sm" onClick={() => remove(h.id)}><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {data?.data?.length === 0 && <Empty title={`No ${tab} found`} icon={<FileText size={40} />} />}
          {data && <div style={{ padding: '0 16px' }}><Pagination page={page} totalPages={data.totalPages} total={data.total} onChange={setPage} /></div>}
        </div>
      )}

      {/* Detail modal */}
      {detailItem && (
        <DetailModal
          item={detailItem}
          type={detailType}
          onClose={() => { setDetailItem(null); setDetailType(null) }}
          onUpdated={load}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete permanently?"
        message="This item will be deleted permanently and cannot be undone."
        confirmLabel="Delete"
        busy={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={doDelete}
      />
    </>
  )
}
