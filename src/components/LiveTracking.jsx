import { useState, useEffect, useRef } from 'react'
import { Users, Radio, Globe, X } from 'lucide-react'
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr'
import { API_BASE } from '../config'
import { tokenStore } from '../api/client'

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

const PAGE_COLORS = {
  'Connected': '#10b981', 'Disconnected': '#ef4444',
  'Feed': '#ec4899', 'Dashboard': '#3b82f6', 'Messages': '#8b5cf6', 'Explore': '#10b981',
  'Marketplace': '#f59e0b', 'Wallet': '#10b981', 'My Profile': '#ec4899',
  'Castings': '#f59e0b', 'Campaigns': '#f97316', 'Events': '#06b6d4',
  'Contracts': '#8b5cf6', 'In Meeting': '#ef4444', 'Prediction Lab': '#7c3aed',
  'Analytics': '#3b82f6', 'Calendar': '#06b6d4', 'My Bookings': '#ec4899',
  'Viewing Story': '#ec4899', 'Viewing Product': '#f59e0b', 'Viewing Profile': '#3b82f6',
  'Viewing Casting': '#f97316', 'Viewing Campaign': '#8b5cf6', 'Viewing Event': '#06b6d4',
  'Viewing Booking': '#10b981', 'Viewing Contract': '#7c3aed', 'Viewing Portfolio': '#ec4899',
  'Viewing Post': '#f59e0b', 'Viewing Model': '#ec4899', 'Viewing Brand': '#f59e0b',
  'Applied to Casting': '#f97316', 'Applied to Campaign': '#8b5cf6',
  'Registered for Event': '#06b6d4', 'Enrolled in Course': '#7c3aed',
  'Requested Booking': '#ec4899', 'Confirmed Booking': '#10b981',
  'Cancelled Booking': '#ef4444', 'Rated Booking': '#f59e0b',
  'Following': '#8b5cf6', 'Unfollowed': '#ef4444',
  'Liked Post': '#ec4899', 'Commented on Post': '#3b82f6', 'Shared Post': '#10b981',
  'Created Post': '#f97316', 'Created Story': '#ec4899',
  'Sent Message': '#3b82f6', 'Added to Cart': '#f59e0b', 'Purchased': '#10b981',
  'Signed Contract': '#7c3aed', 'Generated Contract': '#8b5cf6',
  'Withdrew Funds': '#ef4444', 'Transferred Funds': '#3b82f6', 'Deposited Funds': '#10b981',
  'Created Casting': '#10b981', 'Edited Casting': '#f59e0b', 'Deleted Casting': '#ef4444',
  'Created Campaign': '#10b981', 'Edited Campaign': '#f59e0b', 'Deleted Campaign': '#ef4444',
  'Accepted Application': '#10b981', 'Rejected Application': '#ef4444',
  'Booked from Casting': '#8b5cf6', 'Booked from Campaign': '#8b5cf6',
  'Subscribed to Plan': '#7c3aed', 'Cancelled Subscription': '#ef4444',
  'Created Support Ticket': '#f59e0b', 'Wrote Review': '#ec4899',
  'Boosted': '#f59e0b', 'Joined Meeting': '#ef4444', 'Reported User': '#ef4444',
}

const PAGE_ICONS = {
  'Connected': '🟢', 'Disconnected': '🔴',
  'Feed': '📰', 'Dashboard': '📊', 'Messages': '💬', 'Explore': '🔍',
  'Marketplace': '🛒', 'Wallet': '💰', 'My Profile': '👤',
  'Viewing Story': '📖', 'Viewing Product': '🛍️', 'Viewing Profile': '👤',
  'Viewing Casting': '🎯', 'Viewing Campaign': '📢', 'Viewing Event': '📅',
  'Viewing Booking': '📋', 'Viewing Contract': '📝', 'Viewing Portfolio': '📁',
  'Viewing Post': '💬',
  'Applied to Casting': '✅', 'Applied to Campaign': '✅',
  'Registered for Event': '🎫', 'Enrolled in Course': '📚',
  'Requested Booking': '📅', 'Confirmed Booking': '✅', 'Cancelled Booking': '❌',
  'Rated Booking': '⭐', 'Following': '➕', 'Unfollowed': '➖',
  'Liked Post': '❤️', 'Commented on Post': '💬', 'Shared Post': '🔗',
  'Created Post': '✏️', 'Created Story': '📖', 'Sent Message': '💌',
  'Added to Cart': '🛒', 'Purchased': '💳',
  'Signed Contract': '✍️', 'Generated Contract': '📄',
  'Withdrew Funds': '💸', 'Transferred Funds': '💸', 'Deposited Funds': '💵',
  'Created Casting': '✨', 'Edited Casting': '✏️', 'Deleted Casting': '🗑️',
  'Created Campaign': '✨', 'Edited Campaign': '✏️', 'Deleted Campaign': '🗑️',
  'Accepted Application': '✅', 'Rejected Application': '❌',
  'Booked from Casting': '📅', 'Booked from Campaign': '📅',
  'Subscribed to Plan': '💳', 'Cancelled Subscription': '❌',
  'Created Support Ticket': '🎫', 'Wrote Review': '⭐',
  'Boosted': '🚀', 'Joined Meeting': '🎥', 'Reported User': '⚠️',
}

