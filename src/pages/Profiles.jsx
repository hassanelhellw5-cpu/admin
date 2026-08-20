import { useState, useEffect, useCallback } from 'react'
import { Sparkles, Building2, Handshake, Star } from 'lucide-react'
import { get, errMsg } from '../api/client'
import { useToast } from '../components/Toast'
import { Loader, Empty, Pagination, StatusBadge, UserCell } from '../components/ui'

const META = {
  models: { title: 'Models', icon: Sparkles, endpoint: '/profiles/search', role: '' },
  brands: { title: 'Brands', icon: Building2, endpoint: '/users', role: 'Brand' },
  agencies: { title: 'Agencies', icon: Handshake, endpoint: '/users', role: 'Agency' },
}

export default function Profiles({ kind }) {
  const meta = META[kind]
  const toast = useToast()
  const [data, setData] = useState(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, pageSize: 20 }
      if (kind === 'models') params.sortBy = 'createdAt', params.sortOrder = 'desc'
      else params.role = meta.role
      setData(await get(meta.endpoint, params))
    } catch (e) { toast.error(errMsg(e)) } finally { setLoading(false) }
  }, [page, kind])

  useEffect(() => { load() }, [load])

  if (loading && !data) return <Loader />
  const Icon = meta.icon

  const isModel = kind === 'models'
  const isAgency = kind === 'agencies'
  const rows = isModel ? data?.data?.map((p) => ({
    id: p.userId,
    name: `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Unnamed model',
    email: p.user?.email || p.email,
    img: p.user?.profilePictureUrl || p.profilePictureUrl,
    sub1: [p.city, p.country].filter(Boolean).join(', ') || '—',
    sub2: `${p.currency || 'USD'} ${p.dailyRate ?? '—'}/day`,
    extra: p.gender ? `${p.gender} · ${p.experienceLevel || 'N/A'}` : (p.experienceLevel || ''),
    rating: p.averageRating,
    status: p.user?.status || 'Active',
    profile: null,
  })) : data?.data?.map((u) => ({
    id: u.id,
    name: u.displayName || u.userName || '—',
    email: u.email,
    img: u.profilePictureUrl,
    sub1: (u.roles || []).join(', '),
    sub2: u.profile ? [u.profile.city, u.profile.country].filter(Boolean).join(', ') || '—' : '',
    extra: isAgency && u.profile ? [
      u.profile.specialties,
      u.profile.yearsInBusiness ? `${u.profile.yearsInBusiness}y` : '',
      u.profile.commissionRate != null ? `${u.profile.commissionRate}% commission` : '',
    ].filter(Boolean).join(' · ') : '',
    rating: u.profile?.averageRating || null,
    status: u.status,
    profile: u.profile,
  }))

  return (
    <>
      <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, marginBottom: 4 }}>{meta.title}</h1>
      <p style={{ color: 'var(--text-dim)', marginBottom: 22 }}>Registered {meta.title.toLowerCase()}.</p>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Profile</th>{isModel && <th>Details</th>}{isAgency && <th>Details</th>}<th>Location</th>{isModel && <th>Rate</th>}{(isModel || isAgency) && <th>Rating</th>}{isAgency && <th>Models</th>}<th>Status</th></tr>
            </thead>
            <tbody>
              {rows?.map((r) => (
                <tr key={r.id}>
                  <td>
                    <UserCell name={r.name} email={r.email} img={r.img} />
                  </td>
                  {isModel && <td style={{ color: 'var(--text-dim)' }}>{r.extra || '—'}</td>}
                  {isAgency && <td style={{ color: 'var(--text-dim)', fontSize: 12 }}>{r.extra || '—'}</td>}
                  <td style={{ color: 'var(--text-dim)' }}>{r.sub1 || '—'}</td>
                  {isModel && <td style={{ fontWeight: 600 }}>{r.sub2}</td>}
                  {(isModel || isAgency) && <td>{r.rating ? <span className="badge badge-amber"><Star size={11} /> {Number(r.rating).toFixed(1)}</span> : <span className="badge badge-gray">—</span>}</td>}
                  {isAgency && <td style={{ fontWeight: 600 }}>{r.profile?.totalModels ?? '—'}</td>}
                  <td><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows?.length === 0 && <Empty title={`No ${meta.title.toLowerCase()} yet`} icon={<Icon size={40} />} />}
        {data && <div style={{ padding: '0 16px' }}><Pagination page={page} totalPages={data.totalPages} total={data.total} onChange={setPage} /></div>}
      </div>
    </>
  )
}
