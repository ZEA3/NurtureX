// src/pages/shared/InfantDetail.jsx
//
// Shared infant detail view used by both admin and doctor routes.
// Tabs: Overview, Growth (chart), Vaccinations, Feeding.

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Activity, Syringe, Utensils, Plus, Check, Trash2, AlertCircle,
  FileText, Pencil,
} from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts'

import { useAuth }  from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import { infantService }       from '../../services/infantService'
import { growthService }       from '../../services/growthService'
import { vaccinationService }  from '../../services/vaccinationService'
import { feedingService }      from '../../services/feedingService'
import { medicalNoteService }  from '../../services/medicalNoteService'

import Avatar      from '../../components/ui/Avatar'
import Button      from '../../components/ui/Button'
import Modal       from '../../components/ui/Modal'
import { Field, Input, Select } from '../../components/ui/Field'
import StatusBadge from '../../components/StatusBadge'
import EmptyState  from '../../components/EmptyState'
import { Skeleton, SkeletonStatCard } from '../../components/ui/Skeleton'
import { cn } from '../../utils/cn'

const TABS = [
  { key: 'overview',     label: 'Overview',     icon: Activity },
  { key: 'growth',       label: 'Growth',       icon: Activity },
  { key: 'vaccinations', label: 'Vaccinations', icon: Syringe },
  { key: 'feeding',      label: 'Feeding',      icon: Utensils },
  { key: 'notes',        label: 'Notes',        icon: FileText },
]