export default function LiveTracking() {
  const [onlineUsers, setOnlineUsers] = useState({})
  const [selectedUser, setSelectedUser] = useState(null)
  const [userActivity, setUserActivity] = useState([])
  const [connected, setConnected] = useState(false)
  const connRef = useRef(null)
  const selectedRef = useRef(null)

  useEffect(() => { selectedRef.current = selectedUser }, [selectedUser])

  useEffect(() => {
    const token = tokenStore.getAccess()
    if (!token || connRef.current) return
    const conn = new HubConnectionBuilder()
      .withUrl(`${API_BASE.replace(/\/api$/, '')}/hubs/admin-tracking`, { accessTokenFactory: () => tokenStore.getAccess() })
      .withAutomaticReconnect([0, 2, 5, 10])
      .configureLogging(LogLevel.Warning)
      .build()

    conn.on('OnlineUsers', (users) => setOnlineUsers(users))
    conn.on('UserActivityUpdate', (data) => { const sel = selectedRef.current; if (sel && data.userId === sel.userId) { setSelectedUser(prev => prev ? { ...prev, activityDescription: data.activityDescription, page: data.currentPage, targetName: data.targetName } : prev); if (data.recentActivity) setUserActivity(data.recentActivity) } })
    conn.on('UserActivityHistory', (userId, history) => { const sel = selectedRef.current; if (sel && userId === sel.userId) setUserActivity(history || []) })
    conn.start().then(() => { setConnected(true); conn.invoke('GetOnlineUsers').catch(() => {}) }).catch(() => {})
    conn.onreconnected(() => { setConnected(true); conn.invoke('GetOnlineUsers').catch(() => {}) })
    conn.onclose(() => setConnected(false))
    connRef.current = conn
  }, [])

  const watchUser = async (user) => { setSelectedUser(user); setUserActivity([]); try { await connRef.current?.invoke('WatchUser', user.userId) } catch {} }
  const unwatchUser = async () => { if (selectedUser) { try { await connRef.current?.invoke('UnwatchUser', selectedUser.userId) } catch {} } setSelectedUser(null); setUserActivity([]) }

  const userList = Object.entries(onlineUsers).map(([uid, u]) => ({ userId: uid, ...u })).filter(u => !u.roles?.includes('Admin') && !u.roles?.includes('SuperAdmin')).sort((a, b) => (b.lastSeen || '').localeCompare(a.lastSeen || ''))

  return (
    <div className="card">
      <div className="card-head"><div className="card-title"><Radio size={16} style={{ color: connected ? '#10b981' : '#ef4444' }} /> Live User Tracking<span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-dim)', fontWeight: 400 }}>{userList.length} online</span></div></div>
      <div className="card-pad" style={{ padding: 0 }}>
        {userList.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}><Users size={28} style={{ opacity: 0.3, marginBottom: 8 }} /><div>No users currently online</div></div>
        ) : (
          <div style={{ display: 'flex', maxHeight: 400 }}>
            <div style={{ flex: selectedUser ? '0 0 260px' : '1', borderRight: selectedUser ? '1px solid var(--border)' : 'none', overflowY: 'auto' }}>
              {userList.map((u) => { const pageColor = PAGE_COLORS[u.page] || '#64748b'; const isActive = selectedUser?.userId === u.userId; const icon = PAGE_ICONS[u.page] || '📍'; return (
                <div key={u.userId} onClick={() => watchUser(u)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border-light, rgba(255,255,255,0.04))', background: isActive ? 'rgba(59,130,246,0.08)' : 'transparent', borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent', transition: 'background 0.15s' }}>
                  <div style={{ position: 'relative' }}><div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #8B5CF6, #EC4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>{(u.displayName || '?').charAt(0).toUpperCase()}</div><div style={{ position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, borderRadius: '50%', background: '#10b981', border: '2px solid var(--bg, #1a1a2e)' }} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 600, fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.displayName || 'Unknown'}</div><div style={{ fontSize: 11, color: pageColor, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><span>{icon}</span> {u.activityDescription || u.page || 'Loading...'}</div></div>
                </div>
              )})}
            </div>
            {selectedUser && (
              <div style={{ flex: 1, padding: '12px 16px', overflowY: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div><div style={{ fontWeight: 700, fontSize: 14 }}>{selectedUser.displayName}</div><div style={{ fontSize: 11, color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} /> {selectedUser.activityDescription || `On ${selectedUser.page || 'Unknown'}`}</div></div>
                  <button className="btn btn-ghost btn-sm" onClick={unwatchUser} style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}><X size={12} /> Close</button>
                </div>
                {userActivity.length === 0 ? (
                  <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-dim)', fontSize: 12 }}>No activity recorded yet.</div>
                ) : (
                  <div style={{ position: 'relative', paddingLeft: 18 }}>
                    <div style={{ position: 'absolute', left: 5, top: 4, bottom: 4, width: 2, background: 'var(--border)' }} />
                    {userActivity.map((a, i) => { const color = PAGE_COLORS[a.page] || '#3b82f6'; const icon = PAGE_ICONS[a.page] || '📍'; return (
                      <div key={i} style={{ position: 'relative', padding: '6px 0 6px 14px', fontSize: 12 }}>
                        <div style={{ position: 'absolute', left: -2, top: 10, width: 8, height: 8, borderRadius: '50%', background: color, border: '2px solid var(--bg)' }} />
                        <div style={{ fontWeight: 600, color, display: 'flex', alignItems: 'center', gap: 4 }}><span>{icon}</span> {a.description || a.page}</div>
                        <div style={{ color: 'var(--text-faint)', fontSize: 10.5, marginTop: 1 }}>{a.page} · {getTimeAgo(new Date(a.timestamp))}</div>
                      </div>
                    )})}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
