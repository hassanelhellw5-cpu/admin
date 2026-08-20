import { useState, useEffect, useCallback, useRef } from 'react'
import { MessageSquare, Search, RefreshCw, Eye } from 'lucide-react'
import { get, errMsg } from '../api/client'
import { useToast } from '../components/Toast'
import { Loader, Empty, Avatar } from '../components/ui'

export default function ChatMonitor() {
  const toast = useToast()
  const [convs, setConvs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [active, setActive] = useState(null)
  const [thread, setThread] = useState({ data: [] })
  const [threadLoading, setThreadLoading] = useState(false)
  const timer = useRef(null)

  const loadConvs = useCallback(async (silent) => {
    if (!silent) setLoading(true)
    try {
      setConvs(await get('/admin/chat/conversations', { query: search || undefined }))
    } catch (e) { toast.error(errMsg(e)) } finally { if (!silent) setLoading(false) }
  }, [search, toast])

  const loadThread = useCallback(async (a, b) => {
    setThreadLoading(true)
    try {
      setThread(await get(`/admin/chat/messages/${a}/${b}`, { pageSize: 200 }))
    } catch (e) { toast.error(errMsg(e)) } finally { setThreadLoading(false) }
  }, [toast])

  useEffect(() => { loadConvs() }, [loadConvs])

  useEffect(() => {
    timer.current = setInterval(() => {
      loadConvs(true)
      if (active) loadThread(active.a, active.b)
    }, 6000)
    return () => clearInterval(timer.current)
  }, [loadConvs, loadThread, active])

  const openConv = (c) => {
    setActive({ a: c.user1.id, b: c.user2.id, label: `${c.user1.name} ↔ ${c.user2.name}` })
    loadThread(c.user1.id, c.user2.id)
  }

  const timeAgo = (d) => {
    const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
    if (s < 60) return 'just now'
    if (s < 3600) return `${Math.floor(s / 60)}m ago`
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`
    return new Date(d).toLocaleDateString()
  }

  if (loading && !convs.length) return <Loader />

  return (
    <>
      <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, marginBottom: 4 }}>Chat monitor</h1>
      <p style={{ color: 'var(--text-dim)', marginBottom: 22 }}>Live monitoring of all user conversations. Refreshes automatically every 6 seconds.</p>

      <div className="toolbar">
        <div className="search-box" style={{ width: 320 }}>
          <Search size={15} />
          <input placeholder="Search content or user…" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && loadConvs()} />
        </div>
        <button className="btn btn-outline" onClick={() => loadConvs()} style={{ marginLeft: 8 }}><RefreshCw size={15} /> Refresh</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: active ? 'minmax(280px, 380px) 1fr' : '1fr', gap: 18, alignItems: 'start' }}>
        <div className="card" style={{ padding: 0, maxHeight: 'calc(100vh - 260px)', overflowY: 'auto' }}>
          {convs.length === 0 && <Empty title="No conversations" message="No messages match this filter." icon={<MessageSquare size={40} />} />}
          {convs.map((c) => (
            <button key={c.conversationId} onClick={() => openConv(c)}
              className={active && active.a === c.user1.id && active.b === c.user2.id ? 'conv-row active' : 'conv-row'}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                border: 'none', borderBottom: '1px solid var(--border)', background: 'transparent',
                cursor: 'pointer', textAlign: 'left', color: 'inherit', fontFamily: 'inherit',
              }}>
              <div style={{ position: 'relative' }}>
                <Avatar src={c.user1.avatar} name={c.user1.name} size={38} style={{ border: '2px solid #fff' }} />
                <div style={{ position: 'absolute', bottom: -4, right: -8 }}>
                  <Avatar src={c.user2.avatar} name={c.user2.name} size={26} style={{ border: '2px solid #fff' }} />
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ fontSize: 14, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {c.user1.name} <span style={{ color: 'var(--text-faint)' }}>↔</span> {c.user2.name}
                </strong>
                <small style={{ color: 'var(--text-dim)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {c.lastMessage}
                </small>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <small style={{ color: 'var(--text-faint)', display: 'block', fontSize: 11 }}>{timeAgo(c.lastMessageAt)}</small>
                <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{c.messageCount} msgs</span>
              </div>
            </button>
          ))}
        </div>

        {active && (
          <div className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 260px)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Eye size={16} style={{ color: 'var(--gold)' }} />
              <strong style={{ fontSize: 15 }}>{active.label}</strong>
              <span className="badge" style={{ fontSize: 11 }}>live</span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {threadLoading && <Loader />}
              {(thread.data || []).map((m) => (
                <div key={m.id} style={{
                  alignSelf: 'flex-start', maxWidth: '80%', background: 'var(--bg-soft)',
                  borderRadius: '12px 12px 12px 4px', padding: '9px 13px',
                }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
                    <Avatar src={m.senderAvatar} name={m.senderName} size={22} />
                    <strong style={{ fontSize: 12 }}>{m.senderName}</strong>
                    <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{m.senderEmail}</span>
                  </div>
                  <div style={{ fontSize: 14, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.content}</div>
                  <small style={{ color: 'var(--text-faint)', fontSize: 10, display: 'block', textAlign: 'right', marginTop: 2 }}>{new Date(m.createdAt).toLocaleString()}</small>
                </div>
              ))}
              {!threadLoading && (thread.data || []).length === 0 && <Empty title="No messages" message="This conversation has no messages." icon={<MessageSquare size={36} />} />}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
