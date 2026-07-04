// src/pages/admin/AdminBabies.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import Icon from '../../components/Icon'
import EmptyState from '../../components/EmptyState'

const ageStr = (b) => {
  if (!b) return '—'
  const m = Math.floor((Date.now() - new Date(b)) / (1000*60*60*24*30))
  return m < 24 ? `${m} mo` : `${Math.floor(m/12)} yr`
}

export default function AdminBabies() {
  const [babies,  setBabies]  = useState([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')

  useEffect(() => {
    supabase.from('babies')
      .select('*, parent:profiles!user_id(full_name)')
      .order('created_at', { ascending:false })
      .then(({ data }) => { setBabies(data??[]); setLoading(false) })
  }, [])

  const filtered = babies.filter(b =>
    !search || (b.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (b.parent?.full_name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <div className="page-header">
        <div><h1>All Babies</h1><p>View all registered babies on the platform</p></div>
        <span className="badge badge-amber">{babies.length} babies</span>
      </div>

      <div className="table-wrap">
        <div className="table-header">
          <div className="table-search">
            <Icon name="search" size={14} color="var(--text-muted)" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or parent…" />
          </div>
        </div>

        {loading ? (
          <div style={{ padding:32, display:'flex', justifyContent:'center' }}><span className="spinner spinner-lg" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="baby" title="No babies registered" />
        ) : (
          <table>
            <thead>
              <tr><th>Baby Name</th><th>Age</th><th>Date of Birth</th><th>Parent</th><th>Registered</th></tr>
            </thead>
            <tbody>
              {filtered.map(b => (
                <tr key={b.id}>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap: 10 }}>
                      <div className="avatar avatar-xs" style={{ background:'#FEF3C7', color:'#B45309' }}>{b.name?.[0]?.toUpperCase()}</div>
                      <span style={{ fontWeight: 600 }}>{b.name}</span>
                    </div>
                  </td>
                  <td style={{ fontWeight: 700, color:'var(--brand)' }}>{ageStr(b.birth_date)}</td>
                  <td style={{ fontSize: 12, color:'var(--text-muted)' }}>{b.birth_date ? new Date(b.birth_date).toLocaleDateString() : '—'}</td>
                  <td style={{ color:'var(--text-secondary)' }}>{b.parent?.full_name ?? '—'}</td>
                  <td style={{ fontSize: 12, color:'var(--text-muted)' }}>{b.created_at ? new Date(b.created_at).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
