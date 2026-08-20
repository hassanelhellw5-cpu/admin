import { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle2, AlertCircle } from 'lucide-react'

const ToastContext = createContext(null)

let idSeq = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const push = useCallback((type, msg) => {
    const id = ++idSeq
    setToasts((t) => [...t, { id, type, msg }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800)
  }, [])

  const success = useCallback((msg) => push('success', msg), [push])
  const error = useCallback((msg) => push('error', msg), [push])

  return (
    <ToastContext.Provider value={{ success, error }}>
      {children}
      <div className="toast-zone">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            {t.type === 'success' ? <CheckCircle2 size={17} /> : <AlertCircle size={17} />}
            {t.msg}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
