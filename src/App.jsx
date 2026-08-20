import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { SearchProvider } from './context/SearchContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Users from './pages/Users'
import Profiles from './pages/Profiles'
import Verifications from './pages/Verifications'
import Listings from './pages/Listings'
import Contracts from './pages/Contracts'
import Withdrawals from './pages/Withdrawals'
import PaymentProofs from './pages/PaymentProofs'
import Transfers from './pages/Transfers'
import Subscriptions from './pages/Subscriptions'
import Reports from './pages/Reports'
import Audit from './pages/Audit'
import Marketplace from './pages/Marketplace'
import Tickets from './pages/Tickets'
import ChatMonitor from './pages/ChatMonitor'
import CallMonitor from './pages/CallMonitor'
import ContentManagement from './pages/ContentManagement'
import Tracking from './pages/Tracking'

function Protected({ children }) {
  const { user, loading, isAdmin } = useAuth()
  if (loading) return <div className="page-loader"><div className="spinner" /></div>
  if (!isAdmin) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <SearchProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<Protected><Layout /></Protected>}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/users" element={<Users />} />
          <Route path="/models" element={<Profiles kind="models" />} />
          <Route path="/brands" element={<Profiles kind="brands" />} />
          <Route path="/agencies" element={<Profiles kind="agencies" />} />
          <Route path="/verifications" element={<Verifications />} />
          <Route path="/bookings" element={<Listings kind="bookings" />} />
          <Route path="/castings" element={<Listings kind="castings" />} />
          <Route path="/campaigns" element={<Listings kind="campaigns" />} />
          <Route path="/events" element={<Listings kind="events" />} />
          <Route path="/contracts" element={<Contracts />} />
          <Route path="/withdrawals" element={<Withdrawals />} />
          <Route path="/payment-proofs" element={<PaymentProofs />} />
          <Route path="/transfers" element={<Transfers />} />
          <Route path="/subscriptions" element={<Subscriptions />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/audit" element={<Audit />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/tickets" element={<Tickets />} />
          <Route path="/chat-monitor" element={<ChatMonitor />} />
          <Route path="/call-monitor" element={<CallMonitor />} />
          <Route path="/tracking" element={<Tracking />} />
          <Route path="/content" element={<ContentManagement />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SearchProvider>
  )
}
