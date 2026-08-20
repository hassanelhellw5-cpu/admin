import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { api, tokenStore, errMsg } from '../api/client'

const AuthContext = createContext(null)

const IDLE_TIMEOUT_MS = 15 * 60 * 1000

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const idleTimer = useRef(null)

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout') } catch { /* ignore */ }
    tokenStore.clear()
    setUser(null)
  }, [])

  const logoutRef = useRef(logout)
  logoutRef.current = logout

  useEffect(() => {
    if (!user) return
    const doLogout = () => { logoutRef.current() }
    const reset = () => {
      clearTimeout(idleTimer.current)
      idleTimer.current = setTimeout(doLogout, IDLE_TIMEOUT_MS)
    }
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }))
    reset()
    return () => {
      clearTimeout(idleTimer.current)
      events.forEach((e) => window.removeEventListener(e, reset))
    }
  }, [user])

  const loadUser = useCallback(async (silent) => {
    if (!tokenStore.getAccess()) {
      setUser(null)
      setLoading(false)
      return null
    }
    try {
      const r = await api.get('/auth/me')
      setUser(r.data)
      return r.data
    } catch {
      if (!silent) setUser(null)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadUser() }, [loadUser])

  const login = async (email, password) => {
    const r = await api.post('/auth/login', { email, password })
    const t = r.data?.accessToken || r.data?.token
    if (!t) throw new Error('Invalid response from server')
    tokenStore.set(t, r.data?.refreshToken)
    const u = await loadUser(true)
    if (!u) throw new Error('Could not load account')
    return u
  }

  const hasRole = (...roles) => Boolean(user?.roles?.some((r) => roles.includes(r)))

  const isAdmin = Boolean(user && hasRole('Admin', 'SuperAdmin'))

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, logout, loadUser, hasRole, isAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export { errMsg }
