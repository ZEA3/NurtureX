// src/pages/doctor/DoctorAppointments.jsx
//
// Real-time appointment management with Accept / Reject / Complete actions.
// Parent bookings arrive with status='scheduled'. Doctor can accept (keep),
// reject (cancel), or complete them. All changes broadcast via Supabase Realtime.

import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import {
  ChevronLeft, ChevronRight, Plus, Calendar as CalIcon, List,
  Trash2, Clock, MapPin, RefreshCw, CheckCircle2, XCircle,
  Check, AlertTriangle, Bell,
} from 'lucide-react'

import { useAuth }  from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import { appointmentService } from '../../services/appointmentService'
import { patientService }     from '../../services/patientService'
import { infantService }      from '../../services/infantService'
import { supabase }           from '../../supabaseClient'

import StatusBadge from '../../components/StatusBadge'
import EmptyState  from '../../components/EmptyState'
import Button      from '../../components/ui/Button'
import Modal       from '../../components/ui/Modal'
import { Field, Input, Select } from '../../components/ui/Field'
import { Skeleton } from '../../components/ui/Skeleton'
import { cn } from '../../utils/cn'

const TYPE_COLORS = {
  checkup:      'bg-brand-100 text-brand-800 dark:bg-brand-900/40 dark:text-brand-200',
  vaccination:  'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  consultation: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200',
  follow_up:    'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  other:        'bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300',
}

const WEEKDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const MONTHS   = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December']

const EMPTY_FORM = {
  parent_id: '', patient_id: '', infant_id: '',
  scheduled_at: '', duration_min: 30,
  appt_type: 'checkup', status: 'scheduled',
  location: '', notes: '',
}

