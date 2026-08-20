import { useState, useEffect } from 'react'
import {
  Users, Sparkles, Building2, Handshake, Briefcase, Megaphone, Wallet, BadgeCheck,
  Clock, LifeBuoy, FileSignature, CalendarDays, TrendingUp, AlertTriangle, Receipt, HandCoins, RefreshCw, CreditCard, DollarSign,
} from 'lucide-react'
import { get } from '../api/client'
import { Loader } from '../components/ui'
import LiveWalletActivity from '../components/LiveWalletActivity'
import LiveTracking from '../components/LiveTracking'
import { Donut, BarList, AreaChart, orderedCounts, PALETTE } from '../components/charts'

function StatCard({ icon: Icon, label, value, sub, gradient }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: gradient, color: '#fff' }}><Icon size={19} /></div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{typeof value === 'number' ? value.toLocaleString() : value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}

function ChartCard({ title, icon: Icon, children, span }) {
  return (
    <div className="card" style={span ? { gridColumn: span } : undefined}>
      <div className="card-head"><div className="card-title"><Icon size={16} style={{ color: 'var(--primary)' }} /> {title}</div></div>
      <div className="card-pad">{children}</div>
    </div>
  )
}

const GRAD = 'linear-gradient(135deg,#7c3aed,#ec4899)'
const ROLE_TINTS = { Admin: '#3b82f6', SuperAdmin: '#7c3aed', Model: '#ec4899', Brand: '#f59e0b', Agency: '#10b981' }
const STATUS_TINTS = { Active: '#10b981', Inactive: '#9ca3af', Blocked: '#ef4444', Suspended: '#f59e0b', PendingVerification: '#3b82f6' }
const REPORT_TINTS = { Pending: '#f59e0b', 'In Review': '#7c3aed', Resolved: '#10b981', Closed: '#9ca3af', Dismissed: '#64748b' }
const BOOKING_TINTS = { Pending: '#f59e0b', Confirmed: '#3b82f6', InProgress: '#7c3aed', Completed: '#10b981', Cancelled: '#ef4444' }
const CASTING_TINTS = { Open: '#10b981', Closed: '#64748b', Draft: '#9ca3af', Cancelled: '#ef4444' }
const CAMPAIGN_TINTS = { Active: '#3b82f6', Draft: '#9ca3af', Completed: '#10b981', Cancelled: '#ef4444' }
const EVENT_TINTS = { Draft: '#9ca3af', Open: '#10b981', Published: '#3b82f6', Completed: '#7c3aed', Cancelled: '#ef4444' }
const CONTRACT_TINTS = { Draft: '#9ca3af', Pending: '#f59e0b', Signed: '#10b981', Expired: '#64748b', Cancelled: '#ef4444' }
const VERIF_TINTS = { Pending: '#f59e0b', Approved: '#10b981', Rejected: '#ef4444' }
const TICKET_TINTS = { Open: '#f59e0b', WaitingOnCustomer: '#3b82f6', InProgress: '#7c3aed', Resolved: '#10b981', Closed: '#9ca3af' }
const SUB_TINTS = { Free: '#9ca3af', Starter: '#3b82f6', Professional: '#8b5cf6', Enterprise: '#f59e0b' }

