// src/pages/shared/AlertsPage.jsx
// Phase 2 — Alerts Engine. Real-time inbox for doctors + admin.

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Bell, BellRing, Check, CheckCheck, Trash2, RefreshCw,
  Plus, AlertCircle, AlertTriangle, Info, Baby,
  Syringe, TrendingDown, UtensilsCrossed, Calendar, ShieldAlert,
  X, Filter,
} from 'lucide-react'
import { alertService }  from '../../services/alertService'
import { infantService }  from '../../services/infantService'
import { useAuth }   from '../../hooks/useAuth'
import { useToast }  from '../../hooks/useToast'
import { supabase }  from '../../supabaseClient'
import { cn }        from '../../utils/cn'
import EmptyState    from '../../components/EmptyState'
import Button        from '../../components/ui/Button'
import Modal         from '../../components/ui/Modal'
import { Field, Input, Select } from '../../components/ui/Field'

// ── Alert type config ─────────────────────────────────────────────
const TYPE_CONFIG = {
  growth_low:         { icon: TrendingDown,    label: 'Low Growth',      color: 'text-red-600 dark:text-red-400',    bg: 'bg-red-50 dark:bg-red-500/10'    },
  vaccine_overdue:    { icon: Syringe,          label: 'Vaccine Overdue', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10' },
  feeding_gap:        { icon: UtensilsCrossed,  label: 'Feeding Gap',     color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-500/10' },
  appointment_missed: { icon: Calendar,         label: 'Missed Appt',     color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-500/10' },
  mood_risk:          { icon: ShieldAlert,      label: 'Mood Risk',       color: 'text-pink-600 dark:text-pink-400',  bg: 'bg-pink-50 dark:bg-pink-500/10'  },
  no_growth_record:   { icon: Baby,             label: 'No Records',      color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-500/10' },
  manual:             { icon: Bell,             label: 'Manual',          color: 'text-brand-600 dark:text-brand-400', bg: 'bg-brand-50 dark:bg-brand-500/10' },
}

const SEVERITY_CONFIG = {
  info:     { label: 'Info',     cls: 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300' },
  warning:  { label: 'Warning',  cls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300' },
  critical: { label: 'Critical', cls: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300'         },
}

export default function AlertsPage() {
  const { isDoctor, isAdmin, user } = useAuth()
  const toast = useToast()

  const [rows,      setRows]      = useState([])
  const [loading,   setLoading]   = useState(true)
  const [status,    setStatus]    = useState('open')
  const [severity,  setSeverity]  = useState('all')
  const [alertType, setAlertType] = useState('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [infants,    setInfants]    = useState([])
  const channelRef = useRef(null)

  // ── Load ───────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await alertService.list({
        doctorId: isDoctor ? user?.id : undefined,
        status, severity, limit: 100,
      })
      // Client-side filter by alert_type
      const filtered = alertType === 'all' ? data : data.filter(a => a.alert_type === alertType)
      setRows(filtered)
    } catch (err) {
      toast.error(err.message ?? 'Could not load alerts')
    } finally {
      setLoading(false)
    }
  }, [status, severity, alertType, isDoctor, user, toast])

  useEffect(() => { load() }, [load])

  // Load infants for manual alert creation
  useEffect(() => {
    if (!user?.id) return
    infantService.list({ doctorId: isDoctor ? user.id : undefined, pageSize: 100 })
      .then(r => setInfants(r.rows ?? []))
      .catch(() => {})
  }, [user, isDoctor])

  // ── Real-time subscription ─────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return
    channelRef.current = supabase
      .channel(`alerts-page-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setRows(prev => [payload.new, ...prev])
            toast.custom?.(`🔔 New alert: ${payload.new.subject}`) ||
            toast.error(`🔔 ${payload.new.subject}`)
          } else if (payload.eventType === 'UPDATE') {
            setRows(prev => prev.map(r => r.id === payload.new.id ? payload.new : r)
              .filter(r => status === 'all' || r.status === status))
          } else if (payload.eventType === 'DELETE') {
            setRows(prev => prev.filter(r => r.id !== payload.old.id))
          }
        })
      .subscribe()
    return () => { supabase.removeChannel(channelRef.current) }
  }, [user, status])

  // ── Actions ────────────────────────────────────────────────────
  const ack = async (id) => {
    try { await alertService.acknowledge(id); toast.success('Acknowledged'); load() }
    catch (e) { toast.error(e.message) }
  }
  const resolve = async (id) => {
    try { await alertService.resolve(id); toast.success('Resolved'); load() }
    catch (e) { toast.error(e.message) }
  }
  const del = async (id) => {
    if (!confirm('Delete this alert?')) return
    try { await alertService.remove(id); toast.success('Deleted'); load() }
    catch (e) { toast.error(e.message) }
  }

  // ── Counts ─────────────────────────────────────────────────────
  const criticalCount = rows.filter(r => r.severity === 'critical' && r.status === 'open').length
  const warningCount  = rows.filter(r => r.severity === 'warning'  && r.status === 'open').length

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Alerts
            {criticalCount > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400">
                <AlertCircle size={11} />{criticalCount} critical
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-500 dark:text-zinc-500 mt-0.5">
            Auto-generated by the system · updates in real-time
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw size={13} /> Refresh
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus size={14} /> Add manual alert
          </Button>
        </div>
      </div>

      {/* Summary chips */}
      {(criticalCount > 0 || warningCount > 0) && (
        <div className="flex flex-wrap gap-3 p-4 rounded-2xl bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20">
          <AlertCircle size={16} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-300">
            <span className="font-bold">Attention required:</span>
            {criticalCount > 0 && ` ${criticalCount} critical alert${criticalCount > 1 ? 's' : ''}`}
            {criticalCount > 0 && warningCount > 0 && ' and'}
            {warningCount > 0  && ` ${warningCount} warning${warningCount > 1 ? 's' : ''}`}
            {' '}need your review.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Status tabs */}
        <div className="flex rounded-lg border border-slate-200 dark:border-zinc-800 overflow-hidden">
          {[['open','Open'], ['acknowledged','Acked'], ['resolved','Resolved'], ['all','All']].map(([v,l]) => (
            <button key={v} onClick={() => setStatus(v)}
              className={cn('px-3 py-1.5 text-xs font-semibold transition',
                status === v
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-900')}>
              {l}
            </button>
          ))}
        </div>

        <select value={severity} onChange={e => setSeverity(e.target.value)}
          className="h-8 pl-3 pr-7 rounded-lg text-xs bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 focus:outline-none cursor-pointer">
          <option value="all">All severities</option>
          <option value="critical">Critical</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
        </select>

        <select value={alertType} onChange={e => setAlertType(e.target.value)}
          className="h-8 pl-3 pr-7 rounded-lg text-xs bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 focus:outline-none cursor-pointer">
          <option value="all">All types</option>
          {Object.entries(TYPE_CONFIG).map(([v, cfg]) => (
            <option key={v} value={v}>{cfg.label}</option>
          ))}
        </select>

        <span className="ml-auto text-sm text-slate-500 dark:text-zinc-500 self-center">
          {rows.length} alert{rows.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={status === 'open' ? 'No open alerts' : 'No alerts found'}
          description={status === 'open'
            ? 'All clear! The system will auto-generate alerts when it detects issues.'
            : 'Try changing the filters above.'}
        />
      ) : (
        <div className="space-y-3">
          {rows.map(alert => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onAck={() => ack(alert.id)}
              onResolve={() => resolve(alert.id)}
              onDelete={() => del(alert.id)}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      <CreateAlertModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        doctorId={user?.id}
        infants={infants}
        onCreated={() => { setCreateOpen(false); load() }}
      />
    </div>
  )
}

// ── Alert card ────────────────────────────────────────────────────

function AlertCard({ alert, onAck, onResolve, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const typeCfg = TYPE_CONFIG[alert.alert_type] ?? TYPE_CONFIG.manual
  const sevCfg  = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.info
  const TypeIcon = typeCfg.icon

  const fmtDate = (iso) => new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className={cn(
      'rounded-2xl border transition-all',
      alert.severity === 'critical'
        ? 'bg-red-50/50 dark:bg-red-500/5 border-red-200 dark:border-red-500/20'
        : alert.severity === 'warning'
        ? 'bg-amber-50/50 dark:bg-amber-500/5 border-amber-200 dark:border-amber-500/20'
        : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800',
      alert.status !== 'open' && 'opacity-60'
    )}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Type icon */}
          <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', typeCfg.bg)}>
            <TypeIcon size={16} className={typeCfg.color} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                  <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded', sevCfg.cls)}>
                    {sevCfg.label}
                  </span>
                  <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded', typeCfg.bg, typeCfg.color)}>
                    {typeCfg.label}
                  </span>
                  {alert.source === 'system' && (
                    <span className="text-[10px] text-slate-400 dark:text-zinc-600 font-medium">auto-detected</span>
                  )}
                  {alert.status !== 'open' && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-500 capitalize">
                      {alert.status}
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                  {alert.subject}
                </h3>
                {alert.infant && (
                  <div className="flex items-center gap-1 mt-0.5 text-[11px] text-slate-500 dark:text-zinc-500">
                    <Baby size={10} />{alert.infant.name}
                  </div>
                )}
              </div>

              {/* Actions */}
              {alert.status === 'open' && (
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={onAck} title="Acknowledge"
                    className="w-7 h-7 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 hover:bg-brand-50 dark:hover:bg-brand-900/20 flex items-center justify-center text-slate-500 dark:text-zinc-400 hover:text-brand-600 dark:hover:text-brand-400 transition">
                    <Check size={13} />
                  </button>
                  <button onClick={onResolve} title="Mark resolved"
                    className="w-7 h-7 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center justify-center text-slate-500 dark:text-zinc-400 hover:text-green-600 dark:hover:text-green-400 transition">
                    <CheckCheck size={13} />
                  </button>
                  <button onClick={onDelete} title="Delete"
                    className="w-7 h-7 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center text-slate-500 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition">
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </div>

            {/* Message preview */}
            {alert.message && (
              <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1.5 leading-relaxed line-clamp-2">
                {alert.message}
              </p>
            )}

            <div className="flex items-center justify-between mt-2">
              <span className="text-[11px] text-slate-400 dark:text-zinc-600">
                {fmtDate(alert.created_at)}
              </span>
              {alert.message && alert.message.length > 80 && (
                <button onClick={() => setExpanded(v => !v)}
                  className="text-[11px] text-brand-600 dark:text-brand-400 hover:underline">
                  {expanded ? 'Show less' : 'Read more'}
                </button>
              )}
            </div>

            {/* Expanded message */}
            {expanded && alert.message && (
              <div className="mt-2 p-3 rounded-lg bg-white/60 dark:bg-zinc-800/60 text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                {alert.message}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Create alert modal ────────────────────────────────────────────

function CreateAlertModal({ open, onClose, doctorId, infants, onCreated }) {
  const toast = useToast()
  const blank = { subject: '', message: '', severity: 'info', infant_id: '', alert_type: 'manual' }
  const [f, setF] = useState(blank)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  useEffect(() => { if (open) { setF(blank); setErr('') } }, [open])

  const submit = async (e) => {
    e.preventDefault(); setErr('')
    if (!f.subject.trim()) { setErr('Subject is required.'); return }
    setSaving(true)
    try {
      await alertService.create({ ...f, doctor_id: doctorId })
      toast.success('Alert created')
      onCreated()
    } catch (e) { setErr(e.message); toast.error(e.message) }
    finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={() => !saving && onClose()}
      title="Create manual alert" size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={submit} loading={saving}>Create alert</Button>
        </>
      }>
      <form onSubmit={submit} className="space-y-4">
        {err && (
          <div className="rounded-lg border-l-4 border-red-500 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            {err}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Severity" required>
            <Select value={f.severity} onChange={e => set('severity', e.target.value)}>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </Select>
          </Field>
          <Field label="Infant (optional)">
            <Select value={f.infant_id} onChange={e => set('infant_id', e.target.value)}>
              <option value="">— none —</option>
              {infants.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Subject" required>
          <Input value={f.subject} onChange={e => set('subject', e.target.value)}
            placeholder="e.g. Review growth chart before next visit" />
        </Field>
        <Field label="Message (optional)">
          <textarea value={f.message} onChange={e => set('message', e.target.value)} rows={3}
            placeholder="Additional details…"
            className="block w-full px-3.5 py-2.5 rounded-lg text-sm bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 outline-none resize-y" />
        </Field>
      </form>
    </Modal>
  )
}