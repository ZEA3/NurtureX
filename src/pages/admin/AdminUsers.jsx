// src/pages/admin/AdminUsers.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { useToast } from '../../hooks/useToast'
import StatusBadge from '../../components/StatusBadge'
import Icon from '../../components/Icon'
import EmptyState from '../../components/EmptyState'

export default function AdminUsers() {
  const toast = useToast()
  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [filter,  setFilter]  = useState('all')

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending:false })
    if (!error) setUsers(data ?? [])
    setLoading(false)
  }

  const updateRole = async (id, role) => {
    const { error } = await supabase.from('profiles').update({ role }).eq('id', id)
    if (error) { toast.error('Update failed'); return }
    setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u))
    toast.success('User role updated')
  }

  const deleteUser = async (id) => {
    if (!window.confirm('Delete this user?')) return
    const { error } = await supabase.from('profiles').delete().eq('id', id)
    if (error) { toast.error('Delete failed'); return }
    setUsers(prev => prev.filter(u => u.id !== id))
    toast.success('User deleted')
  }

  const filtered = users
    .filter(u => filter === 'all' || u.role === filter)
    .filter(u => !search || (u.full_name ?? '').toLowerCase().includes(search.toLowerCase()) || (u.email ?? '').toLowerCase().includes(search.toLowerCase()))

  return (
    <>
      <div className="page-header">
        <div><h1>User Management</h1><p>Manage all platform users</p></div>
        <span className="badge badge-blue">{users.length} total users</span>
      </div>

      <div className="filter-tabs">
        {['all','user','doctor','admin'].map(r => (
          <button key={r} className={`filter-tab${filter === r ? ' active' : ''}`} onClick={() => setFilter(r)}>
            {r === 'all' ? 'All Users' : r.charAt(0).toUpperCase() + r.slice(1) + 's'}
            {r !== 'all' && (
              <span style={{ marginLeft:5, fontSize:10, fontWeight:700, background: filter===r?'rgba(255,255,255,.25)':'var(--bg-alt)', padding:'1px 5px', borderRadius:99, color: filter===r?'#fff':'var(--text-muted)' }}>
                {users.filter(u => u.role === r).length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="table-wrap">
        <div className="table-header">
          <div className="table-search">
            <Icon name="search" size={14} color="var(--text-muted)" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email…" />
          </div>
        </div>

        {loading ? (
          <div style={{ padding:32, display:'flex', justifyContent:'center' }}><span className="spinner spinner-lg" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="users" title="No users found" />
        ) : (
          <table>
            <thead>
              <tr><th>User</th><th>Role</th><th>Joined</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap: 10 }}>
                      <div className="avatar avatar-sm">{u.full_name?.[0]?.toUpperCase() ?? '?'}</div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{u.full_name ?? '—'}</div>
                        <div style={{ fontSize: 11, color:'var(--text-muted)' }}>{u.email ?? u.id.slice(0,8)}</div>
                      </div>
                    </div>
                  </td>
                  <td><StatusBadge status={u.role} /></td>
                  <td style={{ fontSize: 12, color:'var(--text-muted)' }}>
                    {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td>
                    <div style={{ display:'flex', gap: 6 }}>
                      <select
                        className="form-select"
                        style={{ width:110, padding:'4px 28px 4px 8px', fontSize:11 }}
                        value={u.role ?? 'user'}
                        onChange={e => updateRole(u.id, e.target.value)}
                      >
                        <option value="user">User</option>
                        <option value="doctor">Doctor</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button className="icon-btn" style={{ color:'var(--danger)' }} onClick={() => deleteUser(u.id)} title="Delete">
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
