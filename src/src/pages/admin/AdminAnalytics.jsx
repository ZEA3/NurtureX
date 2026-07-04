// src/pages/admin/AdminAnalytics.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { BarChart, ColumnChart, DonutChart } from '../../components/Chart'
import Icon from '../../components/Icon'

export default function AdminAnalytics() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('profiles').select('role'),
      supabase.from('appointments').select('status, date'),
    ]).then(([profiles, appointments]) => {
      const ps = profiles.data ?? []
      const as = appointments.data ?? []

      const statusCounts = { pending:0, approved:0, rejected:0 }
      as.forEach(a => { if (statusCounts[a.status] !== undefined) statusCounts[a.status]++ })

      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
      const monthly = months.map((label, i) => ({
        label,
        value: as.filter(a => a.date && new Date(a.date).getMonth() === i).length
      }))

      setData({
        roleBreakdown: [
          { label:'Users (Parents)', value: ps.filter(p => p.role==='user').length },
          { label:'Doctors',         value: ps.filter(p => p.role==='doctor').length },
          { label:'Admins',          value: ps.filter(p => p.role==='admin').length },
        ],
        statusBreakdown: [
          { label:'Pending',  value: statusCounts.pending,  color:'#F97316' },
          { label:'Approved', value: statusCounts.approved, color:'#22C55E' },
          { label:'Rejected', value: statusCounts.rejected, color:'#EF4444' },
        ],
        monthly,
        totals: {
          users: ps.filter(p => p.role==='user').length,
          doctors: ps.filter(p => p.role==='doctor').length,
          appointments: as.length,
        }
      })
      setLoading(false)
    })
  }, [])

  if (loading) return (
    <div style={{ padding: 40, display:'flex', justifyContent:'center' }}>
      <span className="spinner spinner-lg" />
    </div>
  )

  return (
    <>
      <div className="page-header">
        <div><h1>Analytics</h1><p>Platform metrics and usage statistics</p></div>
      </div>

      {/* KPI row */}
      <div className="grid-3" style={{ marginBottom: 24 }}>
        {[
          { label:'Total Users',    value: data.totals.users,        icon:'users',    bg:'#EFF6FF', color:'#1D4ED8' },
          { label:'Total Doctors',  value: data.totals.doctors,      icon:'doctors',  bg:'#F0FDF4', color:'#15803D' },
          { label:'Appointments',   value: data.totals.appointments, icon:'calendar', bg:'#F3E8FF', color:'#7C3AED' },
        ].map(kpi => (
          <div key={kpi.label} className="card">
            <div style={{ display:'flex', alignItems:'center', gap: 14 }}>
              <div style={{ width:44, height:44, borderRadius:12, background: kpi.bg, color: kpi.color, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Icon name={kpi.icon} size={20} />
              </div>
              <div>
                <div style={{ fontSize: 28, fontWeight: 800, letterSpacing:'-1.5px', lineHeight:1 }}>{kpi.value}</div>
                <div style={{ fontSize: 12, color:'var(--text-muted)', marginTop: 3 }}>{kpi.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid-2" style={{ gap: 20, marginBottom: 24 }}>
        <div className="card">
          <div className="section-title">Monthly Appointments</div>
          <ColumnChart data={data.monthly} height={160} />
        </div>
        <div className="card">
          <div className="section-title">Appointment Status Distribution</div>
          <div style={{ display:'flex', alignItems:'center', gap: 24 }}>
            <DonutChart segments={data.statusBreakdown} size={140} />
            <div style={{ flex:1 }}>
              {data.statusBreakdown.map(s => (
                <div key={s.label} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 10 }}>
                  <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
                    <div style={{ width:10, height:10, borderRadius:'50%', background: s.color }} />
                    <span style={{ fontSize: 13, color:'var(--text-secondary)' }}>{s.label}</span>
                  </div>
                  <span style={{ fontWeight: 700 }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="section-title">User Role Breakdown</div>
        <BarChart data={data.roleBreakdown} />
      </div>
    </>
  )
}
