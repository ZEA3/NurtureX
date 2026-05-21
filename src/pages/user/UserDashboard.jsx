// src/pages/user/UserDashboard.jsx
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { babyService } from '../../services/babyService'
import { appointmentService } from '../../services/appointmentService'
import StatCard from '../../components/StatCard'
import StatusBadge from '../../components/StatusBadge'
import EmptyState from '../../components/EmptyState'
import Icon from '../../components/Icon'

export default function UserDashboard() {
  const { profile } = useAuth()
  const { showToast } = useToast()

  const [babies, setBabies]             = useState([])
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading]           = useState(true)

  useEffect(() => {
    if (!profile?.id) return
    Promise.all([
      babyService.getByParent(profile.id),
      appointmentService.getByUser?.(profile.id) ?? Promise.resolve([]),
    ])
      .then(([b, a]) => { setBabies(b); setAppointments(a) })
      .catch(() => showToast('Failed to load dashboard data', 'error'))
      .finally(() => setLoading(false))
  }, [profile?.id])

  const pending  = appointments.filter(a => a.status === 'pending').length
  const upcoming = appointments.filter(a => a.status === 'approved' && new Date(a.date) >= new Date()).length
  const total    = appointments.length

  const recent = [...appointments]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5)

  if (loading) return (
    <div className="page-content">
      <div className="skeleton" style={{ height: 32, width: 220, marginBottom: 24 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 110 }} />)}
      </div>
      <div className="skeleton" style={{ height: 280 }} />
    </div>
  )

  return (
    <div className="page-content">
      {/* Greeting */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
          Welcome back, {profile?.full_name?.split(' ')[0] || 'Parent'} 👋
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          Here's a summary of your children's health journey.
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
        <StatCard title="My Babies"       value={babies.length}  icon="baby"     color="#2D6A4F" />
        <StatCard title="Total Bookings"  value={total}          icon="calendar" color="#3B82F6" />
        <StatCard title="Pending"         value={pending}        icon="clock"    color="#F59E0B" />
        <StatCard title="Upcoming"        value={upcoming}       icon="check"    color="#10B981" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Babies summary */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600 }}>My Babies</h2>
            <Link to="/user/babies" style={{ fontSize: 13, color: 'var(--brand)', textDecoration: 'none', fontWeight: 500 }}>
              View all →
            </Link>
          </div>
          {babies.length === 0
            ? <EmptyState icon="baby" title="No babies yet" description="Add your first baby to get started." action={{ label: 'Add Baby', onClick: () => window.location.href = '/user/babies' }} />
            : babies.map(baby => {
                const age = baby.birth_date
                  ? Math.floor((Date.now() - new Date(baby.birth_date)) / (365.25 * 86400000))
                  : null
                return (
                  <div key={baby.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--brand-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand)', fontWeight: 700, fontSize: 16 }}>
                      {baby.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 14 }}>{baby.name}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {age !== null ? `${age} year${age !== 1 ? 's' : ''} old` : 'No birth date'}
                      </p>
                    </div>
                  </div>
                )
              })
          }
        </div>

        {/* Recent appointments */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600 }}>Recent Appointments</h2>
            <Link to="/user/appointments" style={{ fontSize: 13, color: 'var(--brand)', textDecoration: 'none', fontWeight: 500 }}>
              View all →
            </Link>
          </div>
          {recent.length === 0
            ? <EmptyState icon="calendar" title="No appointments" description="Book your first appointment." action={{ label: 'Book Now', onClick: () => window.location.href = '/user/appointments' }} />
            : recent.map(apt => (
                <div key={apt.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 14 }}>{apt.baby?.name || '—'}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {apt.doctor?.full_name ? `Dr. ${apt.doctor.full_name}` : '—'} · {apt.date ? new Date(apt.date).toLocaleDateString() : '—'}
                    </p>
                  </div>
                  <StatusBadge status={apt.status} />
                </div>
              ))
          }
        </div>
      </div>
    </div>
  )
}