export default function Dashboard() {
  const [s, setS] = useState({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = async () => {
    setRefreshing(true)
    const names = ['dash', 'users', 'reports', 'verifications', 'withdrawals', 'proofs', 'bookings', 'castings', 'campaigns', 'events', 'contracts', 'subStats', 'tickets']
    const calls = [
      get('/admin/dashboard'),
      get('/users', { pageSize: 200 }),
      get('/admin/reports', { pageSize: 50 }),
      get('/admin/verifications'),
      get('/admin/withdrawals'),
      get('/admin/payment-proofs'),
      get('/bookings', { pageSize: 100, sortBy: 'createdAt', sortOrder: 'desc' }),
      get('/castings', { pageSize: 100, sortBy: 'createdAt', sortOrder: 'desc' }),
      get('/campaigns', { pageSize: 100, sortBy: 'createdAt', sortOrder: 'desc' }),
      get('/events', { pageSize: 100, sortBy: 'createdAt', sortOrder: 'desc' }),
      get('/contracts', { pageSize: 100, sortBy: 'createdAt', sortOrder: 'desc' }),
      get('/admin/subscriptions/stats'),
      get('/admin/tickets', { pageSize: 100 }),
    ]
    const results = await Promise.allSettled(calls)
    const out = {}
    names.forEach((n, i) => { out[n] = results[i].status === 'fulfilled' ? results[i].value : null })
    setS(out)
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { load() }, [])
  if (loading) return <Loader />

  const dash = s.dash || {}
  const users = s.users?.data || []
  const reports = s.reports?.data || []
  const verifications = s.verifications || []
  const withdrawals = s.withdrawals || []
  const proofs = s.proofs || []
  const bookings = s.bookings?.data || []
  const castings = s.castings?.data || []
  const campaigns = s.campaigns?.data || []
  const events = s.events?.data || []
  const contracts = s.contracts?.data || []
  const subStats = s.subStats || { total: 0, active: 0, pending: 0, cancelled: 0, expired: 0, totalRevenue: 0, byPlan: [] }
  const ticketList = s.tickets?.data || []
  const ticketCounts = { Open: 0, WaitingOnCustomer: 0, InProgress: 0, Resolved: 0, Closed: 0 }
  ticketList.forEach((t) => { const k = t.status; if (k in ticketCounts) ticketCounts[k]++ })

  const roleCounts = { Admin: 0, SuperAdmin: 0, Model: 0, Brand: 0, Agency: 0 }
  users.forEach((u) => (u.roles || []).forEach((r) => { if (r in roleCounts) roleCounts[r]++ }))
  const statusCounts = { Active: 0, Inactive: 0, Blocked: 0, Suspended: 0, PendingVerification: 0 }
  users.forEach((u) => { const k = u.status; if (k in statusCounts) statusCounts[k]++ })
  const reportCounts = { Pending: 0, 'In Review': 0, Resolved: 0, Closed: 0, Dismissed: 0 }
  reports.forEach((r) => { const st = r.Status || r.status; if (st in reportCounts) reportCounts[st]++ })
  const verifCounts = { Pending: 0, Approved: 0, Rejected: 0 }
  verifications.forEach((v) => { const k = v.status; if (k in verifCounts) verifCounts[k]++ })
  const wdCounts = { Pending: 0, Approved: 0, Completed: 0, Rejected: 0 }
  let pendingWdAmount = 0
  withdrawals.forEach((w) => { const k = w.status; if (k in wdCounts) wdCounts[k]++; if (w.status === 'Pending') pendingWdAmount += Number(w.amount || 0) })
  const proofCounts = { Pending: 0, Approved: 0, Rejected: 0 }
  let pendingProofAmount = 0
  proofs.forEach((p) => { const k = p.status; if (k in proofCounts) proofCounts[k]++; if (p.status === 'Pending') pendingProofAmount += Number(p.amount || 0) })
  const bookingCounts = { Pending: 0, Confirmed: 0, InProgress: 0, Completed: 0, Cancelled: 0 }
  let bookingValue = 0
  bookings.forEach((b) => { const k = b.status; if (k in bookingCounts) bookingCounts[k]++; if (b.agreedFee != null) bookingValue += Number(b.agreedFee || 0) })
  const castingCounts = { Open: 0, Closed: 0, Draft: 0, Cancelled: 0 }
  castings.forEach((c) => { const k = c.status; if (k in castingCounts) castingCounts[k]++ })
  const campaignCounts = { Active: 0, Draft: 0, Completed: 0, Cancelled: 0 }
  campaigns.forEach((c) => { const k = c.status; if (k in campaignCounts) campaignCounts[k]++ })
  const eventCounts = { Draft: 0, Open: 0, Published: 0, Completed: 0, Cancelled: 0 }
  events.forEach((e) => { const k = e.status; if (k in eventCounts) eventCounts[k]++ })
  const contractCounts = { Draft: 0, Pending: 0, Signed: 0, Expired: 0, Cancelled: 0 }
  contracts.forEach((c) => { const k = c.status; if (k in contractCounts) contractCounts[k]++ })

  const activitySeries = [
    { name: 'Bookings', color: PALETTE.violet, entries: bookings.map((b) => b.createdAt) },
    { name: 'Castings', color: PALETTE.pink, entries: castings.map((c) => c.createdAt) },
    { name: 'Campaigns', color: PALETTE.amber, entries: campaigns.map((c) => c.createdAt) },
    { name: 'Events', color: PALETTE.cyan, entries: events.map((e) => e.createdAt) },
    { name: 'Contracts', color: PALETTE.green, entries: contracts.map((c) => c.createdAt) },
  ]

  const totalSigned = contractCounts.Signed
  const contractSignedRate = contracts.length ? Math.round((totalSigned / contracts.length) * 100) : 0
  const openCastings = castingCounts.Open
  const activeCampaigns = campaignCounts.Active
  const publishedEvents = eventCounts.Open + eventCounts.Published
  const pendingAttention = [
    verifCounts.Pending > 0 && { icon: BadgeCheck, label: 'Pending verifications', value: verifCounts.Pending, sub: `${verifications.length} total`, bg: 'var(--amber-soft)', color: '#b45309' },
    wdCounts.Pending > 0 && { icon: HandCoins, label: 'Pending payouts', value: `$${Number(pendingWdAmount).toLocaleString()}`, sub: `${wdCounts.Pending} requests`, bg: 'var(--amber-soft)', color: '#b45309' },
    proofCounts.Pending > 0 && { icon: Receipt, label: 'Pending deposits', value: `$${Number(pendingProofAmount).toLocaleString()}`, sub: `${proofCounts.Pending} proofs`, bg: 'var(--blue-soft)', color: '#1d4ed8' },
    reportCounts.Pending > 0 && { icon: AlertTriangle, label: 'Pending reports', value: reportCounts.Pending, sub: `${reportCounts['In Review'] || 0} in review`, bg: 'var(--red-soft)', color: '#b91c1c' },
    bookingCounts.Pending > 0 && { icon: Clock, label: 'Pending bookings', value: bookingCounts.Pending, sub: `${bookingCounts.InProgress || 0} in progress`, bg: 'var(--violet-soft)', color: '#6d28d9' },
    subStats.pending > 0 && { icon: CreditCard, label: 'Pending subs', value: subStats.pending, sub: `${subStats.active} active`, bg: 'var(--blue-soft)', color: '#1d4ed8' },
    (ticketCounts.Open + ticketCounts.WaitingOnCustomer) > 0 && { icon: LifeBuoy, label: 'Open tickets', value: ticketCounts.Open + ticketCounts.WaitingOnCustomer, sub: `${ticketCounts.InProgress} in progress`, bg: 'var(--red-soft)', color: '#b91c1c' },
  ].filter(Boolean)

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div>
          <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 24, fontWeight: 700 }}>Admin Dashboard</h1>
          <p style={{ color: 'var(--text-dim)', fontSize: 13.5 }}>Platform overview and key metrics at a glance.</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={load} disabled={refreshing}><RefreshCw size={14} className={refreshing ? 'spin' : ''} /> Refresh</button>
      </div>

      {/* ===== KPI Row ===== */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <StatCard icon={Users} label="Total users" value={dash.totalUsers} gradient={GRAD} sub={`${roleCounts.Model} models · ${roleCounts.Brand} brands`} />
        <StatCard icon={DollarSign} label="Total revenue" value={`$${Number(dash.totalRevenue || 0).toLocaleString()}`} gradient="linear-gradient(135deg,#10b981,#059669)" />
        <StatCard icon={Briefcase} label="Bookings" value={dash.totalBookings} sub={`${bookingCounts.InProgress || 0} active · $${Number(bookingValue).toLocaleString()} value`} gradient="linear-gradient(135deg,#8b5cf6,#7c3aed)" />
        <StatCard icon={CreditCard} label="Active subscriptions" value={subStats.active} sub={`$${Number(subStats.totalRevenue || 0).toLocaleString()}/mo revenue`} gradient="linear-gradient(135deg,#3b82f6,#2563eb)" />
        <StatCard icon={HandCoins} label="Pending payouts" value={withdrawals.filter((w) => w.status === 'Pending').length} sub={`$${Number(pendingWdAmount).toLocaleString()} to pay`} gradient="linear-gradient(135deg,#f59e0b,#f97316)" />
      </div>

      {/* ===== Row 2: Users ===== */}
      <div className="grid-2">
        <ChartCard title="Users by role" icon={Users}>
          <Donut items={orderedCounts(roleCounts)} tints={ROLE_TINTS} center={users.length || dash.totalUsers} centerSub="accounts" />
        </ChartCard>
        <ChartCard title="Users by status" icon={TrendingUp}>
          <BarList items={orderedCounts(statusCounts)} tints={STATUS_TINTS} />
        </ChartCard>
      </div>

      {/* ===== Row 3: Bookings & Reports ===== */}
      <div className="grid-2">
        <ChartCard title="Bookings by status" icon={Briefcase}>
          <Donut items={orderedCounts(bookingCounts)} tints={BOOKING_TINTS} center={bookings.length} centerSub="bookings" />
        </ChartCard>
        <ChartCard title="Reports by status" icon={LifeBuoy}>
          <BarList items={orderedCounts(reportCounts)} tints={REPORT_TINTS} />
        </ChartCard>
      </div>

      {/* ===== Row 4: Contracts & Verifications ===== */}
      <div className="grid-2">
        <ChartCard title="Contracts by status" icon={FileSignature}>
          <BarList items={orderedCounts(contractCounts)} tints={CONTRACT_TINTS} />
          <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--violet-soft)', borderRadius: 8, fontSize: 12, color: '#6d28d9', fontWeight: 600 }}>
            Signed rate: {contractSignedRate}% ({totalSigned}/{contracts.length})
          </div>
        </ChartCard>
        <ChartCard title="Verifications by status" icon={BadgeCheck}>
          <Donut items={orderedCounts(verifCounts)} tints={VERIF_TINTS} center={verifications.length} centerSub="requests" />
        </ChartCard>
      </div>

      {/* ===== Row 5: Castings / Campaigns / Events ===== */}
      <div className="grid-3">
        <ChartCard title="Castings" icon={Megaphone}>
          <BarList items={orderedCounts(castingCounts)} tints={CASTING_TINTS} />
        </ChartCard>
        <ChartCard title="Campaigns" icon={Megaphone}>
          <BarList items={orderedCounts(campaignCounts)} tints={CAMPAIGN_TINTS} />
        </ChartCard>
        <ChartCard title="Events" icon={CalendarDays}>
          <BarList items={orderedCounts(eventCounts)} tints={EVENT_TINTS} />
        </ChartCard>
      </div>

      {/* ===== Row 6: Subscriptions & Tickets ===== */}
      <div className="grid-2">
        <ChartCard title="Subscriptions by plan" icon={CreditCard}>
          {subStats.byPlan && subStats.byPlan.length > 0 ? (
            <BarList items={subStats.byPlan.map((p) => ({ label: p.plan, value: p.count }))} tints={SUB_TINTS} />
          ) : (
            <div className="chart-empty">No subscription data</div>
          )}
        </ChartCard>
        <ChartCard title="Support tickets" icon={LifeBuoy}>
          <BarList items={orderedCounts(ticketCounts)} tints={TICKET_TINTS} />
        </ChartCard>
      </div>

      {/* ===== Row 7: Needs Attention ===== */}
      {pendingAttention.length > 0 && (
        <>
          <div className="chart-section-title" style={{ marginBottom: 12 }}><AlertTriangle size={15} /> Needs attention</div>
          <div className="attention-grid" style={{ marginBottom: 22 }}>
            {pendingAttention.map((a, i) => (
              <div key={i} className="attention-card">
                <div className="attention-icon" style={{ background: a.bg, color: a.color }}><a.icon size={19} /></div>
                <div className="attention-meta">
                  <div className="a-label">{a.label}</div>
                  <div className="a-value">{a.value}</div>
                  <div className="a-sub">{a.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ===== Row 8: Live Tracking ===== */}
      <LiveTracking />

      {/* ===== Row 9: Activity Timeline ===== */}
      <ChartCard title="Platform activity — last 8 months" icon={TrendingUp}>
        <AreaChart series={activitySeries} />
      </ChartCard>

      <div style={{ marginTop: 22 }}>
        <LiveWalletActivity />
      </div>
    </>
  )
}
