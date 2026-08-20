import { useState, useEffect, useCallback } from 'react'
import { ShoppingBag, RefreshCw } from 'lucide-react'
import { get, errMsg } from '../api/client'
import { useToast } from '../components/Toast'
import { Loader, Empty, Pagination } from '../components/ui'

function ListingThumb({ src }) {
  const [broken, setBroken] = useState(false)
  if (src && !broken) {
    return <img src={src} alt="" className="cell-avatar" style={{ objectFit: 'cover' }} onError={() => setBroken(true)} />
  }
  return <div className="cell-avatar"><ShoppingBag size={14} /></div>
}

function parseJson(s, f) {
  try {
    const v = JSON.parse(s)
    return Array.isArray(v) ? v : f
  } catch { return f }
}

export default function Marketplace() {
  const toast = useToast()
  const [data, setData] = useState(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    setRefreshing(true)
    try {
      setData(await get('/enterprise/marketplace', { page, pageSize: 20, sortBy: 'createdAt', sortOrder: 'desc' }))
    } catch (e) {
      toast.error(errMsg(e))
      setData({ data: [], total: 0, totalPages: 0 })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [page])

  useEffect(() => { load() }, [load])

  if (loading && !data) return <Loader />

  const rows = data?.data || []

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22 }}>Marketplace</h1>
        <button className="btn btn-outline btn-sm" onClick={load} disabled={refreshing}><RefreshCw size={14} className={refreshing ? 'spin' : ''} /> Refresh</button>
      </div>
      <p style={{ color: 'var(--text-dim)', marginBottom: 22 }}>Creator listings — services and assets published in the enterprise marketplace.</p>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Listing</th><th>Category</th><th>Price</th><th>Location</th><th>Seller</th><th>Created</th></tr></thead>
            <tbody>
              {rows.map((l) => {
                const imgs = parseJson(l.imageUrls, [])
                return (
                  <tr key={l.id}>
                    <td>
                      <div className="cell-user">
                        <ListingThumb src={imgs[0]} />
                        <div><div className="cell-name">{l.title || `Listing #${l.id}`}</div>{l.description && <div className="cell-sub">{l.description.slice(0, 60)}</div>}</div>
                      </div>
                    </td>
                    <td><span className="badge badge-violet">{l.category || '—'}</span></td>
                    <td style={{ fontWeight: 700 }}>{l.price != null ? `${l.currency || 'USD'} ${Number(l.price).toLocaleString()}` : '—'}<div className="cell-sub">{l.pricingType || ''}</div></td>
                    <td style={{ color: 'var(--text-dim)' }}>{l.location || 'Online'}</td>
                    <td className="mono" style={{ color: 'var(--text-dim)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.userId || l.sellerId || '—'}</td>
                    <td style={{ color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{l.createdAt ? new Date(l.createdAt).toLocaleDateString() : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <Empty title="No marketplace listings" message="Creator listings will appear here." icon={<ShoppingBag size={40} />} />}
        {data && <div style={{ padding: '0 16px' }}><Pagination page={page} totalPages={data.totalPages} total={data.total} onChange={setPage} /></div>}
      </div>
    </>
  )
}
