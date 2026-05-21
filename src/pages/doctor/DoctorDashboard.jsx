// src/pages/doctor/DoctorDashboard.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, Baby, Bell, Syringe, Stethoscope, Plus, Activity, Calendar, Clock, MapPin,
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'

import { useAuth }  from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import { patientService }     from '../../services/patientService'
import { infantService }      from '../../services/infantService'
import { vaccinationService } from '../../services/vaccinationService'
import { alertService }       from '../../services/alertService'
import { appointmentService } from '../../services/appointmentService'

import StatCard    from '../../components/StatCard'
import EmptyState  from '../../components/EmptyState'
import Button      from '../../components/ui/Button'
import { SkeletonStatCard, Skeleton } from '../../components/ui/Skeleton'

export default function DoctorDashboard() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  const [loading,     setLoading]     = useState(true)
  const [stats,       setStats]       = useState({ patients: 0, infants: 0, atRisk: 0, openAlerts: 0 })
  const [upcoming,    setUpcoming]    = useState([])
  const [openAlerts,  setOpenAlerts]  = useState([])
  const [alertSeries, setAlertSeries] = useState([])
  const [todayAppts,  setTodayAppts]  = useState([])

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    ;(async () => {
      try {
        const [p, i, dist, vax, al, series, appts] = await Promise.all([
          patientService.list({ doctorId: user.id, pageSize: 1 }),
          infantService.list({ doctorId: user.id, pageSize: 1 }),
          infantService.statusDistribution({ doctorId: user.id }),
          vaccinationService.upcoming({ doctorId: user.id, days: 14, limit: 6 }),
          alertService.list({ doctorId: user.id, status: 'open', limit: 5 }),
          alertService.volumeByDay({ doctorId: user.id, days: 7 }),
          appointmentService.todayAndUpcoming({ doctorId: user.id, days: 7 }),
        ])
        if (cancelled) return
        setStats({
          patients:   p.total,
          infants:    i.total,
          atRisk:     dist.at_risk + dist.critical,
          openAlerts: al.length,
        })
        setUpcoming(vax)
        setOpenAlerts(al)
        setAlertSeries(series)
        setTodayAppts(appts)
      } catch (err) {
        if (!cancelled) toast.error(err.message ?? 'Could not load dashboard')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [user, toast])

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  })()

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-7">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {greeting}, Dr. {profile?.full_name?.split(' ')[0] ?? 'Doctor'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-zinc-500 mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate('/doctor/ai-tools')}><Activity size={14} /> AI Tools</Button>
          <Button onClick={() => navigate('/doctor/appointments')}><Plus size={14} /> New appointment</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {loading ? Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />) : (
          <>
            <StatCard icon={Users}      label="My patients"  value={stats.patients}   iconClass="bg-brand-50 text-brand-700 dark:bg-zinc-800 dark:text-zinc-200" />
            <StatCard icon={Baby}       label="Infants"      value={stats.infants}    iconClass="bg-pink-50 text-pink-700 dark:bg-pink-500/10 dark:text-pink-400" />
            <StatCard icon={Stethoscope} label="At risk"      value={stats.atRisk}    iconClass="bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400" />
            <StatCard icon={Bell}       label="Open alerts"  value={stats.openAlerts} iconClass="bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400" />
          </>
        )}
      </div>

      {/* Today's & upcoming appointments */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-bold text-slate-900 dark:text-white">Schedule</h2>
            <p className="text-xs text-slate-500 dark:text-zinc-500">Today and the next 7 days</p>
          </div>
          <button onClick={() => navigate('/doctor/appointments')} className="text-xs font-semibold text-brand-700 dark:text-white hover:underline">
            Open calendar →
          </button>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {[1,2,3].map(i => <div key={i} className="h-16 rounded-lg bg-slate-100 dark:bg-zinc-800 animate-pulse" />)}
          </div>
        ) : todayAppts.length === 0 ? (
          <EmptyState icon={Calendar} title="Nothing scheduled" description="Click 'Open calendar' to add an appointment." />
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {todayAppts.slice(0, 6).map(a => {
              const d = new Date(a.scheduled_at)
              const isToday = d.toDateString() === new Date().toDateString()
              return (
                <li key={a.id}>
                  <button onClick={() => navigate('/doctor/appointments')}
                    className="block w-full text-left rounded-lg border border-slate-200 dark:border-zinc-800 p-3 hover:border-brand-400 dark:hover:border-zinc-600 transition">
                    <div className="flex items-center gap-2 mb-1">
                      {isToday && <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-brand-700 text-white dark:bg-white dark:text-black">Today</span>}
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300 capitalize">{a.appt_type.replace('_',' ')}</span>
                    </div>
                    <div className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                      {a.infant?.name || a.patient?.full_name || 'Unassigned'}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-zinc-500 flex items-center gap-2 mt-0.5">
                      <span className="inline-flex items-center gap-1"><Clock size={10} />
                        {d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Alert volume */}
        <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white">Alert activity</h2>
              <p className="text-xs text-slate-500 dark:text-zinc-500">Last 7 days</p>
            </div>
            <button onClick={() => navigate('/doctor/alerts')} className="text-xs font-semibold text-brand-700 dark:text-white hover:underline">All alerts →</button>
          </div>
          {loading ? <Skeleton className="h-64" /> : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={alertSeries} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-200 dark:text-zinc-800" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'currentColor' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'currentColor' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  <Bar dataKey="info"     stackId="a" fill="#3B82F6" radius={[4,4,0,0]} />
                  <Bar dataKey="warning"  stackId="a" fill="#F59E0B" />
                  <Bar dataKey="critical" stackId="a" fill="#EF4444" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Upcoming vaccinations */}
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-900 dark:text-white">Upcoming vaccinations</h2>
            <Syringe size={16} className="text-slate-400" />
          </div>
          {loading ? <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12" />)}</div>
          : upcoming.length === 0 ? (
            <EmptyState icon={Syringe} title="None upcoming" />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-zinc-800">
              {upcoming.map(v => (
                <li key={v.id} className="py-2.5">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">{v.vaccine_name}</div>
                  <div className="text-[11px] text-slate-500 dark:text-zinc-500 flex items-center justify-between">
                    <span>{v.infant?.name ?? '—'}</span>
                    <span>{v.scheduled_date ? new Date(v.scheduled_date).toLocaleDateString() : ''}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Open alerts */}
        <div className="lg:col-span-3 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-900 dark:text-white">Open alerts</h2>
            <button onClick={() => navigate('/doctor/alerts')} className="text-xs font-semibold text-brand-700 dark:text-white hover:underline">View all →</button>
          </div>
          {loading ? <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14" />)}</div>
          : openAlerts.length === 0 ? (
            <EmptyState icon={Bell} title="All clear" description="You have no open alerts." />
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {openAlerts.map(a => (
                <li key={a.id} className="rounded-lg border border-slate-200 dark:border-zinc-800 p-3">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">{a.subject}</div>
                  <div className="text-[11px] text-slate-500 dark:text-zinc-500 mt-0.5 capitalize">{a.severity} · {new Date(a.created_at).toLocaleDateString()}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  )
}
