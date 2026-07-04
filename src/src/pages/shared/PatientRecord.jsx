// src/pages/shared/PatientRecord.jsx
//
// Phase 3 feature #6 — the doctor's view of a mother's postpartum journey.
// Reachable at /doctor/patients/:id (and reused for /admin/patients/:id if
// you ever wire admin access). Tabs surface each Phase 3 stream:
//   Overview, Vitals, Mood, Breastfeeding, Medications, Checkups.
//
// All reads scope by parent_id; doctor-side RLS (is_doctor_of) ensures the
// signed-in doctor can only fetch their own patients.

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Heart, Smile, Droplet, Pill, Calendar, FileText,
  Activity, AlertCircle, Plus, Check, Pencil,
} from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts'

import { useToast } from '../../hooks/useToast'
import { patientService }      from '../../services/patientService'
import { motherHealthService } from '../../services/motherHealthService'

import Avatar     from '../../components/ui/Avatar'
import Button     from '../../components/ui/Button'
import Modal      from '../../components/ui/Modal'
import { Field, Input, Select } from '../../components/ui/Field'
import EmptyState from '../../components/EmptyState'
import { Skeleton, SkeletonStatCard } from '../../components/ui/Skeleton'
import { cn } from '../../utils/cn'

// ──────────────────────────────────────────────────────────────────────
//  Helpers
// ──────────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'overview',      label: 'Overview',      icon: Activity },
  { key: 'vitals',        label: 'Vitals',        icon: Heart },
  { key: 'mood',          label: 'Mood',          icon: Smile },
  { key: 'breastfeeding', label: 'Breastfeeding', icon: Droplet },
  { key: 'medications',   label: 'Medications',   icon: Pill },
  { key: 'checkups',      label: 'Checkups',      icon: Calendar },
]

const CHECKUP_TYPES = [
  { value: '2_week',  label: '2-Week Checkup' },
  { value: '6_week',  label: '6-Week Checkup' },
  { value: '3_month', label: '3-Month Checkup' },
  { value: 'custom',  label: 'Custom Visit' },
]

/** EPDS-style score → severity bucket. Matches the mobile MoodLog.level. */
function moodLevel(score) {
  if (score == null) return null
  if (score <= 8)  return { label: 'Stable',       tone: 'good' }
  if (score <= 12) return { label: 'Mild',         tone: 'mild' }
  if (score <= 18) return { label: 'Moderate',     tone: 'moderate' }
  return            { label: 'Needs support',     tone: 'high' }
}

const moodToneClasses = {
  good:     'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  mild:     'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  moderate: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  high:     'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
}

