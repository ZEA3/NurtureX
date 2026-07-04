// src/pages/user/UserBabies.jsx
import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { babyService } from '../../services/babyService'
import { supabase } from '../../supabaseClient'
import Modal from '../../components/Modal'
import EmptyState from '../../components/EmptyState'
import Icon from '../../components/Icon'

const EMPTY_FORM = { name: '', birth_date: '', gender: '', blood_type: '', notes: '' }

export default function UserBabies() {
  const { profile } = useAuth()
  const { showToast } = useToast()

  const [babies,  setBabies]  = useState([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(false)   // 'add' | 'edit' | false
  const [editing, setEditing] = useState(null)
  const [form,    setForm]    = useState(EMPTY_FORM)
  const [saving,  setSaving]  = useState(false)
  const [deleting,setDeleting]= useState(null)

  const load = () => {
    if (!profile?.id) return
    babyService.getByParent(profile.id)
      .then(setBabies)
      .catch(() => showToast('Failed to load babies', 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [profile?.id])

  const openAdd = () => { setForm(EMPTY_FORM); setEditing(null); setModal('add') }
  const openEdit = (baby) => {
    setForm({ name: baby.name || '', birth_date: baby.birth_date || '', gender: baby.gender || '', blood_type: baby.blood_type || '', notes: baby.notes || '' })
    setEditing(baby)
    setModal('edit')
  }

  const handleSave = async () => {
    if (!form.name.trim()) { showToast('Baby name is required', 'error'); return }
    setSaving(true)
    try {
      if (modal === 'add') {
        const { error } = await supabase.from('babies').insert({ ...form, parent_id: profile.id })
        if (error) throw error
        showToast('Baby added successfully!', 'success')
      } else {
        const { error } = await supabase.from('babies').update(form).eq('id', editing.id)
        if (error) throw error
        showToast('Baby updated!', 'success')
      }
      setModal(false)
      load()
    } catch (e) {
      showToast(e.message || 'Save failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (baby) => {
    if (!window.confirm(`Delete ${baby.name}? This cannot be undone.`)) return
    setDeleting(baby.id)
    try {
      const { error } = await supabase.from('babies').delete().eq('id', baby.id)
      if (error) throw error
      showToast('Baby removed', 'success')
      load()
    } catch (e) {
      showToast(e.message || 'Delete failed', 'error')
    } finally {
      setDeleting(null)
    }
  }

  const calcAge = (birth_date) => {
    if (!birth_date) return null
    const diff = Date.now() - new Date(birth_date)
    const months = Math.floor(diff / (30.44 * 86400000))
    if (months < 12) return `${months} mo${months !== 1 ? 's' : ''}`
    const years = Math.floor(months / 12)
    return `${years} yr${years !== 1 ? 's' : ''}`
  }

  const GENDER_COLORS = { male: '#3B82F6', female: '#EC4899', other: '#8B5CF6' }

  if (loading) return (
    <div className="page-content">
      <div className="skeleton" style={{ height: 32, width: 180, marginBottom: 24 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
        {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 180 }} />)}
      </div>
    </div>
  )

  return (
    <div className="page-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>My Babies</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{babies.length} registered</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <Icon name="plus" size={16} /> Add Baby
        </button>
      </div>

      {babies.length === 0
        ? <EmptyState icon="baby" title="No babies registered" description="Add your baby's profile to track health and book appointments." action={{ label: 'Add Baby', onClick: openAdd }} />
        : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {babies.map(baby => {
              const age = calcAge(baby.birth_date)
              const initials = baby.name?.slice(0, 2).toUpperCase() || '?'
              const genderColor = GENDER_COLORS[baby.gender?.toLowerCase()] || '#2D6A4F'
              return (
                <div key={baby.id} className="card" style={{ position: 'relative', overflow: 'hidden' }}>
                  {/* Color accent bar */}
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: genderColor }} />

                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16, marginTop: 4 }}>
                    <div style={{ width: 52, height: 52, borderRadius: '50%', background: `${genderColor}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: genderColor, fontWeight: 800, fontSize: 18, fontFamily: 'Instrument Serif, serif' }}>
                      {initials}
                    </div>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 16 }}>{baby.name}</p>
                      {age && <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{age} old</p>}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                    {baby.birth_date && (
                      <div style={{ display: 'flex', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                        <Icon name="calendar" size={14} />
                        <span>{new Date(baby.birth_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                      </div>
                    )}
                    {baby.gender && (
                      <div style={{ display: 'flex', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                        <Icon name="user" size={14} />
                        <span style={{ textTransform: 'capitalize' }}>{baby.gender}</span>
                      </div>
                    )}
                    {baby.blood_type && (
                      <div style={{ display: 'flex', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                        <Icon name="health" size={14} />
                        <span>Blood type: <strong>{baby.blood_type}</strong></span>
                      </div>
                    )}
                    {baby.notes && (
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: 4 }}>{baby.notes}</p>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-secondary" style={{ flex: 1, fontSize: 13 }} onClick={() => openEdit(baby)}>
                      Edit
                    </button>
                    <button className="btn btn-danger" style={{ fontSize: 13 }} onClick={() => handleDelete(baby)} disabled={deleting === baby.id}>
                      {deleting === baby.id ? '...' : 'Delete'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )
      }

      {/* Add / Edit Modal */}
      <Modal isOpen={!!modal} onClose={() => setModal(false)} title={modal === 'add' ? 'Add Baby' : 'Edit Baby'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Baby's Name *</label>
            <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Enter baby's name" />
          </div>
          <div className="form-group">
            <label className="form-label">Date of Birth</label>
            <input className="form-input" type="date" value={form.birth_date} onChange={e => setForm(f => ({ ...f, birth_date: e.target.value }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Gender</label>
              <select className="form-input" value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Blood Type</label>
              <select className="form-input" value={form.blood_type} onChange={e => setForm(f => ({ ...f, blood_type: e.target.value }))}>
                <option value="">Unknown</option>
                {['A+','A-','B+','B-','O+','O-','AB+','AB-'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Notes / Medical Info</label>
            <textarea className="form-input" rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Allergies, conditions, etc." style={{ resize: 'vertical' }} />
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : modal === 'add' ? 'Add Baby' : 'Save Changes'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
