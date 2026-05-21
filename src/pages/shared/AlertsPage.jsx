// src/pages/shared/AlertsPage.jsx
//
// Shared alerts inbox. Admin sees all; doctor sees only their alerts (RLS).

import { useEffect, useState, useCallback } from 'react'
import { Bell, Check, RefreshCw, Plus, AlertCircle, AlertTriangle, Info, Trash2 } from 'lucide-react'
import { alertService } from '../../services/alertService'
import { useAuth }  from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'

import StatusBadge from '../../components/StatusBadge'
import EmptyState  from '../../components/EmptyState'
import Button      from '../../components/ui/Button'
import Modal       from '../../components/ui/Modal'
import { Field, Input, Select } from '../../components/ui/Field'
import { Skeleton } from '../../components/ui/Skeleton'
import { cn } from '../../utils/cn'

const SEVERITY_VISUALS = {
  info:     { icon: Info,           bg: 'bg-brand-50 dark:bg-zinc-800', tx: 'text-brand-700 dark:text-zinc-200' },
  warning:  { icon: AlertTriangle,  bg: 'bg-amber-50 dark:bg-amber-500/10', tx: 'text-amber-700 dark:text-amber-400' },
  critical: { icon: AlertCircle,    bg: 'bg-red-50 dark:bg-red-500/10', tx: 'text-red-700 dark:text-red-400' },
}

export default function AlertsPage() {
  const { isDoctor, user } = useAuth()
  const toast = useToast()

  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(true)
  const [status,   setStatus]   = useState('all')
  const [severity, setSeverity] = useState('all')

  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({ subject: '', message: '', severity: 'info' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await alertService.list({
        // RLS does the heavy lifting; passing doctorId is just an extra filter
        doctorId: isDoctor ? user?.id : undefined,
        status, severity,
      })
      setRows(data)
    } catch (err) {
      toast.error(err.message ?? 'Could not load alerts')
    } finally {
      setLoading(false)
    }
  }, [status, severity, isDoctor, user, toast])

  useEffect(() => { load() }, [load])

  const ack = async (id) => { await alertService.acknowledge(id); toast.success('Acknowledged'); load() }
  const res = async (id) => { await alertService.resolve(id);     toast.success('Resolved');     load() }
  const del = async (id) => { await alertService.remove(id);      toast.success('Deleted');      load() }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.subject.trim()) return
    setSaving(true)
    try {
      await alertService.create({
        subject: form.subject,
        message: form.message,
        severity: form.severity,
        doctor_id: isDoctor ? user?.id : null,
      })
      toast.success('Alert created')
      setCreateOpen(false)
      setForm({ subject: '', message: '', severity: 'info' })
      load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Alerts</h1>
          <p className="text-sm text-slate-500 dark:text-zinc-500 mt-1">System and manually-flagged alerts.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </Button>
          <Button onClick={() => setCreateOpen(true)}><Plus size={14} /> New alert</Button>
        </div>
      </div>

      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 sm:p-5 mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-500 dark:text-zinc-500 mr-1">Status:</span>
          {['all', 'open', 'acknowledged', 'resolved'].map(s => (
            <button
              key={s} onClick={() => setStatus(s)}
              className={
                'px-3 h-8 rounded-full text-xs font-semibold capitalize transition border ' +
                (status === s
                  ? 'bg-brand-700 text-white border-brand-700 dark:bg-white dark:text-black dark:border-white'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800 dark:hover:bg-zinc-800')
              }
            >{s}</button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap sm:ml-auto">
          <span className="text-xs font-bold text-slate-500 dark:text-zinc-500 mr-1">Severity:</span>
          {['all', 'info', 'warning', 'critical'].map(s => (
            <button
              key={s} onClick={() => setSeverity(s)}
              className={
                'px-3 h-8 rounded-full text-xs font-semibold capitalize transition border ' +
                (severity === s
                  ? 'bg-brand-700 text-white border-brand-700 dark:bg-white dark:text-black dark:border-white'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800 dark:hover:bg-zinc-800')
              }
            >{s}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={Bell} title="No alerts" description="When alerts come in they will show up here." />
      ) : (
        <ul className="space-y-3">
          {rows.map(a => {
            const v = SEVERITY_VISUALS[a.severity] ?? SEVERITY_VISUALS.info
            const Icon = v.icon
            return (
              <li key={a.id} className="rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 flex items-start gap-3">
                <div className={cn('h-10 w-10 rounded-lg grid place-items-center shrink-0', v.bg, v.tx)}>
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-slate-900 dark:text-white">{a.subject}</h3>
                    <StatusBadge status={a.status} />
                    <span className={cn('text-[11px] font-bold uppercase px-1.5 py-0.5 rounded', v.bg, v.tx)}>{a.severity}</span>
                    {a.source && a.source !== 'system' && (
                      <span className="text-[11px] text-slate-500 dark:text-zinc-500 capitalize">via {a.source}</span>
                    )}
                  </div>
                  {a.message && (
                    <p className="text-sm text-slate-600 dark:text-zinc-300 mt-1 leading-relaxed">{a.message}</p>
                  )}
                  <div className="text-[11px] text-slate-500 dark:text-zinc-500 mt-1.5">
                    {new Date(a.created_at).toLocaleString()}
                    {a.infant?.name && ` · Infant: ${a.infant.name}`}
                    {a.patient?.full_name && ` · Patient: ${a.patient.full_name}`}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  {a.status === 'open' && (
                    <Button size="xs" onClick={() => ack(a.id)}><Check size={12} /> Acknowledge</Button>
                  )}
                  {a.status !== 'resolved' && (
                    <Button variant="secondary" size="xs" onClick={() => res(a.id)}>Resolve</Button>
                  )}
                  <Button variant="danger" size="xs" onClick={() => del(a.id)}><Trash2 size={12} /></Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <Modal
        open={createOpen}
        onClose={() => !saving && setCreateOpen(false)}
        title="Create alert"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={submit} loading={saving}>Create</Button>
          </>
        }
      >
        <form onSubmit={submit}>
          <Field label="Subject" required>
            <Input value={form.subject} onChange={(e) => setForm(f => ({ ...f, subject: e.target.value }))} disabled={saving} />
          </Field>
          <Field label="Severity">
            <Select value={form.severity} onChange={(e) => setForm(f => ({ ...f, severity: e.target.value }))} disabled={saving}>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </Select>
          </Field>
          <Field label="Message">
            <textarea
              value={form.message}
              onChange={(e) => setForm(f => ({ ...f, message: e.target.value }))}
              rows={4}
              disabled={saving}
              className="block w-full px-3.5 py-2.5 rounded-lg text-sm bg-white dark:bg-zinc-900 text-slate-900 dark:text-white border border-slate-200 dark:border-zinc-800 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 outline-none resize-y"
            />
          </Field>
        </form>
      </Modal>
    </>
  )
}