export default function InfantDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { isAdmin } = useAuth()
  const back = isAdmin ? '/admin/infants' : '/doctor/infants'

  const [tab,    setTab]    = useState('overview')
  const [infant, setInfant] = useState(null)
  const [loading, setLoading] = useState(true)

  const [growth,       setGrowth]       = useState([])
  const [vaccinations, setVaccinations] = useState([])
  const [feedings,     setFeedings]     = useState([])
  const [notes,        setNotes]        = useState([])

  // Modals
  const [growthModal,  setGrowthModal]  = useState(false)
  const [vaxModal,     setVaxModal]     = useState(false)
  const [feedingModal, setFeedingModal] = useState(false)
  const [noteModal,    setNoteModal]    = useState(false)
  const [editingNote,  setEditingNote]  = useState(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const [i, g, v, f, n] = await Promise.all([
          infantService.getById(id),
          growthService.listForInfant(id),
          vaccinationService.listForInfant(id),
          feedingService.listForInfant(id),
          medicalNoteService.listForInfant(id),
        ])
        if (cancelled) return
        setInfant(i)
        setGrowth(g)
        setVaccinations(v)
        setFeedings(f)
        setNotes(n)
      } catch (err) {
        if (!cancelled) toast.error(err.message ?? 'Could not load infant')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [id, toast])

  if (loading) {
    return (
      <>
        <Skeleton className="h-10 w-32 mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <SkeletonStatCard /><SkeletonStatCard /><SkeletonStatCard />
        </div>
        <Skeleton className="h-96 w-full" />
      </>
    )
  }
  if (!infant) {
    return (
      <EmptyState title="Infant not found" description="The record may have been deleted or you don't have access." />
    )
  }

  const ageMonths = infant.date_of_birth
    ? Math.max(0, Math.floor((Date.now() - new Date(infant.date_of_birth)) / (30 * 86400000)))
    : null

  const latestGrowth = growth[growth.length - 1]
  const upcomingVax  = vaccinations.filter(v => v.status === 'scheduled').length
  const overdueVax   = vaccinations.filter(v => v.status === 'overdue').length

  const refreshGrowth = async () => setGrowth(await growthService.listForInfant(id))
  const refreshVax    = async () => setVaccinations(await vaccinationService.listForInfant(id))
  const refreshFeeds  = async () => setFeedings(await feedingService.listForInfant(id))
  const refreshNotes  = async () => setNotes(await medicalNoteService.listForInfant(id))

  return (
    <>
      <button
        onClick={() => navigate(back)}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white mb-5 transition"
      >
        <ArrowLeft size={15} /> Back to infants
      </button>

      {/* Identity card */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 sm:p-6 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Avatar name={infant.name} size="xl" />
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{infant.name}</h1>
            <div className="text-sm text-slate-500 dark:text-zinc-500 mt-0.5">
              {ageMonths != null ? `${ageMonths} months old` : 'DOB unknown'}
              {' · '}{infant.gender ?? '—'}
              {infant.blood_type ? ` · ${infant.blood_type}` : ''}
            </div>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <StatusBadge status={infant.status} />
              {infant.mother?.full_name && (
                <span className="text-xs text-slate-500 dark:text-zinc-500">Mother: <span className="font-semibold text-slate-700 dark:text-zinc-300">{infant.mother.full_name}</span></span>
              )}
              {infant.doctor?.full_name && (
                <span className="text-xs text-slate-500 dark:text-zinc-500">Doctor: <span className="font-semibold text-slate-700 dark:text-zinc-300">Dr. {infant.doctor.full_name}</span></span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1">
        {TABS.map(t => {
          const Icon = t.icon
          const active = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'inline-flex items-center gap-2 px-4 h-10 rounded-lg text-sm font-semibold whitespace-nowrap transition',
                active
                  ? 'bg-brand-700 text-white dark:bg-white dark:text-black'
                  : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-900'
              )}
            >
              <Icon size={14} /> {t.label}
            </button>
          )
        })}
      </div>

      {/* ── Overview ── */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <StatTile label="Age" value={ageMonths != null ? `${ageMonths} mo` : '—'} />
          <StatTile label="Weight" value={latestGrowth?.weight_kg ? `${latestGrowth.weight_kg} kg` : '—'} sub={latestGrowth ? `last: ${new Date(latestGrowth.measured_at).toLocaleDateString()}` : 'no records'} />
          <StatTile label="Height" value={latestGrowth?.height_cm ? `${latestGrowth.height_cm} cm` : '—'} />
          <StatTile label="Vaccinations done" value={vaccinations.filter(v => v.status === 'administered').length} />
          <StatTile label="Upcoming" value={upcomingVax} sub={overdueVax ? `${overdueVax} overdue` : null} />
          <StatTile label="Recent feedings" value={feedings.length} sub={feedings[0] ? `last: ${new Date(feedings[0].fed_at).toLocaleString()}` : null} />
          {infant.notes && (
            <div className="lg:col-span-3 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5">
              <h3 className="font-bold text-slate-900 dark:text-white mb-2">Notes</h3>
              <p className="text-sm text-slate-600 dark:text-zinc-300 leading-relaxed whitespace-pre-line">{infant.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Growth ── */}
      {tab === 'growth' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">Growth chart</h3>
                <p className="text-xs text-slate-500 dark:text-zinc-500">Weight & height over time</p>
              </div>
              <Button size="sm" onClick={() => setGrowthModal(true)}><Plus size={13} /> Add measurement</Button>
            </div>
            {growth.length === 0 ? (
              <EmptyState icon={Activity} title="No measurements yet" description="Add the first growth record to see the chart." />
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={growth.map(g => ({ ...g, label: new Date(g.measured_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }))} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-200 dark:text-zinc-800" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'currentColor' }} className="text-slate-500 dark:text-zinc-500" axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'currentColor' }} className="text-slate-500 dark:text-zinc-500" axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid rgba(0,0,0,.08)', fontSize: 12, background: 'var(--surface)', color: 'var(--text-primary)' }} />
                    <Legend />
                    <Line type="monotone" dataKey="weight_kg" name="Weight (kg)" stroke="#2563EB" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="height_cm" name="Height (cm)" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Records table */}
          {growth.length > 0 && (
            <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-zinc-950">
                    <tr>
                      <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-500">Date</th>
                      <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-500">Weight</th>
                      <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-500">Height</th>
                      <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-500">Head</th>
                      <th className="text-right px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                    {[...growth].reverse().map(g => (
                      <tr key={g.id} className="hover:bg-slate-50 dark:hover:bg-zinc-950">
                        <td className="px-5 py-3">{new Date(g.measured_at).toLocaleDateString()}</td>
                        <td className="px-5 py-3">{g.weight_kg ? `${g.weight_kg} kg` : '—'}</td>
                        <td className="px-5 py-3">{g.height_cm ? `${g.height_cm} cm` : '—'}</td>
                        <td className="px-5 py-3">{g.head_circumference ? `${g.head_circumference} cm` : '—'}</td>
                        <td className="px-5 py-3 text-right">
                          <Button variant="danger" size="xs" onClick={async () => {
                            await growthService.remove(g.id)
                            toast.success('Record deleted')
                            refreshGrowth()
                          }}>
                            <Trash2 size={12} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Vaccinations ── */}
      {tab === 'vaccinations' && (
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 overflow-hidden">
          <div className="p-5 flex items-center justify-between border-b border-slate-200 dark:border-zinc-800">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">Vaccinations</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-500">Schedule and administration record.</p>
            </div>
            <Button size="sm" onClick={() => setVaxModal(true)}><Plus size={13} /> Schedule</Button>
          </div>
          {vaccinations.length === 0 ? (
            <EmptyState icon={Syringe} title="No vaccinations scheduled" description="Add the first one to start tracking." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-zinc-950">
                  <tr>
                    <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-500">Vaccine</th>
                    <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-500">Scheduled</th>
                    <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-500">Administered</th>
                    <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-500">Status</th>
                    <th className="text-right px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                  {vaccinations.map(v => (
                    <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-zinc-950">
                      <td className="px-5 py-3 font-semibold text-slate-900 dark:text-white">{v.vaccine_name}</td>
                      <td className="px-5 py-3 text-slate-600 dark:text-zinc-300">{v.scheduled_date ? new Date(v.scheduled_date).toLocaleDateString() : '—'}</td>
                      <td className="px-5 py-3 text-slate-600 dark:text-zinc-300">{v.administered_date ? new Date(v.administered_date).toLocaleDateString() : '—'}</td>
                      <td className="px-5 py-3"><StatusBadge status={v.status === 'administered' ? 'completed' : v.status} /></td>
                      <td className="px-5 py-3 text-right">
                        <div className="inline-flex gap-1.5">
                          {v.status !== 'administered' && (
                            <Button size="xs" onClick={async () => {
                              await vaccinationService.markAdministered(v.id)
                              toast.success('Marked as administered')
                              refreshVax()
                            }}>
                              <Check size={12} /> Done
                            </Button>
                          )}
                          <Button variant="danger" size="xs" onClick={async () => {
                            await vaccinationService.remove(v.id)
                            toast.success('Vaccination deleted')
                            refreshVax()
                          }}>
                            <Trash2 size={12} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Feeding ── */}
      {tab === 'feeding' && (
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 overflow-hidden">
          <div className="p-5 flex items-center justify-between border-b border-slate-200 dark:border-zinc-800">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">Feeding log</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-500">Recent feedings (newest first).</p>
            </div>
            <Button size="sm" onClick={() => setFeedingModal(true)}><Plus size={13} /> Log feeding</Button>
          </div>
          {feedings.length === 0 ? (
            <EmptyState icon={Utensils} title="No feedings logged" description="Log the first feeding to start tracking." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-zinc-950">
                  <tr>
                    <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-500">Time</th>
                    <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-500">Type</th>
                    <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-500">Amount</th>
                    <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-500">Duration</th>
                    <th className="text-right px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                  {feedings.map(f => (
                    <tr key={f.id} className="hover:bg-slate-50 dark:hover:bg-zinc-950">
                      <td className="px-5 py-3 text-slate-600 dark:text-zinc-300">{new Date(f.fed_at).toLocaleString()}</td>
                      <td className="px-5 py-3 capitalize font-semibold text-slate-900 dark:text-white">{f.feed_type ?? '—'}</td>
                      <td className="px-5 py-3 text-slate-600 dark:text-zinc-300">{f.amount_ml ? `${f.amount_ml} ml` : '—'}</td>
                      <td className="px-5 py-3 text-slate-600 dark:text-zinc-300">{f.duration_min ? `${f.duration_min} min` : '—'}</td>
                      <td className="px-5 py-3 text-right">
                        <Button variant="danger" size="xs" onClick={async () => {
                          await feedingService.remove(f.id)
                          toast.success('Feeding deleted')
                          refreshFeeds()
                        }}>
                          <Trash2 size={12} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Notes ── */}
      {tab === 'notes' && (
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 overflow-hidden">
          <div className="p-5 flex items-center justify-between border-b border-slate-200 dark:border-zinc-800">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">Medical notes</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-500">Notes & recommendations from doctors.</p>
            </div>
            <Button size="sm" onClick={() => { setEditingNote(null); setNoteModal(true) }}>
              <Plus size={13} /> Add note
            </Button>
          </div>
          {notes.length === 0 ? (
            <EmptyState icon={FileText} title="No notes yet" description="Click 'Add note' to write the first one." />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-zinc-800">
              {notes.map(n => (
                <li key={n.id} className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-900 dark:text-white">{n.title}</h4>
                      <div className="text-[11px] text-slate-500 dark:text-zinc-500 mt-0.5">
                        {n.doctor?.full_name ? `Dr. ${n.doctor.full_name}` : '—'}
                        {' · '}{new Date(n.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="xs" onClick={() => { setEditingNote(n); setNoteModal(true) }} title="Edit"><Pencil size={12} /></Button>
                      <Button variant="danger" size="xs" onClick={async () => {
                        if (!confirm('Delete this note?')) return
                        await medicalNoteService.remove(n.id)
                        toast.success('Note deleted'); refreshNotes()
                      }} title="Delete"><Trash2 size={12} /></Button>
                    </div>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line">{n.content}</p>
                  {n.recommendations && (
                    <div className="mt-3 rounded-lg bg-brand-50 dark:bg-zinc-950 border-l-[3px] border-brand-500 dark:border-zinc-600 px-3 py-2.5">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-brand-700 dark:text-zinc-400 mb-1">Recommendations</div>
                      <p className="text-xs text-slate-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line">{n.recommendations}</p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Modals */}
      <GrowthModal open={growthModal} onClose={() => setGrowthModal(false)} infantId={id} onSaved={refreshGrowth} />
      <VaxModal    open={vaxModal}    onClose={() => setVaxModal(false)}    infantId={id} onSaved={refreshVax} />
      <FeedingModal open={feedingModal} onClose={() => setFeedingModal(false)} infantId={id} onSaved={refreshFeeds} />
      <NoteModal
        open={noteModal}
        onClose={() => setNoteModal(false)}
        infantId={id}
        doctorId={infant?.doctor_id}
        editing={editingNote}
        onSaved={refreshNotes}
      />
    </>
  )
}

function StatTile({ label, value, sub }) {
  return (
    <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5">
      <div className="text-xs font-medium text-slate-500 dark:text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{value}</div>
      {sub && <div className="text-[11px] text-slate-500 dark:text-zinc-500 mt-1">{sub}</div>}
    </div>
  )
}

/* ─── Modals ─── */

function GrowthModal({ open, onClose, infantId, onSaved }) {
  const toast = useToast()
  const [f, setF] = useState({ measured_at: new Date().toISOString().slice(0,10), weight_kg: '', height_cm: '', head_circumference: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setSaving(true)
    try { await growthService.create({ infant_id: infantId, ...f }); toast.success('Measurement saved'); await onSaved(); onClose() }
    catch (e) { setErr(e.message); toast.error(e.message) }
    finally { setSaving(false) }
  }
  return (
    <Modal open={open} onClose={() => !saving && onClose()} title="Add growth measurement"
      footer={<><Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button><Button onClick={submit} loading={saving}>Save</Button></>}>
      <form onSubmit={submit}>
        {err && <div className="rounded-lg border-l-[3px] border-red-500 bg-red-50 dark:bg-red-500/10 px-4 py-3 flex gap-2.5 text-sm text-red-700 dark:text-red-400 mb-4"><AlertCircle size={16} /><span>{err}</span></div>}
        <Field label="Date"><Input type="date" value={f.measured_at} onChange={(e) => setF(v => ({ ...v, measured_at: e.target.value }))} disabled={saving} /></Field>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Weight (kg)"><Input type="number" step="0.001" value={f.weight_kg} onChange={(e) => setF(v => ({ ...v, weight_kg: e.target.value }))} disabled={saving} /></Field>
          <Field label="Height (cm)"><Input type="number" step="0.1" value={f.height_cm} onChange={(e) => setF(v => ({ ...v, height_cm: e.target.value }))} disabled={saving} /></Field>
          <Field label="Head (cm)"><Input type="number" step="0.1" value={f.head_circumference} onChange={(e) => setF(v => ({ ...v, head_circumference: e.target.value }))} disabled={saving} /></Field>
        </div>
        <Field label="Notes"><Input value={f.notes} onChange={(e) => setF(v => ({ ...v, notes: e.target.value }))} disabled={saving} /></Field>
      </form>
    </Modal>
  )
}

function VaxModal({ open, onClose, infantId, onSaved }) {
  const toast = useToast()
  const [f, setF] = useState({ vaccine_name: '', scheduled_date: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setSaving(true)
    try {
      if (!f.vaccine_name.trim()) throw new Error('Vaccine name is required.')
      await vaccinationService.create({ infant_id: infantId, ...f })
      toast.success('Scheduled'); await onSaved(); onClose()
    } catch (e) { setErr(e.message); toast.error(e.message) }
    finally { setSaving(false) }
  }
  return (
    <Modal open={open} onClose={() => !saving && onClose()} title="Schedule vaccination"
      footer={<><Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button><Button onClick={submit} loading={saving}>Schedule</Button></>}>
      <form onSubmit={submit}>
        {err && <div className="rounded-lg border-l-[3px] border-red-500 bg-red-50 dark:bg-red-500/10 px-4 py-3 flex gap-2.5 text-sm text-red-700 dark:text-red-400 mb-4"><AlertCircle size={16} /><span>{err}</span></div>}
        <Field label="Vaccine name" required><Input value={f.vaccine_name} onChange={(e) => setF(v => ({ ...v, vaccine_name: e.target.value }))} placeholder="e.g. BCG, MMR" disabled={saving} /></Field>
        <Field label="Scheduled date"><Input type="date" value={f.scheduled_date} onChange={(e) => setF(v => ({ ...v, scheduled_date: e.target.value }))} disabled={saving} /></Field>
        <Field label="Notes"><Input value={f.notes} onChange={(e) => setF(v => ({ ...v, notes: e.target.value }))} disabled={saving} /></Field>
      </form>
    </Modal>
  )
}

function FeedingModal({ open, onClose, infantId, onSaved }) {
  const toast = useToast()
  const [f, setF] = useState({ feed_type: 'breast', amount_ml: '', duration_min: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const submit = async (e) => {
    e.preventDefault(); setSaving(true)
    try { await feedingService.create({ infant_id: infantId, ...f }); toast.success('Feeding logged'); await onSaved(); onClose() }
    catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }
  return (
    <Modal open={open} onClose={() => !saving && onClose()} title="Log feeding"
      footer={<><Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button><Button onClick={submit} loading={saving}>Save</Button></>}>
      <form onSubmit={submit}>
        <Field label="Type">
          <Select value={f.feed_type} onChange={(e) => setF(v => ({ ...v, feed_type: e.target.value }))} disabled={saving}>
            <option value="breast">Breast</option>
            <option value="formula">Formula</option>
            <option value="solid">Solid</option>
            <option value="mixed">Mixed</option>
          </Select>
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Amount (ml)"><Input type="number" value={f.amount_ml} onChange={(e) => setF(v => ({ ...v, amount_ml: e.target.value }))} disabled={saving} /></Field>
          <Field label="Duration (min)"><Input type="number" value={f.duration_min} onChange={(e) => setF(v => ({ ...v, duration_min: e.target.value }))} disabled={saving} /></Field>
        </div>
        <Field label="Notes"><Input value={f.notes} onChange={(e) => setF(v => ({ ...v, notes: e.target.value }))} disabled={saving} /></Field>
      </form>
    </Modal>
  )
}

function NoteModal({ open, onClose, infantId, doctorId, editing, onSaved }) {
  const toast = useToast()
  const { user } = useAuth()
  const [f, setF] = useState({ title: '', content: '', recommendations: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  // Reset form when modal opens / mode switches
  useEffect(() => {
    if (!open) return
    if (editing) {
      setF({
        title: editing.title ?? '',
        content: editing.content ?? '',
        recommendations: editing.recommendations ?? '',
      })
    } else {
      setF({ title: '', content: '', recommendations: '' })
    }
    setErr('')
  }, [open, editing])

  const submit = async (e) => {
    e.preventDefault(); setErr('')
    if (!f.title.trim() || !f.content.trim()) { setErr('Title and content are required.'); return }
    setSaving(true)
    try {
      if (editing) {
        await medicalNoteService.update(editing.id, f)
        toast.success('Note updated')
      } else {
        await medicalNoteService.create({
          ...f,
          infant_id: infantId,
          // For doctors, RLS requires doctor_id = auth.uid().
          // For admins, fall back to the infant's assigned doctor.
          doctor_id: user?.id ?? doctorId ?? null,
        })
        toast.success('Note added')
      }
      await onSaved(); onClose()
    } catch (e) {
      setErr(e.message); toast.error(e.message)
    } finally { setSaving(false) }
  }

  return (
    <Modal
      open={open}
      onClose={() => !saving && onClose()}
      title={editing ? 'Edit note' : 'Add medical note'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={submit} loading={saving}>{editing ? 'Save changes' : 'Add note'}</Button>
        </>
      }
    >
      <form onSubmit={submit}>
        {err && (
          <div className="rounded-lg border-l-[3px] border-red-500 bg-red-50 dark:bg-red-500/10 px-4 py-3 flex gap-2.5 text-sm text-red-700 dark:text-red-400 mb-4">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{err}</span>
          </div>
        )}
        <Field label="Title" required>
          <Input value={f.title} onChange={(e) => setF(v => ({ ...v, title: e.target.value }))} placeholder="e.g. Routine 3-month checkup" disabled={saving} />
        </Field>
        <Field label="Note content" required>
          <textarea
            value={f.content}
            onChange={(e) => setF(v => ({ ...v, content: e.target.value }))}
            rows={5}
            placeholder="Observations, history, findings…"
            disabled={saving}
            className="block w-full px-3.5 py-2.5 rounded-lg text-sm bg-white dark:bg-zinc-900 text-slate-900 dark:text-white border border-slate-200 dark:border-zinc-800 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 outline-none resize-y"
          />
        </Field>
        <Field label="Recommendations">
          <textarea
            value={f.recommendations}
            onChange={(e) => setF(v => ({ ...v, recommendations: e.target.value }))}
            rows={3}
            placeholder="Follow-up actions, prescriptions, lifestyle advice…"
            disabled={saving}
            className="block w-full px-3.5 py-2.5 rounded-lg text-sm bg-white dark:bg-zinc-900 text-slate-900 dark:text-white border border-slate-200 dark:border-zinc-800 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 outline-none resize-y"
          />
        </Field>
      </form>
    </Modal>
  )
}
