import { useState, useEffect, useCallback, useRef } from 'react'
import { Users as UsersIcon, Eye, Wallet as WalletIcon, Bell, Send, Activity, Camera, Briefcase, Star, MessageCircle, Globe, Clock, MapPin, Shield, Zap, X, ChevronRight, TrendingUp, Download, Trash2 } from 'lucide-react'
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr'
import { get, put, post, del, errMsg } from '../api/client'
import { API_BASE } from '../config'
import { tokenStore } from '../api/client'
import { useToast } from '../components/Toast'
import { Loader, Empty, StatusBadge, UserCell, Avatar } from '../components/ui'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import { useSearch } from '../context/SearchContext'

const STATUS_OPTIONS = ['Active', 'Inactive', 'Blocked', 'Suspended', 'PendingVerification']

function getTimeAgo(date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 10) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function DetailBlock({ title, icon: Icon, children }) {
  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Icon size={15} style={{ color: 'var(--primary)' }} />
        <strong style={{ fontSize: 13.5 }}>{title}</strong>
      </div>
      {children}
    </div>
  )
}

function KV({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-light, rgba(255,255,255,0.06))', fontSize: 13 }}>
      <span style={{ color: 'var(--text-dim)' }}>{label}</span>
      <span style={{ fontWeight: 600, textAlign: 'right', maxWidth: '60%' }}>{value ?? '—'}</span>
    </div>
  )
}

function OnlineIndicator({ isOnline, page, description }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: isOnline ? '#10B981' : '#6B7280', boxShadow: isOnline ? '0 0 6px #10B981' : 'none' }} />
      <span style={{ color: isOnline ? '#10B981' : 'var(--text-faint)' }}>
        {isOnline ? (description || `On ${page}`) : 'Offline'}
      </span>
    </div>
  )
}

