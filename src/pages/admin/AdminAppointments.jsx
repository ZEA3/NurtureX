// src/pages/admin/AdminAppointments.jsx
//
// Cross-doctor appointment oversight for admins.

import { useEffect, useState, useCallback } from 'react'
import { Calendar, RefreshCw, Clock, MapPin } from 'lucide-react'
import { appointmentService } from '../../services/appointmentService'
import { adminService }       from '../../services/adminService'
import { useToast } from '../../hooks/useToast'

import StatusBadge from '../../components/StatusBadge'
import EmptyState  from '../../components/EmptyState'
import Avatar      from '../../components/ui/Avatar'
import Button      from '../../components/ui/Button'
import { Field, Input, Select } from '../../components/ui/Field'
import { SkeletonRow } from '../../components/ui/Skeleton'
import { cn } from '../../utils/cn'

const TYPE_BADGES = {
  checkup:      'bg-brand-50 text-brand-700 dark:bg-zinc-800 dark:text-zinc-200',
  vaccination:  'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  consultation: 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400',
  follow_up:    'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  other:        'bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300',
}

const PAGE_SIZE = 20

export default function AdminAppointments() {
  const toast = useToast()

  const [rows,    setRows]    = useState([])
  const [total,   setTotal]   = useState(0)
  const [page,    setPage]    = useState(1)
  const [doctorId, setDoctorId] = useState('')
  const [status,   setStatus]   = useState('all')
  const [from,     setFrom]     = useState('')
  const [to,       setTo]       = useState('')
  const [loading, setLoading] = useState(true)
  const [doctors, setDoctors] = useState([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const opts = { status, page, pageSize: PAGE_SIZE }
      if (doctorId) opts.doctorId = doctorId
      if (from)     opts.from     = new Date(from).toISOString()
      if (to) {
        const t = new Date(to); t.setHours(23, 59, 59, 999)
        opts.to = t.toISOString()
      }
      const { rows, total } = await appointmentService.list(opts)
      setRows(rows); setTotal(total)
    } catch (err) {
      toast.error(err.message ?? 'Could not load appointments')
    } finally {
      setLoading(false)
    }
  }, [doctorId, status, from, to, page, toast])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [doctorId, status, from, to])

  useEffect(() => {
    adminService.listDoctorsForSelect().then(setDoctors).catch(() => {})
  }, [])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Appointments</h1>
          <p className="text-sm text-slate-500 dark:text-zinc-500 mt-1">All appointments across the platform.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 sm:p-5 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Field label="Doctor">
            <Select value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
              <option value="">All doctors</option>
              {doctors.map(d => <option key={d.id} value={d.id}>Dr. {d.full_name}</option>)}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">All statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="canceled">Canceled</option>
              <option value="no_show">No-show</option>
            </Select>
          </Field>
          <Field label="From"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="To"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
        </div>
        <div className="text-xs text-slate-500 dark:text-zinc-500 mt-2">{total} total result{total === 1 ? '' : 's'}</div>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-zinc-950">
                <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-500">When</th>
                <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-500">Doctor</th>
                <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-500">For</th>
                <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-500 hidden md:table-cell">Type</th>
                <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-500">Status</th>
                <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-500 hidden lg:table-cell">Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
              {loading ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={6} />)
              : rows.length === 0 ? (
                <tr><td colSpan={6}>
                  <EmptyState icon={Calendar} title="No appointments match" description="Try a different filter." />
                </td></tr>
              ) : rows.map(a => (
                <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-zinc-950 transition">
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <div className="font-semibold text-slate-900 dark:text-white text-sm">
                      {new Date(a.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-zinc-500 flex items-center gap-1">
                      <Clock size={11} />
                      {new Date(a.scheduled_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      {' · '}{a.duration_min ?? 30} min
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <Avatar name={a.doctor?.full_name} size="sm" />
                      <span className="text-sm font-medium text-slate-700 dark:text-zinc-300 truncate">
                        {a.doctor?.full_name ? `Dr. ${a.doctor.full_name}` : '—'}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600 dark:text-zinc-300">
                    {a.infant?.name || a.patient?.full_name || '—'}
                  </td>
                  <td className="px-5 py-3.5 hidden md:table-cell">
                    <span className={cn('text-[11px] font-bold uppercase px-1.5 py-0.5 rounded', TYPE_BADGES[a.appt_type] ?? TYPE_BADGES.other)}>
                      {a.appt_type.replace('_',' ')}
                    </span>
                  </td>
                  <td className="px-5 py-3.5"><StatusBadge status={a.status} /></td>
                  <td className="px-5 py-3.5 hidden lg:table-cell text-xs text-slate-500 dark:text-zinc-500">
                    {a.location ? (
                      <span className="inline-flex items-center gap-1"><MapPin size={11} />{a.location}</span>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && total > 0 && (
          <div className="px-5 py-3 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between">
            <div className="text-xs text-slate-500 dark:text-zinc-500">Page {page} of {totalPages}</div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</Button>
              <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</Button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
