import { useState, useEffect, useRef, useCallback } from 'react'
import { Radio, Users, Globe, Clock, Eye, Zap, ChevronRight, RefreshCw, Activity, X } from 'lucide-react'
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr'
import { API_BASE } from '../config'
import { tokenStore } from '../api/client'
import { Loader, Avatar } from '../components/ui'

function getTimeAgo(date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 5) return 'just now'
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
  'My Castings': '#f59e0b', 'My Campaigns': '#f97316', 'My Events': '#06b6d4',
  'Social Studio': '#ec4899', 'Support': '#64748b', 'Plans': '#7c3aed',
  'Training': '#06b6d4', 'Assets': '#3b82f6', 'Collections': '#8b5cf6',
  'My Portfolio': '#ec4899', 'My Roster': '#10b981', 'Tax Reports': '#f59e0b',
  'Edit Profile': '#ec4899', 'Notifications': '#f97316',
  // View actions
  'Viewing Story': '#ec4899', 'Viewing Product': '#f59e0b', 'Viewing Profile': '#3b82f6',
  'Viewing Casting': '#f97316', 'Viewing Campaign': '#8b5cf6', 'Viewing Event': '#06b6d4',
  'Viewing Booking': '#10b981', 'Viewing Contract': '#7c3aed', 'Viewing Portfolio': '#ec4899',
  'Viewing Post': '#f59e0b', 'Viewing Model': '#ec4899', 'Viewing Brand': '#f59e0b',
  'Viewing User': '#3b82f6',
  // Apply / Register
  'Applied to Casting': '#f97316', 'Applied to Campaign': '#8b5cf6',
  'Registered for Event': '#06b6d4', 'Enrolled in Course': '#7c3aed',
  // Booking
  'Requested Booking': '#ec4899', 'Confirmed Booking': '#10b981',
  'Cancelled Booking': '#ef4444', 'Rated Booking': '#f59e0b',
  // Follow
  'Following': '#8b5cf6', 'Unfollowed': '#ef4444',
  // Social
  'Liked Post': '#ec4899', 'Commented on Post': '#3b82f6', 'Shared Post': '#10b981',
  'Created Post': '#f97316', 'Created Story': '#ec4899',
  // Message
  'Sent Message': '#3b82f6',
  // Marketplace
  'Added to Cart': '#f59e0b', 'Purchased': '#10b981',
  // Contract
  'Signed Contract': '#7c3aed', 'Generated Contract': '#8b5cf6',
  // Wallet
  'Withdrew Funds': '#ef4444', 'Transferred Funds': '#3b82f6', 'Deposited Funds': '#10b981',
  // Create / Edit / Delete
  'Created Casting': '#10b981', 'Edited Casting': '#f59e0b', 'Deleted Casting': '#ef4444',
  'Created Campaign': '#10b981', 'Edited Campaign': '#f59e0b', 'Deleted Campaign': '#ef4444',
  'Created Event': '#10b981', 'Created Listing': '#10b981', 'Created Portfolio': '#10b981',
  // Accept / Reject
  'Accepted Application': '#10b981', 'Rejected Application': '#ef4444',
  'Booked from Casting': '#8b5cf6', 'Booked from Campaign': '#8b5cf6',
  // Subscription
  'Subscribed to Plan': '#7c3aed', 'Cancelled Subscription': '#ef4444',
  // Support
  'Created Support Ticket': '#f59e0b',
  // Review
  'Wrote Review': '#ec4899',
  // Boost
  'Boosted': '#f59e0b',
  // Meeting
  'Joined Meeting': '#ef4444',
  // Report
  'Reported User': '#ef4444',
  // Fallback
  'Activity': '#64748b',
}

const PAGE_ICONS = {
  'Connected': '🟢', 'Disconnected': '🔴',
  'Feed': '📰', 'Dashboard': '📊', 'Messages': '💬', 'Explore': '🔍',
  'Marketplace': '🛒', 'Wallet': '💰', 'My Profile': '👤',
  'Castings': '🎯', 'Campaigns': '📢', 'Events': '📅',
  'Contracts': '📝', 'In Meeting': '🎥', 'My Bookings': '📋',
  'My Castings': '🎯', 'My Campaigns': '📢', 'My Events': '📅',
  'Viewing Story': '📖', 'Viewing Product': '🛍️', 'Viewing Profile': '👤',
  'Viewing Casting': '🎯', 'Viewing Campaign': '📢', 'Viewing Event': '📅',
  'Viewing Booking': '📋', 'Viewing Contract': '📝', 'Viewing Portfolio': '📁',
  'Viewing Post': '💬', 'Viewing Model': '👤', 'Viewing Brand': '🏢',
  'Viewing User': '👤',
  'Applied to Casting': '✅', 'Applied to Campaign': '✅',
  'Registered for Event': '🎫', 'Enrolled in Course': '📚',
  'Requested Booking': '📅', 'Confirmed Booking': '✅',
  'Cancelled Booking': '❌', 'Rated Booking': '⭐',
  'Following': '➕', 'Unfollowed': '➖',
  'Liked Post': '❤️', 'Commented on Post': '💬', 'Shared Post': '🔗',
  'Created Post': '✏️', 'Created Story': '📖',
  'Sent Message': '💌',
  'Added to Cart': '🛒', 'Purchased': '💳',
  'Signed Contract': '✍️', 'Generated Contract': '📄',
  'Withdrew Funds': '💸', 'Transferred Funds': '💸', 'Deposited Funds': '💵',
  'Created Casting': '✨', 'Edited Casting': '✏️', 'Deleted Casting': '🗑️',
  'Created Campaign': '✨', 'Edited Campaign': '✏️', 'Deleted Campaign': '🗑️',
  'Created Event': '✨', 'Created Listing': '✨', 'Created Portfolio': '✨',
  'Accepted Application': '✅', 'Rejected Application': '❌',
  'Booked from Casting': '📅', 'Booked from Campaign': '📅',
  'Subscribed to Plan': '💳', 'Cancelled Subscription': '❌',
  'Created Support Ticket': '🎫', 'Wrote Review': '⭐',
  'Boosted': '🚀', 'Joined Meeting': '🎥', 'Reported User': '⚠️',
}

