// src/pages/doctor/DoctorInfants.jsx
import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Baby, RefreshCw, AlertCircle } from 'lucide-react'
import { useAuth }  from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import { infantService }  from '../../services/infantService'
import { patientService } from '../../services/patientService'

import InfantCard from '../../components/InfantCard'
import EmptyState from '../../components/EmptyState'
import Button     from '../../components/ui/Button'
import Modal      from '../../components/ui/Modal'
import { Field, Input, Select } from '../../components/ui/Field'
import { Skeleton } from '../../components/ui/Skeleton'

const PAGE_SIZE = 12
const EMPTY_FORM = {
  mother_id: '', name: '', date_of_birth: '', gender: 'male',
  birth_weight_kg: '', birth_height_cm: '', blood_type: '', notes: '', status: 'monitoring',
}

export default function DoctorInfants() {
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [rows,    setRows]    = useState([])
  const [total,   setTotal]   = useState(0)
  const [page,    setPage]    = useState(1)
  const [search,  setSearch]  = useState('')
  const [status,  setStatus]  = useState('all')
  const [loading, setLoading] = useState(true)
  const [patients, setPatients] = useState([])

  const [modalOpen, setModalOpen] = useState(false)
  const [form,      setForm]      = useState(EMPTY_FORM)
  const [saving,    setSaving]    = useState(false)
  const [formError, setFormError] = useState('')

  const load = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const { rows, total } = await infantService.list({ doctorId: user.id, search, status, page, pageSize: PAGE_SIZE })
      setRows(rows); setTotal(total)
    } catch (err) {
      toast.error(err.message ?? 'Could not load infants')
    } finally {
      setLoading(false)
    }
  }, [user, search, status, page, toast])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [search, status])
  useEffect(() => {
    if (!user?.id) return
    patientService.list({ doctorId: user.id, pageSize: 1000 })
      .then(({ rows }) => setPatients(rows))
      .catch(() => {})
  }, [user])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const submit = async (e) => {
    e.preventDefault(); setFormError('')
    if (!form.name.trim()) return setFormError('Name is required.')
    setSaving(true)
    try {
      await infantService.create({ ...form, mother_id: form.mother_id || null, doctor_id: user.id })
      await load()
      toast.success('Infant added')
      setModalOpen(false); setForm(EMPTY_FORM)
    } catch (err) {
      setFormError(err.message); toast.error(err.message)
    } finally { setSaving(false) }
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Infants</h1>
          <p className="text-sm text-slate-500 dark:text-zinc-500 mt-1">Infants under your care.</p>
        </div>
        <Button onClick={() => { setForm(EMPTY_FORM); setFormError(''); setModalOpen(true) }}><Plus size={14} /> Add infant</Button>
      </div>

      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 sm:p-5 mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name…"
            className="block w-full h-10 pl-9 pr-3 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-800 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 outline-none text-slate-900 dark:text-white" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {['all', 'monitoring', 'healthy', 'at_risk', 'critical'].map(s => (
            <button key={s} onClick={() => setStatus(s)}
              className={'px-3 h-9 rounded-full text-xs font-semibold capitalize transition border ' +
                (status === s ? 'bg-brand-700 text-white border-brand-700 dark:bg-white dark:text-black dark:border-white' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800 dark:hover:bg-zinc-800')}>{s.replace('_', ' ')}</button>
          ))}
          <Button variant="ghost" size="sm" onClick={load} disabled={loading}><RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh</Button>
          <span className="text-xs text-slate-500 dark:text-zinc-500 sm:ml-auto whitespace-nowrap">{total} total</span>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={Baby} title={search ? 'No matches' : 'No infants yet'} description={search ? 'Try a different search.' : 'Click "Add infant" to register the first one.'} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map(i => <InfantCard key={i.id} infant={i} onClick={() => navigate(`/doctor/infants/${i.id}`)} />)}
        </div>
      )}

      {!loading && total > 0 && (
        <div className="mt-5 flex items-center justify-between">
          <div className="text-xs text-slate-500 dark:text-zinc-500">Page {page} of {totalPages}</div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</Button>
            <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</Button>
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => !saving && setModalOpen(false)} title="Register new infant" size="lg"
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button><Button onClick={submit} loading={saving}>Add infant</Button></>}>
        <form onSubmit={submit}>
          {formError && <div className="rounded-lg border-l-[3px] border-red-500 bg-red-50 dark:bg-red-500/10 px-4 py-3 flex gap-2.5 text-sm text-red-700 dark:text-red-400 mb-4"><AlertCircle size={16} /><span>{formError}</span></div>}
          <Field label="Name" required><Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} disabled={saving} /></Field>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Date of birth"><Input type="date" value={form.date_of_birth} onChange={(e) => setForm(f => ({ ...f, date_of_birth: e.target.value }))} disabled={saving} /></Field>
            <Field label="Gender">
              <Select value={form.gender} onChange={(e) => setForm(f => ({ ...f, gender: e.target.value }))} disabled={saving}>
                <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
              </Select>
            </Field>
            <Field label="Blood type"><Input value={form.blood_type} onChange={(e) => setForm(f => ({ ...f, blood_type: e.target.value }))} placeholder="e.g. O+" disabled={saving} /></Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Birth weight (kg)"><Input type="number" step="0.001" value={form.birth_weight_kg} onChange={(e) => setForm(f => ({ ...f, birth_weight_kg: e.target.value }))} disabled={saving} /></Field>
            <Field label="Birth height (cm)"><Input type="number" step="0.1" value={form.birth_height_cm} onChange={(e) => setForm(f => ({ ...f, birth_height_cm: e.target.value }))} disabled={saving} /></Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Mother (your patient)">
              <Select value={form.mother_id} onChange={(e) => setForm(f => ({ ...f, mother_id: e.target.value }))} disabled={saving}>
                <option value="">— Unknown —</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </Select>
            </Field>
            <Field label="Status">
              <Select value={form.status} onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))} disabled={saving}>
                <option value="monitoring">Monitoring</option><option value="healthy">Healthy</option>
                <option value="at_risk">At risk</option><option value="critical">Critical</option>
              </Select>
            </Field>
          </div>
        </form>
      </Modal>
    </>
  )
}