export default function Users() {
  const toast = useToast()
  const { query } = useSearch()
  const [data, setData] = useState(null)
  const [role, setRole] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [sel, setSel] = useState(null)
  const [selDetail, setSelDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [deduct, setDeduct] = useState(null)
  const [dedForm, setDedForm] = useState({ amount: '', reason: '' })
  const [busy, setBusy] = useState(false)
  const [notifyUser, setNotifyUser] = useState(null)
  const [notifyForm, setNotifyForm] = useState({ title: '', body: '' })
  const [broadcastOpen, setBroadcastOpen] = useState(false)
  const [broadcastForm, setBroadcastForm] = useState({ role: '', title: '', body: '' })
  const [broadcastBusy, setBroadcastBusy] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState({})
  const [liveActivity, setLiveActivity] = useState([])
  const [livePage, setLivePage] = useState(null)
  const [confirmBan, setConfirmBan] = useState(null)
  const [confirmDeduct, setConfirmDeduct] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [busyAction, setBusyAction] = useState(false)
  const connRef = useRef(null)
  const watchedUserId = useRef(null)

  // SignalR connection — created ONCE, never destroyed/recreated
  useEffect(() => {
    const token = tokenStore.getAccess()
    if (!token || connRef.current) return

    const conn = new HubConnectionBuilder()
      .withUrl(`${API_BASE.replace(/\/api$/, '')}/hubs/admin-tracking`, { accessTokenFactory: () => tokenStore.getAccess() })
      .withAutomaticReconnect([0, 2, 5, 10])
      .configureLogging(LogLevel.Information)
      .build()

    conn.on('OnlineUsers', (users) => setOnlineUsers(users))

    conn.on('UserActivityUpdate', (data) => {
      if (watchedUserId.current && data.userId === watchedUserId.current) {
        setLivePage(data.currentPage)
        if (data.recentActivity) setLiveActivity(data.recentActivity)
      }
    })

    conn.on('UserActivityHistory', (userId, history) => {
      if (watchedUserId.current && userId === watchedUserId.current) {
        setLiveActivity(history || [])
      }
    })

    conn.start().then(() => {
      conn.invoke('GetOnlineUsers').catch(() => {})
    }).catch(() => {})

    connRef.current = conn
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page: 1, pageSize: 100 }
      if (role) params.role = role
      setData(await get('/users', params))
    } catch (e) { toast.error(errMsg(e)) } finally { setLoading(false) }
  }, [page, role])

  useEffect(() => { load() }, [load])

  const changeStatus = async (id, status) => {
    try {
      await put(`/admin/users/${id}/status`, { status })
      toast.success(`Status → ${status}`)
      setSel(null)
      load()
    } catch (e) { toast.error(errMsg(e)) }
  }

  const setFeatured = async (u, featured) => {
    try {
      await put(`/users/${u.id}`, { isFeatured: featured })
      toast.success(featured ? `${u.displayName || u.userName} is now featured` : `Removed from featured`)
      setSel(null)
      load()
    } catch (e) { toast.error(errMsg(e)) }
  }

  const setVerification = async (u, level) => {
    try {
      await put(`/users/${u.id}`, { verificationLevel: level })
      toast.success(`Verification → ${level}`)
      setSel(null)
      load()
    } catch (e) { toast.error(errMsg(e)) }
  }

  const toggleBan = async (u) => {
    setConfirmBan(u)
  }

  const doBan = async () => {
    const u = confirmBan
    if (!u) return
    setBusyAction(true)
    try {
      await put(`/users/${u.id}/ban`, { banned: u.status !== 'Banned' })
      toast.success(u.status !== 'Banned' ? 'User banned' : 'User restored')
      setConfirmBan(null)
      setSel(null)
      load()
    } catch (e) { toast.error(errMsg(e)) } finally { setBusyAction(false) }
  }

  const doDelete = async () => {
    const u = confirmDelete
    if (!u) return
    setBusyAction(true)
    try {
      await del(`/users/${u.id}`)
      toast.success(`${u.displayName || u.userName || 'User'} deleted`)
      setConfirmDelete(null)
      setSel(null)
      load()
    } catch (e) { toast.error(errMsg(e)) } finally { setBusyAction(false) }
  }

  const openDetail = async (u) => {
    setSel(u)
    setSelDetail(null)
    setLiveActivity([])
    setLivePage(null)
    setDetailLoading(true)

    // Set watched user immediately (synchronous, no race condition)
    watchedUserId.current = u.id

    try {
      const detail = await get(`/admin/users/${u.id}/detail`)
      setSelDetail(detail)
    } catch (e) { toast.error('Could not load user details') } finally { setDetailLoading(false) }

    // Watch this user for real-time activity (wait for connection if needed)
    try {
      const conn = connRef.current
      if (conn) {
        if (conn.state === 'Connected') {
          await conn.invoke('WatchUser', u.id)
        } else {
          conn.onreconnected(async () => {
            if (watchedUserId.current === u.id) {
              await conn.invoke('WatchUser', u.id).catch(() => {})
            }
          })
        }
      }
    } catch { /* ignore */ }
  }

  const closeDetail = async () => {
    const prevId = watchedUserId.current
    watchedUserId.current = null
    setSel(null)
    setSelDetail(null)
    setLiveActivity([])
    setLivePage(null)
    if (prevId && connRef.current?.state === 'Connected') {
      try { await connRef.current.invoke('UnwatchUser', prevId) } catch { /* ignore */ }
    }
  }

  const submitDeduct = async (e) => {
    e.preventDefault()
    if (!deduct) return
    if (!dedForm.amount || Number(dedForm.amount) <= 0) { toast.error('Enter a valid amount'); return }
    if (!dedForm.reason.trim()) { toast.error('A reason is required'); return }
    setConfirmDeduct(true)
  }

  const doDeduct = async () => {
    setBusyAction(true)
    try {
      const res = await post(`/admin/wallet/${deduct.id}/deduct`, {
        amount: Number(dedForm.amount),
        reason: dedForm.reason.trim(),
      })
      toast.success(res.message || 'Amount deducted')
      setConfirmDeduct(false)
      setDeduct(null)
      setDedForm({ amount: '', reason: '' })
      load()
    } catch (err) { toast.error(errMsg(err)) } finally { setBusyAction(false) }
  }

  const sendNotification = async (e) => {
    e.preventDefault()
    if (!notifyUser || !notifyForm.title.trim()) return
    setBusy(true)
    try {
      await post('/admin/notify', { userId: notifyUser.id, title: notifyForm.title, body: notifyForm.body })
      toast.success('Notification sent')
      setNotifyUser(null)
      setNotifyForm({ title: '', body: '' })
    } catch (err) { toast.error(errMsg(err)) } finally { setBusy(false) }
  }

  const sendBroadcast = async (e) => {
    e.preventDefault()
    if (!broadcastForm.title.trim()) return
    setBroadcastBusy(true)
    try {
      const res = await post('/admin/notify-broadcast', broadcastForm)
      toast.success(res.message || 'Broadcast sent')
      setBroadcastOpen(false)
      setBroadcastForm({ role: '', title: '', body: '' })
    } catch (err) { toast.error(errMsg(err)) } finally { setBroadcastBusy(false) }
  }

  const onlineCount = Object.keys(onlineUsers).length

  const ql = query.trim().toLowerCase()
  const rows = (data?.data || []).filter((u) => {
    if (!ql) return true
    return [u.displayName, u.userName, u.email, ...(u.roles || [])].some((v) => v && String(v).toLowerCase().includes(ql))
  })

  const exportCsv = () => {
    if (rows.length === 0) { toast.info('Nothing to export'); return }
    const header = ['Name', 'Email', 'Roles', 'Status', 'Verification', 'Featured', 'Joined']
    const lines = rows.map((u) => [
      u.displayName || u.userName || u.email || '',
      u.email || '',
      (u.roles || []).join('|'),
      u.status || '',
      u.verificationLevel || '',
      u.isFeatured ? 'Yes' : 'No',
      u.createdAt ? new Date(u.createdAt).toISOString().slice(0, 10) : '',
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
    const blob = new Blob([[header.join(','), ...lines].join('\r\n')], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `users-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
    toast.success(`Exported ${rows.length} users`)
  }

  if (loading && !data) return <Loader />

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, marginBottom: 4 }}>Users</h1>
          <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>
            All marketplace accounts.
            {onlineCount > 0 && <span style={{ marginLeft: 8, color: '#10B981', fontWeight: 600 }}><span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#10B981', marginRight: 4 }} />{onlineCount} online now</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn btn-outline btn-sm" onClick={exportCsv}>
            <Download size={14} /> Export CSV
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => setBroadcastOpen(true)}>
            <Send size={14} /> Broadcast notification
          </button>
        </div>
      </div>

      {/* Online users bar */}
      {onlineCount > 0 && (
        <div className="card" style={{ padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', background: 'rgba(16,185,129,0.05)', borderColor: 'rgba(16,185,129,0.2)' }}>
          <Activity size={15} style={{ color: '#10B981' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#10B981' }}>LIVE:</span>
          {Object.entries(onlineUsers).slice(0, 12).map(([uid, u]) => (
            <div key={uid} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, background: 'rgba(16,185,129,0.1)', fontSize: 12, cursor: 'pointer' }} onClick={() => {
              const row = data?.data?.find((x) => x.id === uid)
              if (row) openDetail(row)
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
              <span style={{ fontWeight: 600 }}>{u.displayName}</span>
              <span style={{ color: 'var(--text-faint)' }}>· {u.page}</span>
            </div>
          ))}
          {onlineCount > 12 && <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>+{onlineCount - 12} more</span>}
        </div>
      )}

      <div className="toolbar">
        <div className="pill-tabs">
          <button className={`pill-tab${role === '' ? ' active' : ''}`} onClick={() => setRole('')}>All</button>
          {['Admin', 'SuperAdmin', 'Model', 'Brand', 'Agency'].map((r) => (
            <button key={r} className={`pill-tab${role === r ? ' active' : ''}`} onClick={() => { setRole(r); setPage(1) }}>{r}</button>
          ))}
        </div>
      </div>

      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr><th>User</th><th>Roles</th><th>Status</th><th>Online</th><th>Joined</th><th style={{ textAlign: 'right' }}>Actions</th></tr>
            </thead>
            <tbody>
              {rows.map((u) => {
                const online = onlineUsers[u.id]
                return (
                  <tr key={u.id}>
                    <td style={{ minWidth: 200 }}><UserCell name={u.displayName || u.userName || u.email} email={u.email} img={u.profilePictureUrl} /></td>
                    <td><div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>{(u.roles || []).map((r) => <span key={r} className={`badge badge-${r === 'Admin' || r === 'SuperAdmin' ? 'violet' : r === 'Model' ? 'blue' : r === 'Brand' ? 'amber' : 'green'}`}>{r}</span>)}</div></td>
                    <td><StatusBadge status={u.status} /></td>
                    <td><OnlineIndicator isOnline={!!online} page={online?.page} description={online?.activityDescription} /></td>
                    <td style={{ color: 'var(--text-dim)', fontSize: 13 }}>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 2 }}>
                        {u.isFeatured && <span className="badge badge-amber">Featured</span>}
                        {u.verificationLevel && u.verificationLevel !== 'Unverified' && <span className="badge badge-green">{u.verificationLevel}</span>}
                      </div>
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-outline btn-sm" onClick={() => openDetail(u)}><Eye size={14} /> Manage</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <Empty title={ql ? 'No matching users' : 'No users found'} message={ql ? 'Nothing matches the global search.' : 'Try a different filter.'} icon={<UsersIcon size={40} />} />}
      </div>

      {/* ==================== FULL USER DETAIL MODAL ==================== */}
      <Modal open={!!sel} onClose={closeDetail} title="User detail" width={700}>
        {sel && (
          <div>
            {/* Header */}
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '16px', background: 'var(--bg)', borderRadius: 12, marginBottom: 16 }}>
              <Avatar src={sel.profilePictureUrl} name={sel.displayName || sel.userName} size={60} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{sel.displayName || sel.userName}</div>
                <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>{sel.email}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                  {(sel.roles || []).map((r) => <span key={r} className={`badge badge-${r === 'Admin' || r === 'SuperAdmin' ? 'violet' : r === 'Model' ? 'blue' : r === 'Brand' ? 'amber' : 'green'}`}>{r}</span>)}
                  <StatusBadge status={sel.status} />
                  {sel.isFeatured && <span className="badge badge-amber">Featured</span>}
                  {sel.verificationLevel && sel.verificationLevel !== 'Unverified' && <span className="badge badge-green">{sel.verificationLevel}</span>}
                </div>
              </div>
              <OnlineIndicator isOnline={!!onlineUsers[sel.id]} page={livePage || onlineUsers[sel.id]?.page} description={onlineUsers[sel.id]?.activityDescription} />
            </div>

            {detailLoading ? (
              <div style={{ padding: 30, textAlign: 'center' }}><Loader /></div>
            ) : selDetail ? (
              <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: 4 }}>
                {/* Quick stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 8 }}>
                  {[
                    { label: 'Bookings', value: selDetail.bookingsTotal, icon: Briefcase, color: '#8B5CF6' },
                    { label: 'Reviews', value: selDetail.reviewCount, icon: Star, color: '#F59E0B' },
                    { label: 'Rating', value: selDetail.averageRating ? `${selDetail.averageRating}★` : '—', icon: Star, color: '#F59E0B' },
                    { label: 'Posts', value: selDetail.postsCount, icon: Camera, color: '#EC4899' },
                    { label: 'Media', value: selDetail.mediaCount, icon: Camera, color: '#3B82F6' },
                    { label: 'Wallet', value: selDetail.walletBalance != null ? `$${selDetail.walletBalance}` : '—', icon: WalletIcon, color: '#10B981' },
                  ].map((s, i) => (
                    <div key={i} style={{ padding: '12px', borderRadius: 10, background: `${s.color}08`, border: `1px solid ${s.color}15`, textAlign: 'center' }}>
                      <s.icon size={16} style={{ color: s.color, marginBottom: 4 }} />
                      <div style={{ fontWeight: 800, fontSize: 18 }}>{s.value ?? '—'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Account info */}
                <DetailBlock title="Account info" icon={Shield}>
                  <KV label="User ID" value={<span className="mono" style={{ fontSize: 11 }}>{selDetail.id}</span>} />
                  <KV label="Phone" value={selDetail.phoneNumber || '—'} />
                  <KV label="Joined" value={selDetail.createdAt ? new Date(selDetail.createdAt).toLocaleString() : '—'} />
                  <KV label="Last login" value={selDetail.lastLoginAt ? new Date(selDetail.lastLoginAt).toLocaleString() : '—'} />
                  <KV label="Last updated" value={selDetail.updatedAt ? new Date(selDetail.updatedAt).toLocaleString() : '—'} />
                  {selDetail.castingsPosted != null && <KV label="Castings posted" value={selDetail.castingsPosted} />}
                  {selDetail.castingAppsReceived != null && <KV label="Casting applicants" value={selDetail.castingAppsReceived} />}
                  {selDetail.castingAppsSent != null && <KV label="Casting apps sent" value={selDetail.castingAppsSent} />}
                  {selDetail.castingsShortlisted != null && <KV label="Shortlisted" value={selDetail.castingsShortlisted} />}
                  {selDetail.castingsAccepted != null && <KV label="Accepted" value={selDetail.castingsAccepted} />}
                  <KV label="Campaign apps" value={selDetail.campaignAppsSent} />
                  <KV label="Stories" value={selDetail.storiesCount} />
                  <KV label="Portfolio views" value={selDetail.totalViews} />
                </DetailBlock>

                {/* Social accounts */}
                {selDetail.socialAccounts?.length > 0 && (
                  <DetailBlock title="Social accounts" icon={Globe}>
                    {selDetail.socialAccounts.map((s, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border-light, rgba(255,255,255,0.06))', fontSize: 13 }}>
                        <Globe size={13} style={{ color: 'var(--text-faint)' }} />
                        <span style={{ fontWeight: 600 }}>{s.platform}</span>
                        <span style={{ color: 'var(--text-dim)' }}>@{s.username}</span>
                        <span style={{ marginLeft: 'auto', fontWeight: 600 }}>{s.followersCount?.toLocaleString()} followers</span>
                      </div>
                    ))}
                  </DetailBlock>
                )}

                {/* Recent transactions */}
                {selDetail.recentTransactions?.length > 0 && (
                  <DetailBlock title="Recent wallet transactions" icon={WalletIcon}>
                    {selDetail.recentTransactions.map((t, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--border-light, rgba(255,255,255,0.06))', fontSize: 13 }}>
                        <Zap size={12} style={{ color: t.amount > 0 ? '#10B981' : '#EF4444' }} />
                        <span style={{ flex: 1, color: 'var(--text-dim)' }}>{t.description || t.type}</span>
                        <span style={{ fontWeight: 700, color: t.amount > 0 ? '#10B981' : '#EF4444' }}>{t.amount > 0 ? '+' : ''}{t.amount}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{new Date(t.createdAt).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </DetailBlock>
                )}

                {/* Real-time Activity timeline */}
                <DetailBlock title="Live activity" icon={Activity}>
                  {liveActivity.length === 0 ? (
                    <div style={{ padding: '16px 0', textAlign: 'center' }}>
                      <Activity size={24} style={{ opacity: 0.2, marginBottom: 8 }} />
                      {onlineUsers[sel.id] ? (
                        <div>
                          <div style={{ color: '#10B981', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>User is online</div>
                          <div style={{ color: 'var(--text-faint)', fontSize: 11 }}>Waiting for activity... navigate on the website to see updates</div>
                          <button className="btn btn-ghost btn-sm" style={{ marginTop: 8, fontSize: 11 }} onClick={() => {
                            connRef.current?.invoke('WatchUser', sel.id).catch(() => {})
                          }}>Retry connection</button>
                        </div>
                      ) : (
                        <div style={{ color: 'var(--text-faint)', fontSize: 12 }}>User is offline — no live data.</div>
                      )}
                    </div>
                  ) : (
                    <div style={{ position: 'relative', paddingLeft: 20, maxHeight: 300, overflowY: 'auto' }}>
                      <div style={{ position: 'absolute', left: 6, top: 4, bottom: 4, width: 2, background: 'var(--border)' }} />
                      {liveActivity.map((a, i) => {
                        const pageColor = a.page === 'Connected' ? '#10B981' : a.page === 'Disconnected' ? '#EF4444' : '#3B82F6'
                        const timeAgo = getTimeAgo(new Date(a.timestamp))
                        return (
                          <div key={i} style={{ position: 'relative', padding: '8px 0 8px 16px', fontSize: 12.5 }}>
                            <div style={{ position: 'absolute', left: -2, top: 12, width: 10, height: 10, borderRadius: '50%', background: pageColor, border: '2px solid var(--bg)' }} />
                            <div style={{ fontWeight: 600 }}>
                              {a.page === 'Connected' ? '🟢 Connected' : a.page === 'Disconnected' ? '🔴 Disconnected' : `📍 ${a.description || `Navigated to ${a.page}`}`}
                            </div>
                            <div style={{ color: 'var(--text-faint)', fontSize: 11, marginTop: 2 }}>{a.page} · {timeAgo} · {new Date(a.timestamp).toLocaleTimeString()}</div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </DetailBlock>

                {/* Actions */}
                <DetailBlock title="Actions" icon={Zap}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="btn btn-outline btn-sm" onClick={() => { setDeduct(sel); setDedForm({ amount: '', reason: '' }) }}>
                      <WalletIcon size={13} /> Deduct wallet
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={() => { setNotifyUser(sel); setNotifyForm({ title: '', body: '' }) }}>
                      <Bell size={13} /> Notify
                    </button>
                    <button className={`btn ${sel.isFeatured ? 'btn-ghost' : 'btn-outline'} btn-sm`} onClick={() => setFeatured(sel, !sel.isFeatured)}>
                      {sel.isFeatured ? 'Unfeature' : 'Feature'}
                    </button>
                    <button className={`btn ${sel.status === 'Banned' ? 'btn-success' : 'btn-danger'} btn-sm`} onClick={() => toggleBan(sel)}>
                      {sel.status === 'Banned' ? 'Unban' : 'Ban'}
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(sel)}>
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <label style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6, display: 'block' }}>Set status</label>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {STATUS_OPTIONS.map((s) => (
                        <button key={s} className={`btn btn-sm ${s === sel.status ? 'btn-primary' : 'btn-ghost'}`} onClick={() => changeStatus(sel.id, s)} disabled={s === sel.status} style={{ fontSize: 11 }}>{s}</button>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <label style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6, display: 'block' }}>Verification</label>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {['Unverified', 'EmailVerified', 'IdentityVerified'].map((l) => (
                        <button key={l} className={`btn btn-sm ${l === (sel.verificationLevel || 'Unverified') ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setVerification(sel, l)} disabled={l === (sel.verificationLevel || 'Unverified')} style={{ fontSize: 11 }}>{l}</button>
                      ))}
                    </div>
                  </div>
                </DetailBlock>
              </div>
            ) : (
              <p style={{ color: 'var(--text-dim)', textAlign: 'center', padding: 20 }}>Could not load user details.</p>
            )}
          </div>
        )}
      </Modal>

      {/* Deduct modal */}
      <Modal open={!!deduct} onClose={() => setDeduct(null)} title={`Deduct from ${deduct?.displayName || deduct?.userName || 'wallet'}`}>
        {deduct && (
          <form onSubmit={submitDeduct}>
            <p style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 14 }}>Immediately removes funds from this user's available balance.</p>
            <div className="field">
              <label>Amount (USD) *</label>
              <input type="number" required min="0.01" step="0.01" value={dedForm.amount} onChange={(e) => setDedForm({ ...dedForm, amount: e.target.value })} />
            </div>
            <div className="field">
              <label>Reason *</label>
              <textarea rows={3} value={dedForm.reason} onChange={(e) => setDedForm({ ...dedForm, reason: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setDeduct(null)}>Cancel</button>
              <button type="submit" className="btn btn-danger" style={{ flex: 1 }} disabled={busy}>Deduct</button>
            </div>
          </form>
        )}
      </Modal>

      {/* Notify modal */}
      <Modal open={!!notifyUser} onClose={() => setNotifyUser(null)} title={`Notify ${notifyUser?.displayName || 'user'}`}>
        {notifyUser && (
          <form onSubmit={sendNotification}>
            <div className="field">
              <label>Title *</label>
              <input required value={notifyForm.title} onChange={(e) => setNotifyForm({ ...notifyForm, title: e.target.value })} />
            </div>
            <div className="field">
              <label>Message</label>
              <textarea rows={3} value={notifyForm.body} onChange={(e) => setNotifyForm({ ...notifyForm, body: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setNotifyUser(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={busy || !notifyForm.title.trim()}><Send size={14} /> Send</button>
            </div>
          </form>
        )}
      </Modal>

      {/* Broadcast modal */}
      <Modal open={broadcastOpen} onClose={() => setBroadcastOpen(false)} title="Broadcast notification">
        <form onSubmit={sendBroadcast}>
          <div className="field">
            <label>Target role</label>
            <select value={broadcastForm.role} onChange={(e) => setBroadcastForm({ ...broadcastForm, role: e.target.value })}>
              <option value="">All users</option>
              {['Model', 'Brand', 'Agency'].map((r) => <option key={r} value={r}>{r}s</option>)}
            </select>
          </div>
          <div className="field">
            <label>Title *</label>
            <input required value={broadcastForm.title} onChange={(e) => setBroadcastForm({ ...broadcastForm, title: e.target.value })} />
          </div>
          <div className="field">
            <label>Message</label>
            <textarea rows={3} value={broadcastForm.body} onChange={(e) => setBroadcastForm({ ...broadcastForm, body: e.target.value })} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setBroadcastOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={broadcastBusy || !broadcastForm.title.trim()}><Send size={14} /> Broadcast</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmBan}
        title={confirmBan?.status === 'Banned' ? 'Restore user?' : 'Ban user?'}
        message={
          confirmBan
            ? (confirmBan.status === 'Banned'
              ? `${confirmBan.displayName || confirmBan.userName} will regain access to the platform.`
              : `${confirmBan.displayName || confirmBan.userName} will immediately lose access to their account and be signed out.`)
            : ''
        }
        confirmLabel={confirmBan?.status === 'Banned' ? 'Restore' : 'Ban'}
        busy={busyAction}
        onClose={() => setConfirmBan(null)}
        onConfirm={doBan}
      />

      <ConfirmDialog
        open={!!confirmDeduct}
        title="Confirm deduction"
        message={`Deduct $${dedForm.amount} from ${deduct?.displayName || deduct?.userName || 'this user'}'s wallet? Reason: "${dedForm.reason}"`}
        confirmLabel="Deduct"
        busy={busyAction}
        onClose={() => setConfirmDeduct(false)}
        onConfirm={doDeduct}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete user?"
        message={
          confirmDelete
            ? `${confirmDelete.displayName || confirmDelete.userName || 'This user'} will be permanently removed. This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        busy={busyAction}
        onClose={() => setConfirmDelete(null)}
        onConfirm={doDelete}
      />
    </>
  )
}