export default function Tracking() {
  const [onlineUsers, setOnlineUsers] = useState({})
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [userPresence, setUserPresence] = useState(null)
  const [userActivity, setUserActivity] = useState([])
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const connRef = useRef(null)
  const watchedUserId = useRef(null)

  useEffect(() => {
    const token = tokenStore.getAccess()
    if (!token || connRef.current) return

    const conn = new HubConnectionBuilder()
      .withUrl(`${API_BASE.replace(/\/api$/, '')}/hubs/admin-tracking`, { accessTokenFactory: () => tokenStore.getAccess() })
      .withAutomaticReconnect([0, 2, 5, 10])
      .configureLogging(LogLevel.Warning)
      .build()

    conn.on('OnlineUsers', (users) => { setOnlineUsers(users); setLoading(false) })
    conn.on('UserPresence', (userId, presence) => { if (watchedUserId.current === userId) setUserPresence(presence) })
    conn.on('UserActivityUpdate', (data) => {
      if (watchedUserId.current === data.userId) {
        setUserPresence(prev => prev ? { ...prev, ...data } : data)
        if (data.recentActivity) setUserActivity(data.recentActivity)
      }
    })
    conn.on('UserActivityHistory', (userId, history) => { if (watchedUserId.current === userId) setUserActivity(history || []) })

    conn.start().then(() => { setConnected(true); conn.invoke('GetOnlineUsers').catch(() => {}) }).catch(() => {})
    conn.onreconnected(() => { setConnected(true); conn.invoke('GetOnlineUsers').catch(() => {}) })
    conn.onclose(() => setConnected(false))
    connRef.current = conn
  }, [])

  const selectUser = useCallback(async (userId) => {
    const prevId = watchedUserId.current
    if (prevId && connRef.current?.state === 'Connected') {
      try { await connRef.current.invoke('UnwatchUser', prevId) } catch { /* */ }
    }
    watchedUserId.current = userId
    setSelectedUserId(userId)
    setUserPresence(null)
    setUserActivity([])
    const conn = connRef.current
    if (conn?.state === 'Connected') {
      try { await conn.invoke('WatchUser', userId) } catch { /* */ }
    }
  }, [])

  const closePanel = useCallback(async () => {
    const prevId = watchedUserId.current
    watchedUserId.current = null
    setSelectedUserId(null)
    setUserPresence(null)
    setUserActivity([])
    if (prevId && connRef.current?.state === 'Connected') {
      try { await connRef.current.invoke('UnwatchUser', prevId) } catch { /* */ }
    }
  }, [])

  const userList = Object.entries(onlineUsers)
    .map(([uid, u]) => ({ userId: uid, ...u }))
    .filter(u => !u.roles?.includes('Admin') && !u.roles?.includes('SuperAdmin'))
    .sort((a, b) => (b.lastSeen || '').localeCompare(a.lastSeen || ''))

  const selectedUser = selectedUserId ? userList.find(u => u.userId === selectedUserId) : null

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div>
          <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, marginBottom: 4 }}>Live Tracking</h1>
          <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>Monitor what users are doing in real-time. Click any user to watch their activity.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: connected ? '#10b981' : '#ef4444' }}>
            <Radio size={14} className={connected ? 'pulse' : ''} />
            {connected ? 'Live' : 'Disconnected'}
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => connRef.current?.invoke('GetOnlineUsers')}><RefreshCw size={14} /> Refresh</button>
        </div>
      </div>

      <div className="card" style={{ padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center', background: 'rgba(16,185,129,0.05)', borderColor: 'rgba(16,185,129,0.2)' }}>
        <Activity size={15} style={{ color: '#10b981' }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: '#10b981' }}>LIVE:</span>
        <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{userList.length} user{userList.length !== 1 ? 's' : ''} online now</span>
      </div>

      {loading ? <Loader /> : (
        <div style={{ display: 'flex', gap: 0, border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', minHeight: 500 }}>
          <div style={{ width: 320, borderRight: '1px solid var(--border)', overflowY: 'auto', background: 'var(--bg-secondary, rgba(255,255,255,0.02))' }}>
            {userList.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}><Users size={32} style={{ opacity: 0.3, marginBottom: 8 }} /><div style={{ fontSize: 13 }}>No users online</div></div>
            ) : userList.map((u) => {
              const pageColor = PAGE_COLORS[u.page] || '#64748b'
              const isActive = selectedUserId === u.userId
              const icon = PAGE_ICONS[u.page] || '📍'
              return (
                <div key={u.userId} onClick={() => selectUser(u.userId)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border-light, rgba(255,255,255,0.04))', background: isActive ? 'rgba(59,130,246,0.1)' : 'transparent', borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent', transition: 'all 0.15s' }}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <Avatar src={u.profilePictureUrl} name={u.displayName} size={36} />
                    <div style={{ position: 'absolute', bottom: -1, right: -1, width: 11, height: 11, borderRadius: '50%', background: '#10b981', border: '2px solid var(--bg-secondary, #1a1a2e)' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.displayName || 'Unknown'}</div>
                    <div style={{ fontSize: 11.5, color: pageColor, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <span>{icon}</span> {u.activityDescription || u.page || 'Loading...'}
                    </div>
                  </div>
                  <ChevronRight size={14} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
                </div>
              )
            })}
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {!selectedUser ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'var(--text-dim)' }}>
                <Eye size={40} style={{ opacity: 0.2 }} />
                <div style={{ fontSize: 14, fontWeight: 600 }}>Select a user to track</div>
                <div style={{ fontSize: 12 }}>Click any user from the list to see their real-time activity</div>
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(59,130,246,0.04)' }}>
                  <Avatar src={selectedUser.profilePictureUrl} name={selectedUser.displayName} size={44} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{selectedUser.displayName}</div>
                    <div style={{ fontSize: 12, color: '#10b981', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 6px #10b981' }} />
                      {userPresence?.activityDescription || userPresence?.currentPage || selectedUser.activityDescription || selectedUser.page || 'Unknown'}
                    </div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={closePanel} style={{ display: 'flex', alignItems: 'center', gap: 4 }}><X size={14} /> Close</button>
                </div>

                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Current Location</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: `${PAGE_COLORS[userPresence?.currentPage || selectedUser.page] || '#3b82f6'}15`, border: `1px solid ${PAGE_COLORS[userPresence?.currentPage || selectedUser.page] || '#3b82f6'}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                      {PAGE_ICONS[userPresence?.currentPage || selectedUser.page] || '📍'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16, color: PAGE_COLORS[userPresence?.currentPage || selectedUser.page] || '#3b82f6' }}>
                        {userPresence?.activityDescription || userPresence?.currentPage || selectedUser.activityDescription || selectedUser.page || 'Unknown'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{userPresence?.currentPage || selectedUser.page} · Last seen {getTimeAgo(new Date(userPresence?.lastSeen || selectedUser.lastSeen))}</div>
                    </div>
                  </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                    <Clock size={12} style={{ display: 'inline', verticalAlign: -2, marginRight: 4 }} /> Activity Timeline ({userActivity.length} entries)
                  </div>
                  {userActivity.length === 0 ? (
                    <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-dim)', fontSize: 12 }}><Activity size={24} style={{ opacity: 0.3, marginBottom: 6 }} /><div>No activity recorded yet. Waiting for user to navigate...</div></div>
                  ) : (
                    <div style={{ position: 'relative', paddingLeft: 24 }}>
                      <div style={{ position: 'absolute', left: 7, top: 4, bottom: 4, width: 2, background: 'var(--border)' }} />
                      {userActivity.map((a, i) => {
                        const color = PAGE_COLORS[a.page] || '#3b82f6'
                        const icon = PAGE_ICONS[a.page] || '📍'
                        const isFirst = i === 0
                        return (
                          <div key={i} style={{ position: 'relative', padding: '10px 0 10px 16px', fontSize: 12.5, background: isFirst ? `${color}08` : 'transparent', borderRadius: isFirst ? 8 : 0, marginBottom: isFirst ? 8 : 0 }}>
                            <div style={{ position: 'absolute', left: -3, top: 13, width: 12, height: 12, borderRadius: '50%', background: color, border: `2px solid ${isFirst ? color : 'var(--bg)'}`, boxShadow: isFirst ? `0 0 8px ${color}60` : 'none' }} />
                            <div style={{ fontWeight: 600, color, display: 'flex', alignItems: 'center', gap: 4 }}><span>{icon}</span> {a.description || a.page}</div>
                            <div style={{ color: 'var(--text-faint)', fontSize: 11, marginTop: 2 }}>{a.page} · {getTimeAgo(new Date(a.timestamp))} · {new Date(a.timestamp).toLocaleTimeString()}</div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
