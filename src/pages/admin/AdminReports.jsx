// src/pages/admin/AdminReports.jsx
//
// Multi-chart admin analytics: doctor growth, infant status distribution,
// vaccination completion, alert volume.

import { useEffect, useState } from 'react'
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts'
import { BarChart3, TrendingUp, Syringe, Bell } from 'lucide-react'

import { adminService }      from '../../services/adminService'
import { infantService }     from '../../services/infantService'
import { vaccinationService } from '../../services/vaccinationService'
import { alertService }      from '../../services/alertService'
import { useToast } from '../../hooks/useToast'

import { Skeleton, SkeletonStatCard } from '../../components/ui/Skeleton'

const STATUS_COLORS = {
  monitoring: '#F59E0B',
  healthy:    '#10B981',
  at_risk:    '#FB923C',
  critical:   '#EF4444',
}

export default function AdminReports() {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [growth,  setGrowth]  = useState([])
  const [status,  setStatus]  = useState({ monitoring: 0, healthy: 0, at_risk: 0, critical: 0 })
  const [vax,     setVax]     = useState({ total: 0, administered: 0, rate: 0 })
  const [alerts,  setAlerts]  = useState([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [g, s, v, a] = await Promise.all([
          adminService.getMonthlyGrowth(),
          infantService.statusDistribution(),
          vaccinationService.completionRate(),
          alertService.volumeByDay({ days: 14 }),
        ])
        if (cancelled) return
        setGrowth(g); setStatus(s); setVax(v); setAlerts(a)
      } catch (err) {
        if (!cancelled) toast.error(err.message ?? 'Could not load reports')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [toast])

  const statusData = Object.entries(status).map(([k, count]) => ({
    name: k.replace('_', ' '),
    value: count,
    color: STATUS_COLORS[k],
  }))

  return (
    <>
      <div className="mb-7">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Reports</h1>
        <p className="text-sm text-slate-500 dark:text-zinc-500 mt-1">Aggregated analytics across the platform.</p>
      </div>

      {/* Top KPI strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
        {loading ? (
          <><SkeletonStatCard /><SkeletonStatCard /><SkeletonStatCard /></>
        ) : (
          <>
            <KPI icon={Syringe} label="Vaccination completion" value={`${vax.rate}%`} sub={`${vax.administered} of ${vax.total} doses`} accent="bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" />
            <KPI icon={Bell} label="Open alerts" value={alerts.reduce((s, d) => s + d.info + d.warning + d.critical, 0)} sub="last 14 days" accent="bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400" />
            <KPI icon={TrendingUp} label="At-risk infants" value={status.at_risk + status.critical} sub={`${status.critical} critical`} accent="bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Doctors growth */}
        <ChartCard title="Doctors added" subtitle="Last 6 months">
          {loading ? <Skeleton className="h-64" /> : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={growth} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563EB" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-200 dark:text-zinc-800" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'currentColor' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'currentColor' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  <Area type="monotone" dataKey="count" stroke="#2563EB" strokeWidth={2} fill="url(#g1)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        {/* Infant status pie */}
        <ChartCard title="Infant status distribution">
          {loading ? <Skeleton className="h-64" /> : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2}>
                    {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        {/* Alert volume */}
        <ChartCard title="Alert volume" subtitle="Last 14 days, by severity" wide>
          {loading ? <Skeleton className="h-64" /> : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={alerts} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-200 dark:text-zinc-800" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'currentColor' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'currentColor' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="info"     stackId="a" fill="#3B82F6" radius={[4,4,0,0]} />
                  <Bar dataKey="warning"  stackId="a" fill="#F59E0B" />
                  <Bar dataKey="critical" stackId="a" fill="#EF4444" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>
      </div>
    </>
  )
}

function KPI({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5">
      <div className={'h-11 w-11 rounded-xl grid place-items-center ' + accent}>
        <Icon size={20} />
      </div>
      <div className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">{value}</div>
      <div className="text-xs font-medium text-slate-500 dark:text-zinc-500 mt-1">{label}</div>
      {sub && <div className="text-[11px] text-slate-500 dark:text-zinc-500 mt-0.5">{sub}</div>}
    </div>
  )
}

function ChartCard({ title, subtitle, children, wide }) {
  return (
    <div className={'rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 ' + (wide ? 'lg:col-span-2' : '')}>
      <div className="mb-3">
        <h3 className="font-bold text-slate-900 dark:text-white">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 dark:text-zinc-500">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}
