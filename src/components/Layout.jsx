import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom'
import {
  LayoutDashboard, Users, Sparkles, Building2, Handshake, Briefcase, Megaphone,
  CalendarDays, FileSignature, Wallet, BadgeCheck, Flag, ScrollText, ShoppingBag,
  LogOut, Shield, Search, CreditCard, LifeBuoy, MessageSquare, Image, Phone, Radio,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useSearch } from '../context/SearchContext'
import { useToast } from './Toast'

const groups = [
  {
    label: 'Overview',
    items: [
      { to: '/', end: true, label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Monitoring',
    items: [
      { to: '/tracking', label: 'Live Tracking', icon: Radio },
      { to: '/users', label: 'Users', icon: Users },
    ],
  },
  {
    label: 'People',
    items: [
      { to: '/models', label: 'Models', icon: Sparkles },
      { to: '/brands', label: 'Brands', icon: Building2 },
      { to: '/agencies', label: 'Agencies', icon: Handshake },
      { to: '/verifications', label: 'Verifications', icon: BadgeCheck },
    ],
  },
  {
    label: 'Business',
    items: [
      { to: '/bookings', label: 'Bookings', icon: Briefcase },
      { to: '/castings', label: 'Castings', icon: Megaphone },
      { to: '/campaigns', label: 'Campaigns', icon: Megaphone },
      { to: '/events', label: 'Events', icon: CalendarDays },
      { to: '/contracts', label: 'Contracts', icon: FileSignature },
    ],
  },
  {
    label: 'Finance',
    items: [
      { to: '/withdrawals', label: 'Withdrawals', icon: Wallet },
      { to: '/transfers', label: 'Transfers', icon: Wallet },
      { to: '/payment-proofs', label: 'Payment proofs', icon: Wallet },
      { to: '/subscriptions', label: 'Subscriptions', icon: CreditCard },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/content', label: 'Content', icon: Image },
      { to: '/tickets', label: 'Support tickets', icon: LifeBuoy },
      { to: '/reports', label: 'Reports', icon: Flag },
      { to: '/audit', label: 'Audit log', icon: ScrollText },
      { to: '/chat-monitor', label: 'Chat monitor', icon: MessageSquare },
      { to: '/call-monitor', label: 'Call monitor', icon: Phone },
      { to: '/marketplace', label: 'Marketplace', icon: ShoppingBag },
    ],
  },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const { query, setQuery } = useSearch()
  const toast = useToast()
  const nav = useNavigate()

  const onLogout = async () => {
    await logout()
    toast.success('Signed out')
    nav('/login')
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <Link to="/" className="brand">
          <div className="brand-logo"><Shield size={20} /></div>
          <div className="brand-text">
            <div className="brand-name">BrandMarket</div>
            <div className="brand-sub">Admin Panel</div>
          </div>
        </Link>

        {groups.map((g) => (
          <div key={g.label}>
            <div className="side-group">{g.label}</div>
            {g.items.map((it) => (
              <NavLink key={it.to} to={it.to} end={it.end} className={({ isActive }) => `side-link${isActive ? ' active' : ''}`}>
                <it.icon size={17} />
                <span>{it.label}</span>
              </NavLink>
            ))}
          </div>
        ))}

        <div className="side-footer">
          <div className="side-user">
            <div className="side-avatar">{(user?.fullName || user?.email || 'A').charAt(0).toUpperCase()}</div>
            <div className="side-user-meta">
              <div className="side-user-name">{user?.fullName || 'Admin'}</div>
              <div className="side-user-role">{(user?.roles || ['Admin']).join(', ')}</div>
            </div>
          </div>
          <button className="side-link" onClick={onLogout} style={{ marginTop: 8 }}>
            <LogOut size={17} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <h1>Admin Dashboard</h1>
          <div className="topbar-spacer" />
          <div className="search-box">
            <Search size={15} />
            <input placeholder="Search…" value={query || ''} onChange={(e) => setQuery?.(e.target.value)} />
          </div>
        </header>
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