export default function DoctorAppointments() {
  const { user, profile } = useAuth()
  const toast = useToast()
  const today = useMemo(() => new Date(), [])

  const [view,    setView]    = useState('calendar')
  const [year,    setYear]    = useState(today.getFullYear())
  const [month,   setMonth]   = useState(today.getMonth() + 1)
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing,   setEditing]   = useState(null)
  const [form,      setForm]      = useState(EMPTY_FORM)
  const [saving,    setSaving]    = useState(false)
  const [formError, setFormError] = useState('')

  const [patients, setPatients] = useState([])
  const [infants,  setInfants]  = useState([])

  const realtimeRef = useRef(null)

  // ── Preload patients + infants ────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return
    Promise.all([
      patientService.list({ doctorId: user.id, pageSize: 1000 }).then(r => setPatients(r.rows)).catch(() => {}),
      infantService.list({ doctorId: user.id, pageSize: 1000 }).then(r => setInfants(r.rows)).catch(() => {}),
    ])
  }, [user])

  // ── Load month data ───────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const data = await appointmentService.listForMonth({ doctorId: user.id, year, month })
      setItems(data)
      setPendingCount(data.filter(a => a.status === 'pending').length)
    } catch (err) {
      toast.error(err.message ?? 'Could not load appointments')
    } finally {
      setLoading(false)
    }
  }, [user, year, month, toast])

  useEffect(() => { load() }, [load])

  // ── Realtime subscription ─────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return

    const ch = supabase
      .channel(`appts:${user.id}`)
      .on(
        'postgres_changes',
        {
          event:  '*',
          schema: 'public',
          table:  'appointments',
          filter: `doctor_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            // New booking from parent — add to list if in current month
            const appt = payload.new
            const d = new Date(appt.scheduled_at)
            if (d.getFullYear() === year && d.getMonth() + 1 === month) {
              setItems(prev => {
                if (prev.some(a => a.id === appt.id)) return prev
                const next = [...prev, appt].sort(
                  (a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at)
                )
                setPendingCount(next.filter(a => a.status === 'pending').length)
                return next
              })
              toast.success('📅 New appointment request received!')
            }
          } else if (payload.eventType === 'UPDATE') {
            setItems(prev => prev.map(a =>
              a.id === payload.new.id ? { ...a, ...payload.new } : a
            ))
          } else if (payload.eventType === 'DELETE') {
            setItems(prev => prev.filter(a => a.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    realtimeRef.current = ch
    return () => { ch.unsubscribe() }
  }, [user, year, month, toast])

  const defaultLocation = profile?.clinic_name
    ? `${profile.clinic_name}${profile.clinic_address ? ` — ${profile.clinic_address}` : ''}`
    : ''

  const openCreate = (date = null) => {
    setEditing(null)
    setForm({
      ...EMPTY_FORM,
      scheduled_at: date ? toLocalDatetime(date, 9, 0) : toLocalDatetime(new Date(), 9, 0),
      location: defaultLocation,
    })
    setFormError('')
    setModalOpen(true)
  }

  // Day-detail modal: clicking a calendar day lists that day's appointments.
  const [dayModal, setDayModal] = useState(null) // { date, items } | null
  const openDay = (date) => {
    const k = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
    const dayItems = items
      .filter(a => {
        const d = new Date(a.scheduled_at)
        const dk = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
        return dk === k
      })
      .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
    setDayModal({ date, items: dayItems })
  }

  const openEdit = (appt) => {
    setEditing(appt)
    setForm({
      parent_id:    appt.parent_id   ?? '',
      patient_id:   appt.patient_id  ?? '',
      infant_id:    appt.infant_id   ?? '',
      scheduled_at: toLocalDatetime(new Date(appt.scheduled_at)),
      duration_min: appt.duration_min ?? 30,
      appt_type:    appt.appt_type   ?? 'checkup',
      status:       appt.status      ?? 'scheduled',
      location:     appt.location    ?? '',
      notes:        appt.notes       ?? '',
      // read-only context for display
      _parent:      appt.parent      ?? null,
      _infant:      appt.infant      ?? null,
    })
    setFormError('')
    setModalOpen(true)
  }

  // ── Quick status change (accept / reject / complete) ──────────────
  const quickStatus = async (id, status, label) => {
    try {
      await appointmentService.setStatus(id, status)
      setItems(prev => prev.map(a => a.id === id ? { ...a, status } : a))
      toast.success(`Appointment ${label}`)
      // Update pending count
      setPendingCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      toast.error(err.message ?? `Could not ${label} appointment`)
    }
  }

  const submit = async (e) => {
    e.preventDefault(); setFormError('')

    // ── Frontend validation (mirrors the service-side guard) ──────────
    if (!form.scheduled_at) {
      return setFormError('Please choose a date and time.')
    }
    const when = new Date(form.scheduled_at)
    if (Number.isNaN(when.getTime())) {
      return setFormError('The date and time you entered is invalid.')
    }
    // Only block past times when creating (editing an old appt is allowed).
    if (!editing && when.getTime() < Date.now()) {
      return setFormError('You cannot book an appointment in the past.')
    }
    if (!form.parent_id && !form.patient_id) {
      return setFormError('Please select a patient for the appointment.')
    }
    if (!form.appt_type) {
      return setFormError('Please choose an appointment type.')
    }

    setSaving(true)
    try {
      const { _parent, _infant, ...formData } = form
      const payload = {
        ...formData,
        doctor_id:    user.id,
        parent_id:    form.parent_id  || null,
        patient_id:   form.patient_id || null,
        infant_id:    form.infant_id  || null,
        scheduled_at: when.toISOString(),
        duration_min: Number(form.duration_min) || 30,
      }
      if (editing) {
        const updated = await appointmentService.update(editing.id, payload)
        setItems(prev => prev.map(a => a.id === editing.id ? updated : a))
        toast.success('Appointment updated')
      } else {
        const created = await appointmentService.create(payload)
        setItems(prev => [...prev, created].sort(
          (a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at)
        ))
        toast.success('Appointment created')
      }
      setModalOpen(false)
    } catch (err) {
      setFormError(err.message ?? 'Could not save appointment')
    } finally {
      setSaving(false)
    }
  }

  const setStatus = async (status) => {
    if (!editing) return
    setSaving(true)
    try {
      await appointmentService.setStatus(editing.id, status)
      setItems(prev => prev.map(a => a.id === editing.id ? { ...a, status } : a))
      setForm(f => ({ ...f, status }))
      toast.success(`Marked as ${status.replace('_', ' ')}`)
      setModalOpen(false)
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!editing || !confirm('Delete this appointment?')) return
    setSaving(true)
    try {
      await appointmentService.remove(editing.id)
      setItems(prev => prev.filter(a => a.id !== editing.id))
      toast.success('Deleted')
      setModalOpen(false)
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const goPrev = () => { if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const goNext = () => { if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1) }

  // ── Pending requests panel ────────────────────────────────────────
  const pendingItems = items.filter(a => a.status === 'pending')

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Appointments
          </h1>
          <p className="text-sm text-slate-500 dark:text-zinc-500 mt-1">
            Real-time calendar — parent bookings appear instantly.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Pending badge */}
          {pendingCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-semibold">
              <Bell size={12} className="animate-pulse" />
              {pendingCount} pending request{pendingCount > 1 ? 's' : ''}
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </Button>
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-zinc-800 p-1">
            <button
              onClick={() => setView('calendar')}
              className={cn('px-2.5 py-1 rounded text-xs font-semibold transition', view === 'calendar' ? 'bg-brand-700 text-white' : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800')}
            >
              <CalIcon size={13} />
            </button>
            <button
              onClick={() => setView('list')}
              className={cn('px-2.5 py-1 rounded text-xs font-semibold transition', view === 'list' ? 'bg-brand-700 text-white' : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800')}
            >
              <List size={13} />
            </button>
          </div>
          <Button onClick={() => openCreate()}><Plus size={14} /> New</Button>
        </div>
      </div>

      {/* Pending requests panel */}
      {pendingItems.length > 0 && (
        <div className="mb-4 rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400" />
            <h3 className="font-bold text-amber-900 dark:text-amber-200 text-sm">
              Pending Appointment Requests ({pendingItems.length})
            </h3>
          </div>
          <div className="space-y-2">
            {pendingItems.map(a => {
              const dt = new Date(a.scheduled_at)
              const notesClean = (a.notes ?? '').replace(/parent_id:[a-z0-9-]+\s*\|?\s*/g, '').trim()
              return (
                <div key={a.id} className="flex flex-col sm:flex-row sm:items-center gap-2 bg-white dark:bg-zinc-900 rounded-xl p-3 border border-amber-100 dark:border-zinc-800">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn('text-[11px] font-bold uppercase px-1.5 py-0.5 rounded', TYPE_COLORS[a.appt_type] ?? TYPE_COLORS.other)}>
                        {a.appt_type?.replace('_', ' ')}
                      </span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        {a.patient?.full_name || a.parent?.full_name || a.infant?.name || 'Patient'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-zinc-500 mt-0.5 flex items-center gap-3">
                      <span className="inline-flex items-center gap-1">
                        <Clock size={10} />
                        {dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        {' at '}
                        {dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </span>
                      {a.location && <span className="inline-flex items-center gap-1"><MapPin size={10} />{a.location}</span>}
                    </div>
                    {notesClean && (
                      <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1 line-clamp-1">{notesClean}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => quickStatus(a.id, 'scheduled', 'accepted')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition"
                    >
                      <CheckCircle2 size={13} /> Accept
                    </button>
                    <button
                      onClick={() => quickStatus(a.id, 'rejected', 'rejected')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-semibold transition"
                    >
                      <XCircle size={13} /> Reject
                    </button>
                    <button
                      onClick={() => openEdit(a)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800 transition"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Month nav */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={goPrev} className="h-9 w-9 grid place-items-center rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition">
            <ChevronLeft size={16} />
          </button>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white px-2">
            {MONTHS[month - 1]} {year}
          </h2>
          <button onClick={goNext} className="h-9 w-9 grid place-items-center rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition">
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="text-xs text-slate-500 dark:text-zinc-500 flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live
        </div>
      </div>

      {view === 'calendar'
        ? <CalendarGrid year={year} month={month} today={today} loading={loading} items={items} onAddDay={openDay} onEditAppt={openEdit} />
        : <ListView loading={loading} items={items} onEditAppt={openEdit} onQuickStatus={quickStatus} />
      }

      {/* Day appointments list modal */}
      <Modal
        open={!!dayModal}
        onClose={() => setDayModal(null)}
        title={dayModal ? dayModal.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : ''}
        footer={
          <div className="flex items-center gap-2 w-full">
            <Button variant="secondary" onClick={() => setDayModal(null)} type="button" className="ml-auto">Close</Button>
            <Button type="button" onClick={() => { const d = dayModal.date; setDayModal(null); openCreate(d) }}>
              <Plus size={13} /> Add appointment
            </Button>
          </div>
        }
      >
        {dayModal && dayModal.items.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-zinc-500 py-6 text-center">
            No appointments on this day.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-zinc-800">
            {dayModal?.items.map(a => {
              const time = new Date(a.scheduled_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
              const who = a.infant?.name || a.parent?.full_name || 'Patient'
              return (
                <li key={a.id}>
                  <button
                    onClick={() => { setDayModal(null); openEdit(a) }}
                    className="w-full flex items-center gap-3 py-3 px-1 hover:bg-slate-50 dark:hover:bg-zinc-800/50 rounded-lg transition text-left"
                  >
                    <div className="text-xs font-bold text-slate-500 dark:text-zinc-400 w-16 shrink-0">{time}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">{who}</div>
                      <div className="text-xs text-slate-500 dark:text-zinc-500 capitalize">
                        {(a.appt_type ?? 'checkup').replace('_', ' ')}
                        {a.parent?.full_name && a.infant?.name ? ` · parent: ${a.parent.full_name}` : ''}
                      </div>
                    </div>
                    <StatusBadge status={a.status} />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </Modal>

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Appointment' : 'New Appointment'}
        footer={
          <div className="flex items-center gap-2 w-full">
            {editing && (
              <Button variant="danger" size="sm" onClick={remove} loading={saving} type="button" className="mr-auto">
                <Trash2 size={13} /> Delete
              </Button>
            )}
            <Button variant="secondary" onClick={() => setModalOpen(false)} type="button">Cancel</Button>
            <Button form="appt-form" type="submit" loading={saving}>Save</Button>
          </div>
        }
      >
        <form id="appt-form" onSubmit={submit} className="space-y-3">
          {formError && (
            <div className="rounded-lg border-l-4 border-red-500 bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">
              {formError}
            </div>
          )}

          {editing && (form._parent || form._infant) && (
            <div className="rounded-xl bg-brand-50 dark:bg-zinc-800/60 border border-brand-100 dark:border-zinc-700 p-3 text-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-brand-700 dark:text-brand-300 mb-1.5">
                Request details
              </p>
              {form._parent && (
                <p className="text-slate-700 dark:text-zinc-200">
                  <span className="font-semibold">Parent:</span> {form._parent.full_name ?? '—'}
                  {form._parent.phone ? `  ·  ${form._parent.phone}` : ''}
                </p>
              )}
              {form._infant && (
                <p className="text-slate-700 dark:text-zinc-200">
                  <span className="font-semibold">Baby:</span> {form._infant.name ?? '—'}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Patient (parent)">
              <Select value={form.parent_id} onChange={e => setForm(f => ({ ...f, parent_id: e.target.value }))} disabled={saving}>
                <option value="">— Unassigned —</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </Select>
            </Field>
            <Field label="Baby / Infant">
              <Select value={form.infant_id} onChange={e => setForm(f => ({ ...f, infant_id: e.target.value }))} disabled={saving}>
                <option value="">— Unassigned —</option>
                {infants.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Date & time" required>
              <Input type="datetime-local" value={form.scheduled_at} min={editing ? undefined : toLocalDatetime(new Date())} onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))} disabled={saving} required />
            </Field>
            <Field label="Duration (min)">
              <Input type="number" min={5} step={5} value={form.duration_min} onChange={e => setForm(f => ({ ...f, duration_min: e.target.value }))} disabled={saving} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Type" required>
              <Select value={form.appt_type} onChange={e => setForm(f => ({ ...f, appt_type: e.target.value }))} disabled={saving}>
                <option value="checkup">Check-up</option>
                <option value="vaccination">Vaccination</option>
                <option value="consultation">Consultation</option>
                <option value="follow_up">Follow-up</option>
                <option value="other">Other</option>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} disabled={saving}>
                <option value="pending">Pending request</option>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="canceled">Canceled</option>
                <option value="rejected">Rejected</option>
                <option value="no_show">No-show</option>
              </Select>
            </Field>
          </div>

          <Field label="Location">
            <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Clinic name + address" disabled={saving} />
          </Field>

          <Field label="Notes">
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={3}
              className="block w-full px-3.5 py-2.5 rounded-lg text-sm bg-white dark:bg-zinc-900 text-slate-900 dark:text-white border border-slate-200 dark:border-zinc-800 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 outline-none resize-y"
              disabled={saving}
              placeholder="Reason for visit, prep instructions…"
            />
          </Field>

          {editing && (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-slate-500 dark:text-zinc-500">Quick:</span>
              {editing.status !== 'completed' && (
                <button type="button" onClick={() => setStatus('completed')} disabled={saving}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold hover:bg-emerald-200 transition">
                  <CheckCircle2 size={11} /> Complete
                </button>
              )}
              {editing.status !== 'canceled' && (
                <button type="button" onClick={() => setStatus('canceled')} disabled={saving}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 text-xs font-semibold hover:bg-red-200 transition">
                  <XCircle size={11} /> Cancel
                </button>
              )}
              {editing.status !== 'no_show' && (
                <button type="button" onClick={() => setStatus('no_show')} disabled={saving}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 text-xs font-semibold hover:bg-slate-200 transition">
                  No-show
                </button>
              )}
            </div>
          )}
        </form>
      </Modal>
    </>
  )
}

/* ── Calendar grid ───────────────────────────────────────────────── */
function CalendarGrid({ year, month, today, loading, items, onAddDay, onEditAppt }) {
  const cells = useMemo(() => buildMonthCells(year, month), [year, month])
  const byDay = useMemo(() => {
    const m = new Map()
    for (const it of items) {
      const d = new Date(it.scheduled_at)
      const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
      if (!m.has(k)) m.set(k, [])
      m.get(k).push(it)
    }
    return m
  }, [items])

  const isToday = d => d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate()
  const inMonth = d => d.getMonth() === month - 1

  return (
    <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 overflow-hidden">
      <div className="grid grid-cols-7 bg-slate-50 dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-800">
        {WEEKDAYS.map(d => (
          <div key={d} className="text-center text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-500 py-2">{d}</div>
        ))}
      </div>
      {loading ? (
        <div className="p-3 grid grid-cols-7 gap-px">
          {Array.from({ length: 35 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-md" />)}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-zinc-800">
          {cells.map((d, i) => {
            const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
            const dayItems = byDay.get(k) ?? []
            const muted    = !inMonth(d)
            const todayCell = isToday(d)
            const hasPending = dayItems.some(a => a.status === 'pending')
            return (
              <div key={i} onClick={() => onAddDay(d)}
                className={cn('group min-h-[88px] sm:min-h-[112px] bg-white dark:bg-zinc-900 p-1.5 cursor-pointer transition',
                  muted && 'bg-slate-50 dark:bg-zinc-950',
                  'hover:bg-brand-50/30 dark:hover:bg-zinc-800/50'
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={cn(
                    'inline-grid place-items-center h-6 min-w-6 px-1.5 text-[11px] font-bold rounded-full',
                    todayCell ? 'bg-brand-700 text-white dark:bg-white dark:text-black' :
                    muted ? 'text-slate-400 dark:text-zinc-700' : 'text-slate-700 dark:text-zinc-300'
                  )}>
                    {d.getDate()}
                  </span>
                  {hasPending && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
                </div>
                <div className="space-y-0.5">
                  {dayItems.slice(0, 3).map(a => {
                    const time = new Date(a.scheduled_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                    return (
                      <button key={a.id}
                        onClick={e => { e.stopPropagation(); onEditAppt(a) }}
                        className={cn(
                          'block w-full text-left rounded px-1.5 py-1 text-[10px] sm:text-[11px] font-semibold leading-tight truncate',
                          TYPE_COLORS[a.appt_type] ?? TYPE_COLORS.other,
                          a.status === 'canceled' && 'opacity-50 line-through',
                          a.status === 'completed' && 'opacity-70',
                        )}
                        title={`${time} — ${a.appt_type}`}
                      >
                        <span className="hidden sm:inline">{time} </span>
                        {a.patient?.full_name ?? a.parent?.full_name ?? a.infant?.name ?? a.appt_type}
                      </button>
                    )
                  })}
                  {dayItems.length > 3 && (
                    <div className="text-[10px] text-slate-500 dark:text-zinc-500 px-1.5">+{dayItems.length - 3} more</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── List view ───────────────────────────────────────────────────── */
function ListView({ loading, items, onEditAppt, onQuickStatus }) {
  if (loading) return <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
  if (!items.length) return <EmptyState icon={CalIcon} title="No appointments this month" description="Click 'New' to schedule one." />

  return (
    <ul className="space-y-2">
      {items.map(a => {
        const dt = new Date(a.scheduled_at)
        const isPending = a.status === 'pending'
        const notesClean = (a.notes ?? '').replace(/parent_id:[a-z0-9-]+\s*\|?\s*/g, '').trim()
        return (
          <li key={a.id} className={cn('rounded-xl bg-white dark:bg-zinc-900 border p-4 transition',
            isPending
              ? 'border-amber-200 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-500/5'
              : 'border-slate-200 dark:border-zinc-800 hover:shadow-card hover:-translate-y-px'
          )}>
            <div className="flex items-start gap-3">
              <button onClick={() => onEditAppt(a)} className="text-center shrink-0">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-500">
                  {dt.toLocaleDateString('en-US', { month: 'short' })}
                </div>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-white leading-tight">
                  {dt.getDate()}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-zinc-500">
                  {dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </div>
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={cn('text-[11px] font-bold uppercase px-1.5 py-0.5 rounded', TYPE_COLORS[a.appt_type] ?? TYPE_COLORS.other)}>
                    {a.appt_type?.replace('_', ' ')}
                  </span>
                  <StatusBadge status={a.status} />
                  {isPending && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1">
                      <Bell size={9} className="animate-pulse" /> Awaiting acceptance
                    </span>
                  )}
                </div>
                <div className="font-semibold text-slate-900 dark:text-white truncate">
                  {a.patient?.full_name || a.parent?.full_name || a.infant?.name || 'Unassigned'}
                </div>
                <div className="text-xs text-slate-500 dark:text-zinc-500 flex items-center gap-3 flex-wrap mt-0.5">
                  <span className="inline-flex items-center gap-1"><Clock size={11} /> {a.duration_min ?? 30} min</span>
                  {a.location && <span className="inline-flex items-center gap-1 truncate max-w-xs"><MapPin size={11} /> {a.location}</span>}
                </div>
                {notesClean && <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1 line-clamp-2">{notesClean}</p>}
              </div>
              {isPending && (
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button onClick={() => onQuickStatus(a.id, 'completed', 'accepted')}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition">
                    <CheckCircle2 size={12} /> Accept
                  </button>
                  <button onClick={() => onQuickStatus(a.id, 'canceled', 'rejected')}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-semibold transition">
                    <XCircle size={12} /> Reject
                  </button>
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

/* ── helpers ── */
function buildMonthCells(year, month) {
  const first = new Date(year, month - 1, 1)
  const last  = new Date(year, month, 0)
  const start = new Date(first); start.setDate(first.getDate() - first.getDay())
  const end   = new Date(last);  end.setDate(last.getDate() + (6 - last.getDay()))
  const cells = []
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) cells.push(new Date(d))
  return cells
}

function toLocalDatetime(date, h, m) {
  const d = new Date(date)
  if (h != null) d.setHours(h, m ?? 0, 0, 0)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}