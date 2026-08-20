import { useState, useEffect, useRef } from 'react'
import { Radio, ArrowDownLeft, ArrowUpRight, Send, MapPin, Globe, User } from 'lucide-react'
import * as signalR from '@microsoft/signalr'
import { API_BASE } from '../config'
import { tokenStore } from '../api/client'
import { StatusBadge } from './ui'

const MONEY = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

const TYPE_ICON = { Deposit: ArrowDownLeft, Withdrawal: ArrowUpRight, Transfer: Send }
const TYPE_COLOR = { Deposit: 'var(--success)', Withdrawal: 'var(--amber)', Transfer: 'var(--primary)' }

const fmt = (v) => (v == null ? '—' : Number(v).toFixed(5))
const fmtWhen = (iso) => new Date(iso).toLocaleTimeString()

export default function LiveWalletActivity() {
  const [connected, setConnected] = useState(false)
  const [items, setItems] = useState([])
  const connRef = useRef(null)

  useEffect(() => {
    const url = `${API_BASE.replace(/\/api$/, '')}/hubs/wallet`
    const conn = new signalR.HubConnectionBuilder()
      .withUrl(url, { accessTokenFactory: () => tokenStore.getAccess() || '' })
      .withAutomaticReconnect()
      .build()
    connRef.current = conn

    conn.on('WalletActivity', (msg) => {
      setItems((prev) => [msg, ...prev].slice(0, 60))
    })

    conn.onreconnecting(() => setConnected(false))
    conn.onreconnected(() => setConnected(true))
    conn.onclose(() => setConnected(false))

    conn.start()
      .then(() => setConnected(true))
      .catch(() => setConnected(false))

    return () => { conn.stop().catch(() => {}) }
  }, [])

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">
          <Radio size={16} style={{ color: 'var(--primary)' }} /> Live wallet activity
        </div>
        <span className={`badge ${connected ? 'badge-green' : 'badge-red'}`}>
          {connected ? '● Live' : '○ Offline'}
        </span>
      </div>
      <div className="table-wrap" style={{ maxHeight: 480, overflowY: 'auto' }}>
        {items.length === 0 ? (
          <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-faint)', fontSize: 14 }}>
            Waiting for wallet operations…<br />
            <span style={{ fontSize: 12 }}>Deposits, withdrawals and transfers will appear here in real time with their location.</span>
          </div>
        ) : (
          <table>
            <thead><tr><th>Time</th><th>Type</th><th>Amount</th><th>User</th><th>Details</th><th>Location</th><th>IP / Agent</th></tr></thead>
            <tbody>
              {items.map((e) => {
                const Icon = TYPE_ICON[e.type] || Send
                const color = TYPE_COLOR[e.type] || 'var(--text-dim)'
                return (
                  <tr key={`${e.type}-${e.id}-${e.createdAt}`}>
                    <td className="mono" style={{ whiteSpace: 'nowrap' }}>{fmtWhen(e.createdAt)}</td>
                    <td>
                      <span className="badge" style={{ background: `${color}1a`, color }}>
                        <Icon size={12} style={{ verticalAlign: '-2px', marginRight: 4 }} />{e.type}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700 }}>{MONEY.format(Number(e.amount || 0))}</td>
                    <td>
                      <div style={{ fontSize: 13 }}>{e.userName || e.userId}</div>
                      {e.userEmail && <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{e.userEmail}</div>}
                      {e.receiverName && <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>to {e.receiverName}</div>}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                      {e.method ? <div>Method: {e.method}</div> : null}
                      {e.reference ? <div style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.type === 'Transfer' ? e.reference : `Ref: ${e.reference}`}</div> : null}
                      <div><StatusBadge status={e.status} /></div>
                    </td>
                    <td>
                      {e.lat != null && e.lng != null ? (
                        <a href={`https://www.google.com/maps?q=${e.lat},${e.lng}`} target="_blank" rel="noreferrer" className="mono" style={{ color: 'var(--primary)', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                          <MapPin size={12} style={{ verticalAlign: '-2px' }} /> {fmt(e.lat)}, {fmt(e.lng)}
                        </a>
                      ) : (
                        <span style={{ color: 'var(--text-faint)' }}>—</span>
                      )}
                      {e.clientLocation ? <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{e.clientLocation}</div> : null}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                      {e.ipAddress ? <div className="mono"><Globe size={11} style={{ verticalAlign: '-1px' }} /> {e.ipAddress}</div> : null}
                      {e.userAgent ? <div style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={e.userAgent}><User size={11} style={{ verticalAlign: '-1px' }} /> {e.userAgent}</div> : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
