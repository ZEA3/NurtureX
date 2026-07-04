// src/pages/doctor/DoctorMedicalNotes.jsx
//
// Phase 2 — Dedicated medical notes page for the doctor dashboard.
// Shows all notes the doctor has written, filterable by infant/patient.
// Doctor can add, edit, delete, and toggle parent visibility.

import { useEffect, useState, useMemo } from 'react'
import {
  FileText, Plus, Pencil, Trash2, Eye, EyeOff,
  Search, ChevronDown, AlertCircle, Calendar,
  User, Baby, Tag, CheckCircle2, Clock,
} from 'lucide-react'

import { useAuth }  from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import { medicalNoteService, VISIT_TYPES, NOTE_TEMPLATES } from '../../services/medicalNoteService'
import { infantService } from '../../services/infantService'

import Button      from '../../components/ui/Button'
import Modal       from '../../components/ui/Modal'
import EmptyState  from '../../components/EmptyState'
import { Skeleton } from '../../components/ui/Skeleton'
import { Field, Input, Select, Textarea } from '../../components/ui/Field'
import { cn } from '../../utils/cn'

const VISIT_COLORS = {
  routine:       'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  urgent:        'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  follow_up:     'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400',
  vaccination:   'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400',
  sick_visit:    'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400',
  new_born:      'bg-pink-50 text-pink-700 dark:bg-pink-500/10 dark:text-pink-400',
  developmental: 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400',
}

