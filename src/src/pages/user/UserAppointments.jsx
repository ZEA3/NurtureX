// src/pages/user/UserAppointments.jsx
import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { supabase } from '../../supabaseClient'
import { babyService } from '../../services/babyService'
import { profileService } from '../../services/profileService'
import Modal from '../../components/Modal'
import StatusBadge from '../../components/StatusBadge'
import EmptyState from '../../components/EmptyState'
import Icon from '../../components/Icon'

const EMPTY_FORM = { doctor_id: '', baby_id: '', date: '', time: '', reason: '' }
const FILTERS = ['all', 'pending', 'approved', 'rejected']

export default function UserAppointments() {
  const { profile } = useAuth()
  const { showToast } = useToast()

  const [appointments, setAppointments] = useState([])
  const [doctors, setDoctors]           = useState([])
  const [babies,  setBabies]            = useState([])
  const [filter,  setFilter]            = useState('all')
  const [search,  setSearch]            = useState('')
  const [loading, setLoading]           = useState(true)
  const [modal,   setModal]             = useState(false)
  const [form,    setForm]              = useState(EMPTY_FORM)
  const [saving,  setSaving]            = useState(false)

  const load = async () => {
    if (!profile?.id) return
    setLoading(true)
    try {
      const [apts, docs, babs] = await Promise.all([
        supabase
          .from('appointments')
          .select('*, doctor:profiles!doctor_id(full_name), baby:babies(name)')
          .eq('user_id', profile.id)
          .order('date', { ascending: false })
          .then(r => { if (r.error) throw r.error; return r.data }),
        profileService.getByRole('doctor'),
        babyService.getByParent(profile.id),
      ])
      setAppointments(apts)
      setDoctors(docs)
      setBabies(babs)
    } catch (e) {
      showToast('Failed to load appointments', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [profile?.id])

  const handleBook = async () => {
    if (!form.doctor_id || !form.baby_id || !form.date) {
      showToast('Please fill in doctor, baby, and date', 'error'); return
    }
    setSaving(true)
    try {
      const datetime = form.time ? `${form.date}T${form.time}` : form.date
      const { error } = await supabase.from('appointments').insert({
        doctor_id: form.doctor_id,
        user_id:   profile.id,
        baby_id:   form.baby_id,
        date:      datetime,
        reason:    form.reason,
        status:    'pending',
      })
      if (error) throw error
      showToast('Appointment booked!', 'success')
      setModal(false)
      setForm(EMPTY_FORM)
      load()
    } catch (e) {
      showToast(e.message || 'Booking failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  const filtered = appointments.filter(a => {
    const matchStatus = filter === 'all' || a.status === filter
    const matchSearch = !search || a.doctor?.full_name?.toLowerCase().includes(search.toLowerCase()) || a.baby?.name?.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const counts = FILTERS.reduce((acc, f) => {
    acc[f] = f === 'all' ? appointments.length : appointments.filter(a => a.status === f).length
    return acc
  }, {})

  if (loading) return (
    <div className="page-content">
      <div className="skeleton" style={{ height: 32, width: 220, marginBottom: 24 }} />
      {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 60, marginBottom: 10 }} />)}
    </div>
  )

  return (
    <div className="page-content">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>My Appointments</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{appointments.length} total</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(EMPTY_FORM); setModal(true) }} disabled={babies.length === 0}>
          <Icon name="plus" size={16} /> Book Appointment
        </button>
      </div>

      {babies.length === 0 && (
        <div style={{ padding: '12px 16px', background: '#FEF3C7', borderRadius: 8, marginBottom: 20, color: '#92400E', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}>
          <Icon name="info" size={15} />
          You need to add a baby before booking an appointment.
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
              background: filter === f ? 'var(--brand)' : 'var(--bg-secondary)',
              color: filter === f ? '#fff' : 'var(--text-secondary)',
              transition: 'all 0.15s',
            }}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
          </button>
        ))}
        <input
          className="form-input"
          placeholder="Search doctor or baby…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ marginLeft: 'auto', width: 200, height: 34, padding: '0 12px', fontSize: 13 }}
        />
      </div>

      {/* Appointments table */}
      {filtered.length === 0
        ? <EmptyState icon="calendar" title="No appointments found" description={filter !== 'all' ? `No ${filter} appointments.` : 'Book your first appointment.'} action={filter === 'all' && babies.length > 0 ? { label: 'Book Now', onClick: () => setModal(true) } : undefined} />
        : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                  {['Baby', 'Doctor', 'Date & Time', 'Reason', 'Status'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((apt, i) => (
                  <tr key={apt.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, fontSize: 14 }}>{apt.baby?.name || '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: 14, color: 'var(--text-secondary)' }}>
                      {apt.doctor?.full_name ? `Dr. ${apt.doctor.full_name}` : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>
                      {apt.date ? new Date(apt.date).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-secondary)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {apt.reason || '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <StatusBadge status={apt.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }

      {/* Book Appointment Modal */}
      <Modal isOpen={modal} onClose={() => setModal(false)} title="Book an Appointment">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Doctor *</label>
            <select className="form-input" value={form.doctor_id} onChange={e => setForm(f => ({ ...f, doctor_id: e.target.value }))}>
              <option value="">Select a doctor</option>
              {doctors.map(d => <option key={d.id} value={d.id}>Dr. {d.full_name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Baby *</label>
            <select className="form-input" value={form.baby_id} onChange={e => setForm(f => ({ ...f, baby_id: e.target.value }))}>
              <option value="">Select a baby</option>
              {babies.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Date *</label>
              <input className="form-input" type="date" value={form.date} min={new Date().toISOString().split('T')[0]} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Preferred Time</label>
              <input className="form-input" type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Reason / Notes</label>
            <textarea className="form-input" rows={3} value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Describe the reason for the visit…" style={{ resize: 'vertical' }} />
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleBook} disabled={saving}>
              {saving ? 'Booking…' : 'Book Appointment'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