function fmtDateTime(s) {
  if (!s) return '—'
  const d = new Date(s)
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

function fmtDate(s) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

// ──────────────────────────────────────────────────────────────────────
//  Component
// ──────────────────────────────────────────────────────────────────────

export default function PatientRecord() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [tab, setTab] = useState('overview')
  const [patient, setPatient] = useState(null)
  const [loading, setLoading] = useState(true)

  // Phase 3 data
  const [vitals,       setVitals]       = useState([])
  const [moodLogs,     setMoodLogs]     = useState([])
  const [breastfeeds,  setBreastfeeds]  = useState([])
  const [medications,  setMedications]  = useState([])
  const [intake,       setIntake]       = useState([])
  const [checkups,     setCheckups]     = useState([])
  const [questions,    setQuestions]    = useState([])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const [p, v, m, bf, med, ki, ch, q] = await Promise.all([
          patientService.getById(id),
          motherHealthService.listVitals(id),
          motherHealthService.listMoodLogs(id),
          motherHealthService.listBreastfeeding(id),
          motherHealthService.listMedications(id),
          motherHealthService.listIntakeRecent(id, { days: 14 }),
          motherHealthService.listCheckups(id),
          motherHealthService.listQuestions(id),
        ])
        if (cancelled) return
        setPatient(p)
        setVitals(v)
        setMoodLogs(m)
        setBreastfeeds(bf)
        setMedications(med)
        setIntake(ki)
        setCheckups(ch)
        setQuestions(q)
      } catch (err) {
        if (!cancelled) toast.error(err.message ?? 'Could not load patient record')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [id, toast])

  // Refresh helpers used by mutating tabs.
  const refreshCheckups = async () => setCheckups(await motherHealthService.listCheckups(id))

  // ── Loading / empty ──
  if (loading) {
    return (
      <>
        <Skeleton className="h-10 w-40 mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <SkeletonStatCard /><SkeletonStatCard /><SkeletonStatCard />
        </div>
        <Skeleton className="h-96 w-full" />
      </>
    )
  }
  if (!patient) {
    return (
      <EmptyState
        title="Patient not found"
        description="The record may have been deleted or you don't have access."
      />
    )
  }

  // ── Derived stats for the Overview / banners ──
  const latestVital = vitals[0]
  const latestMood  = moodLogs[0]
  const recentMoodAvg = moodLogs.slice(0, 7).reduce((sum, l) => sum + l.score, 0) /
                        Math.max(1, Math.min(7, moodLogs.length))
  const moodFlag = recentMoodAvg > 12 ? moodLevel(recentMoodAvg) : null

  // Latest EPDS screening = a mood_logs row with the 🧠 emoji.
  const latestEpds = moodLogs.find((l) => l.mood_emoji === '🧠')

  // Adherence over the last 14 days = taken intake rows / scheduled rows.
  const adherence = useMemo(() => {
    if (intake.length === 0) return null
    const taken = intake.filter((i) => i.taken_at).length
    return Math.round((taken / intake.length) * 100)
  }, [intake])

  return (
    <>
      <button
        onClick={() => navigate('/doctor/patients')}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white mb-5 transition"
      >
        <ArrowLeft size={15} /> Back to patients
      </button>

      {/* Identity card */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 sm:p-6 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Avatar name={patient.full_name} src={patient.avatar_url} size="xl" />
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {patient.full_name ?? 'Unnamed patient'}
            </h1>
            <div className="text-sm text-slate-500 dark:text-zinc-500 mt-0.5">
              {patient.email ?? '—'}{patient.phone ? ` · ${patient.phone}` : ''}
            </div>
            {patient.infants?.length > 0 && (
              <div className="text-xs text-slate-500 dark:text-zinc-500 mt-2">
                {patient.infants.length} {patient.infants.length === 1 ? 'infant' : 'infants'} ·{' '}
                {patient.infants.map((b) => b.name).filter(Boolean).join(', ')}
              </div>
            )}
          </div>
          {moodFlag && (
            <div className={cn(
              'rounded-xl px-3 py-2 text-xs font-semibold inline-flex items-center gap-1.5',
              moodToneClasses[moodFlag.tone],
            )}>
              <AlertCircle size={14} /> Mood: {moodFlag.label}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-5 border-b border-slate-200 dark:border-zinc-800">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-2.5 -mb-px text-sm font-semibold transition',
              tab === t.key
                ? 'text-rose-600 border-b-2 border-rose-600 dark:text-rose-400 dark:border-rose-400'
                : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white border-b-2 border-transparent',
            )}
          >
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <OverviewTab
          latestVital={latestVital}
          latestMood={latestMood}
          latestEpds={latestEpds}
          adherence={adherence}
          checkups={checkups}
          questions={questions}
        />
      )}
      {tab === 'vitals'        && <VitalsTab vitals={vitals} />}
      {tab === 'mood'          && <MoodTab logs={moodLogs} />}
      {tab === 'breastfeeding' && <BreastfeedingTab sessions={breastfeeds} />}
      {tab === 'medications'   && <MedicationsTab meds={medications} intake={intake} adherence={adherence} />}
      {tab === 'checkups'      && (
        <CheckupsTab
          patientId={id}
          checkups={checkups}
          questions={questions}
          onChange={refreshCheckups}
        />
      )}
    </>
  )
}

// ──────────────────────────────────────────────────────────────────────
//  Overview
// ──────────────────────────────────────────────────────────────────────

