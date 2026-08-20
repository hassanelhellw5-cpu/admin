import axios from 'axios'
import { API_BASE } from '../config'

export const tokenStore = {
  getAccess: () => localStorage.getItem('bm_admin_access'),
  getRefresh: () => localStorage.getItem('bm_admin_refresh'),
  set(access, refresh) {
    if (access) localStorage.setItem('bm_admin_access', access)
    if (refresh) localStorage.setItem('bm_admin_refresh', refresh)
  },
  clear() {
    localStorage.removeItem('bm_admin_access')
    localStorage.removeItem('bm_admin_refresh')
  },
}

export const api = axios.create({ baseURL: API_BASE, timeout: 25000 })

api.interceptors.request.use((config) => {
  const t = tokenStore.getAccess()
  if (t) config.headers.Authorization = `Bearer ${t}`
  return config
})

let refreshing = null

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { response, config } = error
    if (response?.status === 401 && !config._retry && !config.url.includes('/auth/')) {
      config._retry = true
      try {
        refreshing = refreshing || api.post('/auth/refresh', { refreshToken: tokenStore.getRefresh() }).then((r) => {
          const t = r.data?.accessToken || r.data?.token
          const rt = r.data?.refreshToken
          if (!t) throw new Error('no token')
          tokenStore.set(t, rt)
          return t
        }).finally(() => { refreshing = null })
        const t = await refreshing
        config.headers.Authorization = `Bearer ${t}`
        return api(config)
      } catch {
        tokenStore.clear()
        if (window.location.pathname !== '/login') window.location.href = '/login'
        return Promise.reject(error)
      }
    }
    return Promise.reject(error)
  },
)

export async function get(url, params) {
  const r = await api.get(url, { params })
  return r.data
}

export async function post(url, body, params) {
  const r = await api.post(url, body, { params })
  return r.data
}

export async function put(url, body, params) {
  const r = await api.put(url, body, { params })
  return r.data
}

export async function del(url, params) {
  const r = await api.delete(url, { params })
  return r.data
}

export async function upload(url, formData) {
  const r = await api.post(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return r.data
}

export function errMsg(err) {
  const d = err?.response?.data
  return d?.message || d?.error || d?.title || err?.message || 'Something went wrong'
}
