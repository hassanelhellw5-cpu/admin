import { useState, useCallback, useEffect } from 'react'
import { CreditCard, RefreshCw, BarChart3, Users, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react'
import { useToast } from '../components/Toast'
import { Empty, StatusBadge, UserCell, Loader } from '../components/ui'
import Modal from '../components/Modal'
import { get, put, del as apiDel } from '../api/client'

const STATUS_OPTIONS = ['All', 'Pending', 'Active', 'Expired', 'Rejected', 'Cancelled']
const PLAN_OPTIONS = ['All', 'Free', 'Starter', 'Professional', 'Enterprise']

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString() : '—')
const fmtPrice = (n) => (n != null ? `$${Number(n).toLocaleString()}` : '—')

function StatsRow({ stats }) {
  if (!stats) return null
  const cards = [
    { icon: Users, label: 'Total', value: stats.total, color: '#7c3aed' },
    { icon: CheckCircle, label: 'Active', value: stats.active, color: '#10b981' },
    { icon: Clock, label: 'Pending', value: stats.pending, color: '#f59e0b' },
    { icon: XCircle, label: 'Cancelled', value: stats.cancelled, color: '#ef4444' },
    { icon: AlertTriangle, label: 'Expired', value: stats.expired, color: '#64748b' },
    { icon: BarChart3, label: 'Revenue', value: fmtPrice(stats.totalRevenue), color: '#3b82f6' },
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
      {cards.map((c) => (
        <div key={c.label} className="card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: c.color + '18', color: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <c.icon size={17} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{c.label}</div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>{typeof c.value === 'number' ? c.value.toLocaleString() : c.value}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Subscriptions() {
  const toast = useToast()
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('All')
  const [plan, setPlan] = useState('All')
  const [sel, setSel] = useState(null)
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const pageSize = 20

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, pageSize }
      if (status !== 'All') params.status = status
      if (plan !== 'All') params.plan = plan
      const [subsRes, statsRes] = await Promise.allSettled([
        get('/admin/subscriptions', params),
        get('/admin/subscriptions/stats'),
      ])
      if (subsRes.status === 'fulfilled') {
        setRows(subsRes.value.data || [])
        setTotal(subsRes.value.total || 0)
      }
      if (statsRes.status === 'fulfilled') setStats(statsRes.value)
    } catch { /* ignore */ }
    setLoading(false)
  }, [page, status, plan])

  useEffect(() => { load() }, [load])

  useEffect(() => { setPage(1) }, [status, plan])

  const act = async (action) => {
    if (!sel) return
    setBusy(true)
    try {
      const body = { status: action, adminNotes: notes || undefined }
      await put(`/admin/subscriptions/${sel.id}`, body)
      toast.success(`Subscription ${action}`)
      setSel(null)
      setNotes('')
      load()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Action failed')
    }
    setBusy(false)
  }

  const remove = async () => {
    if (!sel) return
    setBusy(true)
    try {
      await apiDel(`/admin/subscriptions/${sel.id}`)
      toast.success('Subscription deleted')
      setSel(null)
      setNotes('')
      load()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Delete failed')
    }
    setBusy(false)
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22 }}>Subscriptions</h1>
        <button className="btn btn-outline btn-sm" onClick={load} disabled={loading}><RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh</button>
      </div>
      <p style={{ color: 'var(--text-dim)', marginBottom: 18 }}>Manage user subscription plans. Approve pending requests, activate, cancel or reject.</p>

      <StatsRow stats={stats} />

      <div className="toolbar">
        <div className="pill-tabs">
          {STATUS_OPTIONS.map((s) => (
            <button key={s} className={`pill-tab${status === s ? ' active' : ''}`} onClick={() => setStatus(s)}>{s}</button>
          ))}
        </div>
        <div style={{ width: 12 }} />
        <div className="pill-tabs">
          {PLAN_OPTIONS.map((p) => (
            <button key={p} className={`pill-tab${plan === p ? ' active' : ''}`} onClick={() => setPlan(p)}>{p}</button>
          ))}
        </div>
      </div>

      <div className="card">
        {loading ? <Loader /> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Plan</th>
                  <th>Price</th>
                  <th>Payment</th>
                  <th>Billing</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <UserCell
                        name={r.userName || `User ${(r.userId || '').slice(0, 8)}`}
                        email={r.userEmail}
                      />
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {r.planName || r.plan}
                      {r.trialEndDate && <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600 }}> · trial</span>}
                    </td>
                    <td style={{ fontWeight: 700 }}>{fmtPrice(r.price)}{r.trialEndDate && <span style={{ color: 'var(--text-dim)', fontWeight: 400, fontSize: 12 }}> free</span>}</td>
                    <td style={{ color: 'var(--text-dim)', textTransform: 'capitalize' }}>{r.paymentMethod || '—'}</td>
                    <td style={{ color: 'var(--text-dim)' }}>{r.billingCycle || '—'}</td>
                    <td style={{ color: 'var(--text-dim)' }}>{fmtDate(r.startDate)}</td>
                    <td style={{ color: 'var(--text-dim)' }}>{fmtDate(r.endDate)}</td>
                    <td>
                      <StatusBadge status={r.status || 'None'} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        {r.status === 'Pending' && (
                          <button className="btn btn-success btn-sm" disabled={busy} onClick={() => { setSel(r); setNotes('') }}>Review</button>
                        )}
                        {r.status !== 'Pending' && (
                          <button className="btn btn-outline btn-sm" onClick={() => { setSel(r); setNotes('') }}>Manage</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {rows.length === 0 && !loading && <Empty title="No subscriptions" message="User subscription plans will appear here." icon={<CreditCard size={40} />} />}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '12px 0' }}>
            <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
            <span style={{ lineHeight: '30px', fontSize: 13, color: 'var(--text-dim)' }}>Page {page} of {totalPages}</span>
            <button className="btn btn-outline btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        )}
      </div>

      <Modal open={!!sel} onClose={() => setSel(null)} title={`${sel?.plan || 'Subscription'} · ${fmtPrice(sel?.price)}`}>
        {sel && (
          <div>
            <div className="detail-grid">
              <div className="detail-item"><div className="k">User</div><div className="v">{sel.userName || 'Unknown'}</div></div>
              <div className="detail-item"><div className="k">Email</div><div className="v dim">{sel.userEmail || '—'}</div></div>
              <div className="detail-item"><div className="k">Plan</div><div className="v">{sel.plan} <span className="mono">(${sel.price}/mo)</span></div></div>
              <div className="detail-item"><div className="k">Billing</div><div className="v">{sel.billingCycle || 'Monthly'}</div></div>
              <div className="detail-item"><div className="k">Payment</div><div className="v" style={{ textTransform: 'capitalize' }}>{sel.paymentMethod || '—'}{sel.paymentReference ? ` · ${sel.paymentReference}` : ''}</div></div>
              <div className="detail-item"><div className="k">Auto-renew</div><div className="v">{sel.autoRenew ? 'Yes' : 'No'}</div></div>
              <div className="detail-item"><div className="k">Requested</div><div className="v dim">{fmtDate(sel.createdAt)}</div></div>
              {sel.startDate && <div className="detail-item"><div className="k">Started</div><div className="v dim">{fmtDate(sel.startDate)}</div></div>}
              {sel.endDate && <div className="detail-item"><div className="k">Ends</div><div className="v dim">{fmtDate(sel.endDate)}</div></div>}
              {sel.adminNotes && <div className="detail-item"><div className="k">Admin notes</div><div className="v dim">{sel.adminNotes}</div></div>}
            </div>

            <div className="field" style={{ marginTop: 14 }}>
              <label className="label">Admin notes</label>
              <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional note..." />
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
              {sel.status === 'Pending' && (
                <>
                  <button className="btn btn-success" disabled={busy} onClick={() => act('Active')}>Approve & activate</button>
                  <button className="btn btn-outline" disabled={busy} onClick={() => act('Rejected')}>Reject</button>
                </>
              )}
              {sel.status === 'Active' && (
                <button className="btn btn-danger" disabled={busy} onClick={() => act('Cancelled')}>Cancel plan</button>
              )}
              {(sel.status === 'Rejected' || sel.status === 'Cancelled' || sel.status === 'Expired') && (
                <button className="btn btn-success" disabled={busy} onClick={() => act('Active')}>Re-activate</button>
              )}
              <button className="btn btn-danger btn-sm" disabled={busy} onClick={remove} style={{ marginLeft: 'auto' }}>Delete</button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