function OverviewTab({ latestVital, latestMood, latestEpds, adherence, checkups, questions }) {
  const nextCheckup = checkups.find((c) => c.status === 'upcoming')
  const openQuestions = questions.filter((q) => !q.is_done)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <StatCard
        icon={Heart}
        label="Latest vitals"
        value={
          latestVital && latestVital.systolic_bp != null && latestVital.diastolic_bp != null
            ? `${latestVital.systolic_bp}/${latestVital.diastolic_bp} mmHg`
            : '—'
        }
        sub={latestVital ? fmtDateTime(latestVital.recorded_at) : 'No reading yet'}
      />
      <StatCard
        icon={Smile}
        label="Latest mood"
        value={latestMood ? `${latestMood.score}/30 ${latestMood.mood_emoji ?? ''}` : '—'}
        sub={latestMood ? fmtDateTime(latestMood.logged_at) : 'No mood log yet'}
      />
      <StatCard
        icon={Pill}
        label="14-day adherence"
        value={adherence != null ? `${adherence}%` : '—'}
        sub={adherence != null ? 'Medication intake' : 'No intake logged yet'}
      />

      {/* EPDS */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 lg:col-span-2">
        <h3 className="text-sm font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wide mb-2">
          Latest EPDS screening
        </h3>
        {latestEpds ? (
          <>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {latestEpds.score}<span className="text-base font-semibold text-slate-400">/30</span>
            </div>
            <div className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold mt-2',
              moodToneClasses[moodLevel(latestEpds.score)?.tone ?? 'good'],
            )}>
              {moodLevel(latestEpds.score)?.label}
            </div>
            {latestEpds.note && (
              <p className="text-sm text-slate-600 dark:text-zinc-400 mt-3">
                {latestEpds.note}
              </p>
            )}
            <p className="text-xs text-slate-500 dark:text-zinc-500 mt-2">
              Submitted {fmtDateTime(latestEpds.logged_at)}
            </p>
          </>
        ) : (
          <p className="text-sm text-slate-500 dark:text-zinc-500">
            No EPDS screening on record yet.
          </p>
        )}
      </div>

      {/* Next checkup + questions */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5">
        <h3 className="text-sm font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wide mb-2">
          Next checkup
        </h3>
        {nextCheckup ? (
          <>
            <div className="font-bold text-slate-900 dark:text-white">
              {CHECKUP_TYPES.find((t) => t.value === nextCheckup.checkup_type)?.label ?? nextCheckup.checkup_type}
            </div>
            <div className="text-sm text-slate-500 dark:text-zinc-500">
              {nextCheckup.scheduled_at ? fmtDateTime(nextCheckup.scheduled_at) : 'Date TBD'}
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-500 dark:text-zinc-500">No upcoming visit.</p>
        )}
        {openQuestions.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-zinc-800">
            <div className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wide mb-1.5">
              Patient has {openQuestions.length} open question{openQuestions.length === 1 ? '' : 's'}
            </div>
            <ul className="space-y-1 text-sm text-slate-700 dark:text-zinc-300">
              {openQuestions.slice(0, 3).map((q) => (
                <li key={q.id} className="line-clamp-2">• {q.question}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wide">
        <Icon size={15} /> {label}
      </div>
      <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2">{value}</div>
      <div className="text-xs text-slate-500 dark:text-zinc-500 mt-1">{sub}</div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
//  Vitals
// ──────────────────────────────────────────────────────────────────────

function VitalsTab({ vitals }) {
  if (vitals.length === 0) {
    return <EmptyState title="No vitals logged" description="The patient hasn't recorded any vitals yet." />
  }
  // Chart wants oldest → newest, with bp present.
  const chartData = [...vitals]
    .filter((v) => v.systolic_bp != null && v.diastolic_bp != null)
    .reverse()
    .map((v) => ({
      date: new Date(v.recorded_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      sys: v.systolic_bp,
      dia: v.diastolic_bp,
    }))

  return (
    <div className="space-y-5">
      {chartData.length >= 2 && (
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5">
          <h3 className="font-bold text-slate-900 dark:text-white mb-3">Blood pressure trend</h3>
          <div className="h-72">
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-zinc-800" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="sys" name="Systolic"  stroke="#e11d48" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="dia" name="Diastolic" stroke="#fb7185" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-zinc-800/50 text-slate-600 dark:text-zinc-400 text-left">
            <tr>
              <th className="px-4 py-2.5 font-semibold">When</th>
              <th className="px-4 py-2.5 font-semibold">BP (mmHg)</th>
              <th className="px-4 py-2.5 font-semibold">Weight (kg)</th>
              <th className="px-4 py-2.5 font-semibold">Temp (°C)</th>
              <th className="px-4 py-2.5 font-semibold">HR (bpm)</th>
              <th className="px-4 py-2.5 font-semibold">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-zinc-800">
            {vitals.map((v) => (
              <tr key={v.id} className="text-slate-900 dark:text-zinc-200">
                <td className="px-4 py-2.5">{fmtDateTime(v.recorded_at)}</td>
                <td className="px-4 py-2.5">
                  {v.systolic_bp != null && v.diastolic_bp != null
                    ? `${v.systolic_bp}/${v.diastolic_bp}`
                    : '—'}
                </td>
                <td className="px-4 py-2.5">{v.weight_kg ?? '—'}</td>
                <td className="px-4 py-2.5">{v.temperature_c ?? '—'}</td>
                <td className="px-4 py-2.5">{v.heart_rate ?? '—'}</td>
                <td className="px-4 py-2.5 text-slate-500 dark:text-zinc-500">{v.notes ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
//  Mood
// ──────────────────────────────────────────────────────────────────────

function MoodTab({ logs }) {
  if (logs.length === 0) {
    return <EmptyState title="No mood logs" description="The patient hasn't done a check-in or screening yet." />
  }

  // Daily worst score over the last 14 days.
  const today = new Date()
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (13 - i))
    return d
  })
  const dailyMax = days.map((d) => {
    const sameDay = logs.filter((l) => {
      const ld = new Date(l.logged_at)
      return ld.getFullYear() === d.getFullYear() &&
             ld.getMonth()    === d.getMonth() &&
             ld.getDate()     === d.getDate()
    })
    return {
      date: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      score: sameDay.length ? Math.max(...sameDay.map((l) => l.score)) : null,
    }
  })

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5">
        <h3 className="font-bold text-slate-900 dark:text-white mb-1">Mood trend</h3>
        <p className="text-xs text-slate-500 dark:text-zinc-500 mb-3">
          Last 14 days · worst score per day · lower is healthier (0 = good, 30 = severe)
        </p>
        <div className="h-64">
          <ResponsiveContainer>
            <BarChart data={dailyMax}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-zinc-800" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis domain={[0, 30]} className="text-xs" />
              <Tooltip />
              <Bar dataKey="score" fill="#e11d48" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-zinc-800/50 text-slate-600 dark:text-zinc-400 text-left">
            <tr>
              <th className="px-4 py-2.5 font-semibold">When</th>
              <th className="px-4 py-2.5 font-semibold">Mood</th>
              <th className="px-4 py-2.5 font-semibold">Score</th>
              <th className="px-4 py-2.5 font-semibold">Level</th>
              <th className="px-4 py-2.5 font-semibold">Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-zinc-800">
            {logs.map((l) => {
              const lvl = moodLevel(l.score)
              const isEpds = l.mood_emoji === '🧠'
              return (
                <tr key={l.id} className="text-slate-900 dark:text-zinc-200">
                  <td className="px-4 py-2.5">{fmtDateTime(l.logged_at)}</td>
                  <td className="px-4 py-2.5">
                    <span className="text-lg mr-1.5">{l.mood_emoji}</span>
                    {isEpds && (
                      <span className="text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/30 rounded-full px-2 py-0.5">
                        EPDS
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 font-semibold">{l.score}/30</td>
                  <td className="px-4 py-2.5">
                    {lvl && (
                      <span className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
                        moodToneClasses[lvl.tone],
                      )}>
                        {lvl.label}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-slate-500 dark:text-zinc-500">{l.note ?? ''}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
//  Breastfeeding
// ──────────────────────────────────────────────────────────────────────

function BreastfeedingTab({ sessions }) {
  if (sessions.length === 0) {
    return <EmptyState title="No feeding sessions" description="No breastfeeding or pump sessions have been logged." />
  }

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const todays = sessions.filter((s) => new Date(s.started_at) >= today)
  const todayTotalMl = todays.reduce((sum, s) => sum + (s.amount_ml ?? 0), 0)
  const todayMinutes = todays.reduce((sum, s) => sum + (s.duration_min ?? 0), 0)

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={Droplet}  label="Today · sessions" value={todays.length} sub="" />
        <StatCard icon={Droplet}  label="Today · volume"   value={`${todayTotalMl} ml`} sub="Pumped output" />
        <StatCard icon={Activity} label="Today · minutes"  value={`${todayMinutes}`}    sub="Nursing duration" />
      </div>

      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-zinc-800/50 text-slate-600 dark:text-zinc-400 text-left">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Started</th>
              <th className="px-4 py-2.5 font-semibold">Side</th>
              <th className="px-4 py-2.5 font-semibold">Duration</th>
              <th className="px-4 py-2.5 font-semibold">Volume</th>
              <th className="px-4 py-2.5 font-semibold">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-zinc-800">
            {sessions.map((s) => (
              <tr key={s.id} className="text-slate-900 dark:text-zinc-200">
                <td className="px-4 py-2.5">{fmtDateTime(s.started_at)}</td>
                <td className="px-4 py-2.5 capitalize">{s.side}</td>
                <td className="px-4 py-2.5">{s.duration_min != null ? `${s.duration_min} min` : '—'}</td>
                <td className="px-4 py-2.5">{s.amount_ml != null ? `${s.amount_ml} ml` : '—'}</td>
                <td className="px-4 py-2.5 text-slate-500 dark:text-zinc-500">{s.notes ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
//  Medications
// ──────────────────────────────────────────────────────────────────────

function MedicationsTab({ meds, intake, adherence }) {
  if (meds.length === 0) {
    return <EmptyState title="No medications" description="The patient hasn't added any reminders yet." />
  }

  // Per-medication adherence over the period covered by `intake`.
  const perMed = meds.map((m) => {
    const its = intake.filter((i) => i.reminder_id === m.id)
    if (its.length === 0) return { ...m, adherence: null, taken: 0, scheduled: 0 }
    const taken = its.filter((i) => i.taken_at).length
    return { ...m, adherence: Math.round((taken / its.length) * 100), taken, scheduled: its.length }
  })

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={Pill}     label="Active medications" value={meds.filter((m) => m.is_active).length} sub="" />
        <StatCard icon={Activity} label="14-day adherence"   value={adherence != null ? `${adherence}%` : '—'} sub="Across all meds" />
        <StatCard icon={AlertCircle} label="Side-effect notes"
          value={intake.filter((i) => i.symptom_note).length} sub="From the patient" />
      </div>

      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-zinc-800/50 text-slate-600 dark:text-zinc-400 text-left">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Medication</th>
              <th className="px-4 py-2.5 font-semibold">Dose</th>
              <th className="px-4 py-2.5 font-semibold">When</th>
              <th className="px-4 py-2.5 font-semibold">Frequency</th>
              <th className="px-4 py-2.5 font-semibold">Status</th>
              <th className="px-4 py-2.5 font-semibold">Adherence (14d)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-zinc-800">
            {perMed.map((m) => (
              <tr key={m.id} className="text-slate-900 dark:text-zinc-200">
                <td className="px-4 py-2.5 font-semibold">{m.name}</td>
                <td className="px-4 py-2.5">{m.dosage ?? '—'}</td>
                <td className="px-4 py-2.5">{m.reminder_time?.slice(0, 5) ?? '—'}</td>
                <td className="px-4 py-2.5 capitalize">{m.frequency?.replace('_', ' ')}</td>
                <td className="px-4 py-2.5">
                  <span className={cn(
                    'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
                    m.is_active
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400',
                  )}>
                    {m.is_active ? 'Active' : 'Paused'}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  {m.adherence != null ? `${m.adherence}% (${m.taken}/${m.scheduled})` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
//  Checkups (with create / edit notes)
// ──────────────────────────────────────────────────────────────────────

function CheckupsTab({ patientId, checkups, questions, onChange }) {
  const toast = useToast()
  const [scheduleOpen, setScheduleOpen]   = useState(false)
  const [editing,      setEditing]        = useState(null) // checkup row

  const openQuestions = questions.filter((q) => !q.is_done)
  const doneQuestions = questions.filter((q) =>  q.is_done)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-900 dark:text-white">Postpartum visits</h3>
        <Button onClick={() => setScheduleOpen(true)} className="inline-flex items-center gap-1.5">
          <Plus size={15} /> Schedule visit
        </Button>
      </div>

      {checkups.length === 0 ? (
        <EmptyState title="No visits scheduled" description="Schedule a 2-week, 6-week, or custom visit for this patient." />
      ) : (
        <ul className="space-y-3">
          {checkups.map((c) => (
            <li
              key={c.id}
              className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4"
            >
              <div className="flex items-start gap-3">
                <div className="font-extrabold text-rose-600 dark:text-rose-400">
                  {CHECKUP_TYPES.find((t) => t.value === c.checkup_type)?.label ?? c.checkup_type}
                </div>
                <span className={cn(
                  'ml-auto inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
                  c.status === 'completed'
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                    : c.status === 'missed'
                    ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                    : 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
                )}>
                  {c.status}
                </span>
              </div>
              <div className="text-sm text-slate-600 dark:text-zinc-400 mt-1">
                {c.scheduled_at ? fmtDateTime(c.scheduled_at) : 'Date TBD'}
                {c.completed_at && ` · completed ${fmtDate(c.completed_at)}`}
              </div>
              {c.doctor_notes && (
                <p className="text-sm text-slate-700 dark:text-zinc-300 mt-2 whitespace-pre-wrap">
                  {c.doctor_notes}
                </p>
              )}
              <div className="flex gap-2 mt-3">
                <Button variant="outline" size="sm" onClick={() => setEditing(c)} className="inline-flex items-center gap-1.5">
                  <Pencil size={13} /> Edit notes
                </Button>
                {c.status === 'upcoming' && (
                  <Button
                    variant="outline" size="sm"
                    onClick={async () => {
                      try {
                        await motherHealthService.markCheckupCompleted(c.id)
                        toast.success('Marked as completed')
                        onChange()
                      } catch (err) {
                        toast.error(err.message ?? 'Could not update')
                      }
                    }}
                    className="inline-flex items-center gap-1.5"
                  >
                    <Check size={13} /> Mark completed
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Questions the patient prepared */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5">
        <h3 className="font-bold text-slate-900 dark:text-white mb-1">Patient's questions</h3>
        <p className="text-xs text-slate-500 dark:text-zinc-500 mb-3">
          What this patient has noted to ask at her next visit.
        </p>
        {questions.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-zinc-500">None yet.</p>
        ) : (
          <>
            {openQuestions.length > 0 && (
              <ul className="space-y-1.5 text-sm text-slate-900 dark:text-zinc-100 mb-3">
                {openQuestions.map((q) => (
                  <li key={q.id} className="flex gap-2"><span>•</span><span>{q.question}</span></li>
                ))}
              </ul>
            )}
            {doneQuestions.length > 0 && (
              <details className="text-sm text-slate-500 dark:text-zinc-500">
                <summary className="cursor-pointer font-semibold">{doneQuestions.length} already addressed</summary>
                <ul className="space-y-1.5 mt-2">
                  {doneQuestions.map((q) => (
                    <li key={q.id} className="flex gap-2 line-through"><span>•</span><span>{q.question}</span></li>
                  ))}
                </ul>
              </details>
            )}
          </>
        )}
      </div>

      {scheduleOpen && (
        <ScheduleCheckupModal
          patientId={patientId}
          onClose={() => setScheduleOpen(false)}
          onSaved={() => { setScheduleOpen(false); onChange() }}
        />
      )}
      {editing && (
        <EditNotesModal
          checkup={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); onChange() }}
        />
      )}
    </div>
  )
}

function ScheduleCheckupModal({ patientId, onClose, onSaved }) {
  const toast = useToast()
  const [type, setType] = useState('2_week')
  const [when, setWhen] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      await motherHealthService.createCheckup({
        parent_id: patientId,
        checkup_type: type,
        scheduled_at: when ? new Date(when).toISOString() : null,
        doctor_notes: notes,
      })
      toast.success('Visit scheduled')
      onSaved()
    } catch (err) {
      toast.error(err.message ?? 'Could not schedule visit')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title="Schedule visit">
      <div className="space-y-4">
        <Field label="Visit type">
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            {CHECKUP_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </Select>
        </Field>
        <Field label="When">
          <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        </Field>
        <Field label="Notes (optional)">
          <textarea
            className="w-full rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What you want to cover in this visit."
          />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Schedule'}</Button>
        </div>
      </div>
    </Modal>
  )
}

function EditNotesModal({ checkup, onClose, onSaved }) {
  const toast = useToast()
  const [notes, setNotes] = useState(checkup.doctor_notes ?? '')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      await motherHealthService.updateCheckup(checkup.id, { doctor_notes: notes })
      toast.success('Notes saved')
      onSaved()
    } catch (err) {
      toast.error(err.message ?? 'Could not save notes')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title="Edit doctor's notes">
      <div className="space-y-4">
        <textarea
          className="w-full rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
          rows={6}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Visible to the patient in the mobile app."
          autoFocus
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save notes'}</Button>
        </div>
      </div>
    </Modal>
  )
}
