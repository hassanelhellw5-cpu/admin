import { useState, useEffect, useRef } from 'react'
import { Phone, PhoneOff, Video, VideoOff, RefreshCw, Radio, Clock, Users, Eye, Headphones } from 'lucide-react'
import { get } from '../api/client'
import { API_BASE } from '../config'
import { useAuth } from '../context/AuthContext'
import { Loader, Empty, UserCell } from '../components/ui'
import * as signalR from '@microsoft/signalr'

function formatDuration(seconds) {
  if (!seconds) return '0s'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function resolvePhoto(url) {
  if (!url) return null
  if (url.startsWith('http')) return url
  const base = API_BASE.replace('/api', '') || 'http://brandmarketplace.runasp.net'
  return url.startsWith('/') ? `${base}${url}` : `${base}/${url}`
}

export default function CallMonitor() {
  const { user } = useAuth()
  const [calls, setCalls] = useState([])
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)
  const hubRef = useRef(null)
  const pollRef = useRef(null)
  const [eavesdropping, setEavesdropping] = useState(null)

  const loadCalls = async () => {
    try {
      const data = await get('/admin/active-calls')
      setCalls(Array.isArray(data) ? data : [])
    } catch { /* ignore */ }
    setLoading(false)
  }

  useEffect(() => {
    loadCalls()

    // Polling fallback: refresh every 5 seconds in case SignalR events are missed
    pollRef.current = setInterval(loadCalls, 5000)

    const hub = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE.replace('/api', '')}/hubs/meeting`, {
        accessTokenFactory: () => localStorage.getItem('bm_admin_access') || '',
      })
      .withAutomaticReconnect()
      .build()

    hub.on('ActiveCallsChanged', (activeCalls) => {
      setCalls(Array.isArray(activeCalls) ? activeCalls : [])
    })

    hub.start().then(() => {
      setConnected(true)
      hub.invoke('JoinAdminMonitor')
    }).catch(() => setConnected(false))

    hub.onreconnected(() => {
      hub.invoke('JoinAdminMonitor')
    })

    hubRef.current = hub
    return () => {
      hub.stop()
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  const eavesdrop = async (call) => {
    // Build room name from callId pattern "callerId:calleeId"
    const room = call.callId
    if (!room) return
    setEavesdropping(call.callId)
    try {
      await hubRef.current?.invoke('AdminEavesdrop', room)
    } catch { /* ignore */ }
  }

  const now = new Date()

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22 }}>Call Monitor</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: connected ? '#10b981' : '#ef4444' }}>
            <Radio size={14} className={connected ? 'pulse' : ''} />
            {connected ? 'Live' : 'Disconnected'}
          </div>
          <button className="btn btn-outline btn-sm" onClick={loadCalls}><RefreshCw size={14} /> Refresh</button>
        </div>
      </div>
      <p style={{ color: 'var(--text-dim)', marginBottom: 22 }}>Monitor active calls in real-time. Updates via SignalR + polling fallback.</p>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 22 }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff' }}><Phone size={19} /></div>
          <div className="stat-label">Active calls</div>
          <div className="stat-value">{calls.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg,#ec4899,#f43f5e)', color: '#fff' }}><Video size={19} /></div>
          <div className="stat-label">Video calls</div>
          <div className="stat-value">{calls.filter((c) => c.isVideo).length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg,#3b82f6,#2563eb)', color: '#fff' }}><Users size={19} /></div>
          <div className="stat-label">Voice calls</div>
          <div className="stat-value">{calls.filter((c) => !c.isVideo).length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)', color: '#fff' }}><Clock size={19} /></div>
          <div className="stat-label">Ringing</div>
          <div className="stat-value">{calls.filter((c) => c.status === 'Ringing').length}</div>
        </div>
      </div>

      <div className="card">
        {loading ? <Loader /> : calls.length === 0 ? (
          <Empty title="No active calls" message="Active calls will appear here in real-time via SignalR and polling." icon={<Phone size={40} />} />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Caller</th>
                  <th>Callee</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Started</th>
                  <th>Duration</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {calls.map((c) => {
                  const elapsed = c.connectedAt
                    ? (now - new Date(c.connectedAt)) / 1000
                    : (now - new Date(c.startedAt)) / 1000
                  return (
                    <tr key={c.callId}>
                      <td>
                        <UserCell
                          name={c.callerName || c.callerId?.slice(0, 12)}
                          email={c.callerId}
                          img={resolvePhoto(c.callerPhoto)}
                        />
                      </td>
                      <td>
                        <UserCell
                          name={c.calleeName || c.calleeId?.slice(0, 12)}
                          email={c.calleeId}
                          img={resolvePhoto(c.calleePhoto)}
                        />
                      </td>
                      <td>
                        {c.isVideo ? (
                          <span className="badge badge-violet" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Video size={12} /> Video</span>
                        ) : (
                          <span className="badge badge-blue" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Phone size={12} /> Voice</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge badge-${c.status === 'Connected' ? 'green' : c.status === 'Ringing' ? 'amber' : 'gray'}`}>
                          {c.status}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-dim)' }}>{new Date(c.startedAt).toLocaleTimeString()}</td>
                      <td style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>{formatDuration(elapsed)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-outline btn-sm"
                          title="Eavesdrop on this call (silent)"
                          onClick={() => eavesdrop(c)}
                          disabled={eavesdropping === c.callId}
                        >
                          <Headphones size={14} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
