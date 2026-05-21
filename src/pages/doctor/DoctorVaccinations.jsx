// src/pages/doctor/DoctorVaccinations.jsx
//
// Table view of all vaccinations across the doctor's infants.
// Filters by status; mark-administered inline.

import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Syringe, Check, RefreshCw, ChevronRight, AlertTriangle } from 'lucide-react'
import { useAuth }  from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import { supabase } from '../../supabaseClient'
import { vaccinationService } from '../../services/vaccinationService'

import StatusBadge from '../../components/StatusBadge'
import EmptyState  from '../../components/EmptyState'
import Button      from '../../components/ui/Button'
import { SkeletonRow } from '../../components/ui/Skeleton'

export default function DoctorVaccinations() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState('upcoming')   // upcoming | overdue | administered | all

  const load = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      // Pull all vaccinations belonging to this doctor's infants. Done with
      // a join + RLS, since vaccinationService.upcoming is filtered for the
      // dashboard widget.
      let q = supabase
        .from('vaccinations')
        .select('*, infant:infant_id(id, name, doctor_id)')
        .order('scheduled_date', { ascending: true })
      const { data, error } = await q
      if (error) throw error
      let result = (data ?? []).filter(v => v.infant?.doctor_id === user.id)

      const today = new Date().toISOString().slice(0, 10)
      if (filter === 'upcoming') {
        result = result.filter(v => v.status === 'scheduled' && (!v.scheduled_date || v.scheduled_date >= today))
      } else if (filter === 'overdue') {
        result = result.filter(v => v.status === 'scheduled' && v.scheduled_date && v.scheduled_date < today)
      } else if (filter === 'administered') {
        result = result.filter(v => v.status === 'administered')
      }
      setRows(result)
    } catch (err) {
      toast.error(err.message ?? 'Could not load vaccinations')
    } finally {
      setLoading(false)
    }
  }, [user, filter, toast])

  useEffect(() => { load() }, [load])

  const markDone = async (id) => {
    try {
      await vaccinationService.markAdministered(id)
      toast.success('Marked as administered')
      load()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const today = new Date().toISOString().slice(0, 10)

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Vaccinations</h1>
          <p className="text-sm text-slate-500 dark:text-zinc-500 mt-1">Schedule and administration across your infants.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </Button>
      </div>

      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-zinc-800 flex items-center gap-2 flex-wrap">
          {[
            { key: 'upcoming',     label: 'Upcoming' },
            { key: 'overdue',      label: 'Overdue' },
            { key: 'administered', label: 'Administered' },
            { key: 'all',          label: 'All' },
          ].map(t => (
            <button key={t.key} onClick={() => setFilter(t.key)}
              className={'px-3 h-9 rounded-full text-xs font-semibold transition border ' +
                (filter === t.key
                  ? 'bg-brand-700 text-white border-brand-700 dark:bg-white dark:text-black dark:border-white'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800 dark:hover:bg-zinc-800')}>
              {t.label}
            </button>
          ))}
          <span className="ml-auto text-xs text-slate-500 dark:text-zinc-500">{rows.length} record{rows.length === 1 ? '' : 's'}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-zinc-950">
                <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-500">Vaccine</th>
                <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-500">Infant</th>
                <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-500">Scheduled</th>
                <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-500">Status</th>
                <th className="text-right px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
              {loading ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={5} />)
              : rows.length === 0 ? (
                <tr><td colSpan={5}>
                  <EmptyState icon={Syringe} title="Nothing here" description="Try a different filter." />
                </td></tr>
              ) : rows.map(v => {
                const isOverdue = v.status === 'scheduled' && v.scheduled_date && v.scheduled_date < today
                return (
                  <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-zinc-950 transition">
                    <td className="px-5 py-3.5 font-semibold text-slate-900 dark:text-white">{v.vaccine_name}</td>
                    <td className="px-5 py-3.5">
                      <button onClick={() => navigate(`/doctor/infants/${v.infant?.id}`)} className="inline-flex items-center gap-1 text-brand-700 dark:text-white hover:underline">
                        {v.infant?.name ?? '—'}<ChevronRight size={12} />
                      </button>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-zinc-300">
                      {v.scheduled_date ? new Date(v.scheduled_date).toLocaleDateString() : '—'}
                      {isOverdue && (
                        <span className="ml-2 inline-flex items-center gap-1 text-[11px] font-bold text-red-600 dark:text-red-400">
                          <AlertTriangle size={11} /> overdue
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={v.status === 'administered' ? 'completed' : (isOverdue ? 'overdue' : v.status)} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {v.status !== 'administered' && (
                        <Button size="xs" onClick={() => markDone(v.id)}><Check size={12} /> Mark done</Button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
