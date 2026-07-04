// src/pages/doctor/DoctorClinics.jsx
import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { clinicService } from '../../services/clinicService'
import { useToast } from '../../hooks/useToast'
import Modal from '../../components/Modal'
import Icon from '../../components/Icon'
import EmptyState from '../../components/EmptyState'

const EMPTY = { clinic_name: '', address: '', phone: '' }

export default function DoctorClinics() {
  const { user } = useAuth()
  const toast = useToast()
  const [clinics,   setClinics]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [modal,     setModal]     = useState(false)
  const [editing,   setEditing]   = useState(null)
  const [form,      setForm]      = useState(EMPTY)
  const [saving,    setSaving]    = useState(false)
  const [deleting,  setDeleting]  = useState(null)

  useEffect(() => { if (user) load() }, [user])

  const load = async () => {
    setLoading(true)
    try { setClinics(await clinicService.getByDoctor(user.id)) }
    catch { toast.error('Failed to load clinics') }
    finally { setLoading(false) }
  }

  const openAdd  = () => { setEditing(null); setForm(EMPTY); setModal(true) }
  const openEdit = (c) => { setEditing(c); setForm({ clinic_name: c.clinic_name, address: c.address ?? '', phone: c.phone ?? '' }); setModal(true) }
  const closeModal = () => setModal(false)

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      if (editing) {
        const updated = await clinicService.update(editing.id, form)
        setClinics(prev => prev.map(c => c.id === updated.id ? updated : c))
        toast.success('Clinic updated')
      } else {
        const created = await clinicService.create({ ...form, doctor_id: user.id })
        setClinics(prev => [...prev, created])
        toast.success('Clinic added')
      }
      closeModal()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this clinic?')) return
    setDeleting(id)
    try {
      await clinicService.remove(id)
      setClinics(prev => prev.filter(c => c.id !== id))
      toast.success('Clinic removed')
    } catch { toast.error('Delete failed') }
    finally { setDeleting(null) }
  }

  const field = (key) => ({ value: form[key], onChange: e => setForm(f => ({ ...f, [key]: e.target.value })) })

  return (
    <>
      <div className="page-header">
        <div>
          <h1>My Clinics</h1>
          <p>Manage your clinic locations and information</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <Icon name="plus" size={15} /> Add Clinic
        </button>
      </div>

      {loading ? (
        <div className="grid-2">
          {[1,2].map(i => <div key={i} className="skeleton skeleton-card" style={{ height: 160 }} />)}
        </div>
      ) : clinics.length === 0 ? (
        <EmptyState
          icon="clinic"
          title="No clinics yet"
          description="Add your clinic locations so patients can find you."
          action={<button className="btn btn-primary btn-sm" onClick={openAdd}><Icon name="plus" size={14} /> Add your first clinic</button>}
        />
      ) : (
        <div className="grid-2">
          {clinics.map(c => (
            <div key={c.id} className="card card-hover" style={{ transition: 'all .2s' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom: 14 }}>
                <div style={{ display:'flex', alignItems:'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background:'var(--brand-pale)', color:'var(--brand)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Icon name="clinic" size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{c.clinic_name}</div>
                    <span className="badge badge-green" style={{ marginTop: 3 }}>Active</span>
                  </div>
                </div>
                <div style={{ display:'flex', gap: 6 }}>
                  <button className="icon-btn" onClick={() => openEdit(c)} title="Edit">
                    <Icon name="edit" size={15} />
                  </button>
                  <button
                    className="icon-btn" title="Delete"
                    style={{ color:'var(--danger)' }}
                    onClick={() => handleDelete(c.id)}
                    disabled={deleting === c.id}
                  >
                    {deleting === c.id ? <span className="spinner" style={{ width:14,height:14 }} /> : <Icon name="trash" size={15} />}
                  </button>
                </div>
              </div>
              {c.address && (
                <div style={{ display:'flex', alignItems:'center', gap: 7, fontSize: 13, color:'var(--text-secondary)', marginBottom: 6 }}>
                  <Icon name="map" size={13} color="var(--text-muted)" /> {c.address}
                </div>
              )}
              {c.phone && (
                <div style={{ display:'flex', alignItems:'center', gap: 7, fontSize: 13, color:'var(--text-secondary)' }}>
                  <Icon name="phone" size={13} color="var(--text-muted)" /> {c.phone}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={modal}
        onClose={closeModal}
        title={editing ? 'Edit Clinic' : 'Add New Clinic'}
        footer={
          <>
            <button className="btn btn-ghost" onClick={closeModal}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <><span className="spinner" /> Saving…</> : editing ? 'Save Changes' : 'Add Clinic'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Clinic Name *</label>
            <input className="form-input" {...field('clinic_name')} placeholder="e.g. Green Valley Pediatric Clinic" required />
          </div>
          <div className="form-group">
            <label className="form-label">Address</label>
            <input className="form-input" {...field('address')} placeholder="123 Main St, City, Country" />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Phone Number</label>
            <input className="form-input" {...field('phone')} placeholder="+1 (555) 000-0000" />
          </div>
        </form>
      </Modal>
    </>
  )
}