export default function DoctorMedicalNotes() {
  const { user } = useAuth()
  const toast    = useToast()

  const [notes,    setNotes]    = useState([])
  const [infants,  setInfants]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [filterInfant, setFilterInfant] = useState('all')
  const [filterType,   setFilterType]   = useState('all')

  const [modalOpen,   setModalOpen]   = useState(false)
  const [editingNote, setEditingNote] = useState(null)
  const [detailNote,  setDetailNote]  = useState(null)

  // ── Load ──────────────────────────────────────────────────
  const load = async () => {
    setLoading(true)
    try {
      const [{ rows }, inf] = await Promise.all([
        medicalNoteService.list({ doctorId: user.id }),
        infantService.listForDoctor(user.id),
      ])
      setNotes(rows)
      setInfants(inf)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [user.id])

  // ── Filter ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return notes.filter(n => {
      const matchSearch = !q ||
        n.title?.toLowerCase().includes(q) ||
        n.content?.toLowerCase().includes(q) ||
        n.infant?.name?.toLowerCase().includes(q) ||
        n.diagnosis?.toLowerCase().includes(q)
      const matchInfant = filterInfant === 'all' || n.infant_id === filterInfant
      const matchType   = filterType   === 'all' || n.visit_type === filterType
      return matchSearch && matchInfant && matchType
    })
  }, [notes, search, filterInfant, filterType])

  // ── Toggle visibility ─────────────────────────────────────
  const toggleVisibility = async (note) => {
    try {
      const updated = await medicalNoteService.toggleVisibility(note.id, !note.is_parent_visible)
      setNotes(prev => prev.map(n => n.id === updated.id ? updated : n))
      toast.success(updated.is_parent_visible ? 'Visible to parent' : 'Hidden from parent')
    } catch (e) { toast.error(e.message) }
  }

  // ── Delete ────────────────────────────────────────────────
  const deleteNote = async (id) => {
    if (!confirm('Delete this note? This cannot be undone.')) return
    try {
      await medicalNoteService.remove(id)
      setNotes(prev => prev.filter(n => n.id !== id))
      toast.success('Note deleted')
    } catch (e) { toast.error(e.message) }
  }

  const openAdd  = ()     => { setEditingNote(null); setModalOpen(true) }
  const openEdit = (note) => { setEditingNote(note); setModalOpen(true) }

  const onSaved = (saved) => {
    setNotes(prev => {
      const idx = prev.findIndex(n => n.id === saved.id)
      return idx >= 0 ? prev.map(n => n.id === saved.id ? saved : n) : [saved, ...prev]
    })
  }

  // ── Counts ────────────────────────────────────────────────
  const visibleCount = notes.filter(n => n.is_parent_visible).length
  const todayCount   = notes.filter(n => {
    const d = new Date(n.created_at)
    const t = new Date()
    return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear()
  }).length

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Medical Notes
          </h1>
          <p className="text-sm text-slate-500 dark:text-zinc-500 mt-0.5">
            Clinical notes and recommendations for your patients
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus size={15} /> Add note
        </Button>
      </div>

      {/* Stat chips */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: 'Total notes', value: notes.length, icon: FileText, color: 'text-blue-600' },
          { label: 'Visible to parents', value: visibleCount, icon: Eye, color: 'text-green-600' },
          { label: 'Written today', value: todayCount, icon: Clock, color: 'text-purple-600' },
        ].map(s => (
          <div key={s.label}
            className="flex items-center gap-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 px-4 py-2.5">
            <s.icon size={15} className={s.color} />
            <span className="text-sm font-bold text-slate-900 dark:text-white">{s.value}</span>
            <span className="text-xs text-slate-500 dark:text-zinc-500">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search notes, infants, diagnoses…"
            className="w-full h-10 pl-9 pr-4 rounded-lg text-sm bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15"
          />
        </div>
        <select
          value={filterInfant}
          onChange={e => setFilterInfant(e.target.value)}
          className="h-10 pl-3 pr-8 rounded-lg text-sm bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white focus:outline-none cursor-pointer">
          <option value="all">All infants</option>
          {infants.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="h-10 pl-3 pr-8 rounded-lg text-sm bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white focus:outline-none cursor-pointer">
          <option value="all">All visit types</option>
          {VISIT_TYPES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
        </select>
      </div>

      {/* Notes list */}
      {loading ? (
        <div className="space-y-3">
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No notes found"
          description={search || filterInfant !== 'all' || filterType !== 'all'
            ? 'Try adjusting your search or filters.'
            : "You haven't written any medical notes yet. Click 'Add note' to write your first one."}
          action={!search && filterInfant === 'all' && filterType === 'all'
            ? <Button onClick={openAdd}><Plus size={14}/> Write first note</Button>
            : null}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map(note => (
            <NoteCard
              key={note.id}
              note={note}
              onEdit={() => openEdit(note)}
              onDelete={() => deleteNote(note.id)}
              onToggleVisibility={() => toggleVisibility(note)}
              onDetail={() => setDetailNote(note)}
            />
          ))}
        </div>
      )}

      {/* Add / Edit modal */}
      {modalOpen && (
        <NoteFormModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          doctorId={user.id}
          infants={infants}
          editing={editingNote}
          onSaved={(saved) => { onSaved(saved); setModalOpen(false) }}
        />
      )}

      {/* Detail modal */}
      {detailNote && (
        <NoteDetailModal
          note={detailNote}
          onClose={() => setDetailNote(null)}
          onEdit={() => { openEdit(detailNote); setDetailNote(null) }}
        />
      )}
    </div>
  )
}

// ── Note card ─────────────────────────────────────────────────

function NoteCard({ note, onEdit, onDelete, onToggleVisibility, onDetail }) {
  const visitType = VISIT_TYPES.find(v => v.value === note.visit_type)
  const colorClass = VISIT_COLORS[note.visit_type] ?? VISIT_COLORS.routine

  return (
    <div className="group rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:border-brand-300 dark:hover:border-zinc-700 transition-all">
      <div className="p-5">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 cursor-pointer" onClick={onDetail}>
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className={cn('inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full', colorClass)}>
                <Tag size={9} />{visitType?.label ?? note.visit_type}
              </span>
              {note.infant && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-zinc-500">
                  <Baby size={10} />{note.infant.name}
                </span>
              )}
              {note.is_parent_visible ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-green-600 dark:text-green-400">
                  <Eye size={10} />Visible to parent
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 dark:text-zinc-600">
                  <EyeOff size={10} />Hidden
                </span>
              )}
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm leading-snug">{note.title}</h3>
            {note.diagnosis && (
              <p className="text-xs text-slate-500 dark:text-zinc-500 mt-0.5">
                Dx: {note.diagnosis}
              </p>
            )}
          </div>
          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onToggleVisibility}
              title={note.is_parent_visible ? 'Hide from parent' : 'Share with parent'}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-white transition-colors">
              {note.is_parent_visible ? <Eye size={14}/> : <EyeOff size={14}/>}
            </button>
            <button
              onClick={onEdit}
              title="Edit note"
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-white transition-colors">
              <Pencil size={14}/>
            </button>
            <button
              onClick={onDelete}
              title="Delete note"
              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-400 dark:text-zinc-500 hover:text-red-600 dark:hover:text-red-400 transition-colors">
              <Trash2 size={14}/>
            </button>
          </div>
        </div>

        {/* Content preview */}
        <p className="text-sm text-slate-600 dark:text-zinc-400 mt-2 line-clamp-2 leading-relaxed cursor-pointer" onClick={onDetail}>
          {note.content}
        </p>

        {/* Recommendations */}
        {note.recommendations && (
          <div className="mt-3 rounded-lg bg-brand-50 dark:bg-zinc-950 border-l-[3px] border-brand-500 dark:border-brand-600 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-brand-700 dark:text-brand-400 mb-0.5">Recommendations</p>
            <p className="text-xs text-slate-600 dark:text-zinc-400 line-clamp-1">{note.recommendations}</p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-zinc-600">
            <Calendar size={11}/>
            {new Date(note.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            {' · '}
            {new Date(note.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <button onClick={onDetail} className="text-[11px] text-brand-600 dark:text-brand-400 hover:underline font-medium">
            Read more →
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Note form modal ───────────────────────────────────────────

function NoteFormModal({ open, onClose, doctorId, infants, editing, onSaved }) {
  const toast   = useToast()
  const { user } = useAuth()

  const blank = { visit_type: 'routine', title: '', content: '', recommendations: '', diagnosis: '', infant_id: '', is_parent_visible: true }
  const [f,       setF]       = useState(blank)
  const [saving,  setSaving]  = useState(false)
  const [err,     setErr]     = useState('')
  const [tplOpen, setTplOpen] = useState(false)

  useEffect(() => {
    setErr('')
    setF(editing ? {
      visit_type:        editing.visit_type        ?? 'routine',
      title:             editing.title             ?? '',
      content:           editing.content           ?? '',
      recommendations:   editing.recommendations   ?? '',
      diagnosis:         editing.diagnosis         ?? '',
      infant_id:         editing.infant_id         ?? '',
      is_parent_visible: editing.is_parent_visible ?? true,
    } : blank)
  }, [open, editing])

  const applyTemplate = (type) => {
    const tpl = NOTE_TEMPLATES[type]
    if (!tpl) return
    setF(v => ({ ...v, visit_type: type, title: tpl.title, content: tpl.content, recommendations: tpl.recommendations }))
    setTplOpen(false)
  }

  const set = (k, v) => setF(prev => ({ ...prev, [k]: v }))

  const submit = async (e) => {
    e.preventDefault(); setErr('')
    if (!f.title.trim())   { setErr('Title is required.'); return }
    if (!f.content.trim()) { setErr('Note content is required.'); return }
    setSaving(true)
    try {
      let saved
      if (editing) {
        saved = await medicalNoteService.update(editing.id, f)
        toast.success('Note updated')
      } else {
        saved = await medicalNoteService.create({
          ...f,
          doctor_id: user?.id ?? doctorId ?? null,
        })
        toast.success('Note added')
      }
      onSaved(saved)
    } catch (e) {
      setErr(e.message); toast.error(e.message)
    } finally { setSaving(false) }
  }

  return (
    <Modal
      open={open}
      onClose={() => !saving && onClose()}
      title={editing ? 'Edit medical note' : 'Add medical note'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={submit} loading={saving}>{editing ? 'Save changes' : 'Add note'}</Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        {err && (
          <div className="rounded-lg border-l-[3px] border-red-500 bg-red-50 dark:bg-red-500/10 px-4 py-3 flex gap-2.5 text-sm text-red-700 dark:text-red-400">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{err}</span>
          </div>
        )}

        {/* Template picker */}
        {!editing && (
          <div className="rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-wider">Quick templates</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(NOTE_TEMPLATES).map(([type]) => {
                const vt = VISIT_TYPES.find(v => v.value === type)
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => applyTemplate(type)}
                    className="text-xs px-2.5 py-1 rounded-full border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-brand-50 dark:hover:bg-zinc-800 hover:border-brand-300 text-slate-600 dark:text-zinc-400 hover:text-brand-700 dark:hover:text-brand-400 transition-colors">
                    {vt?.label ?? type}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Visit type" required>
            <Select value={f.visit_type} onChange={e => set('visit_type', e.target.value)} disabled={saving}>
              {VISIT_TYPES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
            </Select>
          </Field>
          <Field label="Infant">
            <Select value={f.infant_id} onChange={e => set('infant_id', e.target.value)} disabled={saving}>
              <option value="">— Select infant —</option>
              {infants.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </Select>
          </Field>
        </div>

        <Field label="Title" required>
          <Input
            value={f.title}
            onChange={e => set('title', e.target.value)}
            placeholder="e.g. Routine 3-month checkup"
            disabled={saving}
          />
        </Field>

        <Field label="Diagnosis (optional)">
          <Input
            value={f.diagnosis}
            onChange={e => set('diagnosis', e.target.value)}
            placeholder="e.g. Upper respiratory infection"
            disabled={saving}
          />
        </Field>

        <Field label="Clinical note" required>
          <Textarea
            value={f.content}
            onChange={e => set('content', e.target.value)}
            rows={5}
            placeholder="Observations, history, examination findings…"
            disabled={saving}
          />
        </Field>

        <Field label="Recommendations">
          <Textarea
            value={f.recommendations}
            onChange={e => set('recommendations', e.target.value)}
            rows={3}
            placeholder="Follow-up actions, prescriptions, lifestyle advice…"
            disabled={saving}
          />
        </Field>

        {/* Visibility toggle */}
        <label className="flex items-center gap-3 cursor-pointer select-none rounded-xl border border-slate-200 dark:border-zinc-800 p-3 hover:bg-slate-50 dark:hover:bg-zinc-950 transition-colors">
          <div
            onClick={() => set('is_parent_visible', !f.is_parent_visible)}
            className={cn(
              'relative w-9 h-5 rounded-full transition-colors',
              f.is_parent_visible ? 'bg-brand-600' : 'bg-slate-300 dark:bg-zinc-700'
            )}>
            <span className={cn(
              'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all',
              f.is_parent_visible ? 'left-4' : 'left-0.5'
            )} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {f.is_parent_visible ? 'Visible to parent' : 'Hidden from parent'}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-zinc-500">
              {f.is_parent_visible
                ? 'Parent can read this note in the app'
                : 'Note is private — only you and admins can see it'}
            </p>
          </div>
        </label>
      </form>
    </Modal>
  )
}

// ── Note detail modal ─────────────────────────────────────────

function NoteDetailModal({ note, onClose, onEdit }) {
  const visitType  = VISIT_TYPES.find(v => v.value === note.visit_type)
  const colorClass = VISIT_COLORS[note.visit_type] ?? VISIT_COLORS.routine

  return (
    <Modal open={!!note} onClose={onClose} title="Medical note" size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <Button onClick={onEdit}><Pencil size={13}/> Edit note</Button>
        </>
      }>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <span className={cn('inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full', colorClass)}>
            <Tag size={11}/>{visitType?.label ?? note.visit_type}
          </span>
          {note.infant && (
            <span className="inline-flex items-center gap-1 text-xs font-medium bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 px-2.5 py-1 rounded-full">
              <Baby size={11}/>{note.infant.name}
            </span>
          )}
          <span className={cn(
            'inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full',
            note.is_parent_visible
              ? 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400'
              : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-500'
          )}>
            {note.is_parent_visible ? <><Eye size={11}/>Visible to parent</> : <><EyeOff size={11}/>Hidden</>}
          </span>
        </div>

        <div>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">{note.title}</h2>
          {note.diagnosis && (
            <p className="text-sm text-slate-500 dark:text-zinc-500 mt-0.5">
              Diagnosis: <span className="font-medium text-slate-700 dark:text-zinc-300">{note.diagnosis}</span>
            </p>
          )}
          <p className="text-[11px] text-slate-400 dark:text-zinc-600 mt-1">
            {note.doctor?.full_name ? `Dr. ${note.doctor.full_name}` : 'Unknown doctor'}
            {' · '}
            {new Date(note.created_at).toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' })}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 p-4">
          <p className="text-sm text-slate-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line">{note.content}</p>
        </div>

        {note.recommendations && (
          <div className="rounded-xl bg-brand-50 dark:bg-zinc-950 border-l-4 border-brand-500 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-brand-700 dark:text-brand-400 mb-1">Recommendations</p>
            <p className="text-sm text-slate-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line">{note.recommendations}</p>
          </div>
        )}
      </div>
    </Modal>
  )
}
