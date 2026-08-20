import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { errMsg } from '../api/client'

export default function Login() {
  const { login } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const u = await login(email, password)
      const roles = u?.roles || []
      if (!roles.some((r) => ['Admin', 'SuperAdmin'].includes(r))) {
        throw new Error('This panel is restricted to administrators.')
      }
      nav('/')
    } catch (err) {
      setError(errMsg(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-left">
        <div className="login-logo">
          <div className="brand-logo"><Shield size={22} /></div>
          <div>
            <div className="brand-name" style={{ fontSize: 18 }}>BrandMarket</div>
            <div className="brand-sub">Admin Panel</div>
          </div>
        </div>
        <h1 className="login-title">
          Manage the entire <span>marketplace</span> from one place.
        </h1>
        <p className="login-sub">
          Users, models, brands, agencies, bookings, payments, verification requests, reports and more — all backed by a secure JWT-protected API.
        </p>
      </div>

      <div className="login-right">
        <form className="login-card" onSubmit={submit}>
          <h2>Welcome back</h2>
          <p className="sub">Sign in to the admin dashboard.</p>

          {error && <div className="alert alert-error"><AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />{error}</div>}

          <div className="field">
            <label className="label">Email</label>
            <input className="input" style={{ width: '100%' }} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@example.com" required />
          </div>
          <div className="field">
            <label className="label">Password</label>
            <div style={{ position: 'relative' }}>
              <input className="input" style={{ width: '100%', paddingRight: 40 }} type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
              <button type="button" onClick={() => setShow(!show)} className="icon-btn" style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent' }}>
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button className="btn btn-primary" style={{ width: '100%', padding: '11px' }} disabled={loading}>
            {loading ? <Loader2 size={16} className="spin" style={{ animation: 'spin .8s linear infinite' }} /> : null}
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
