// src/services/alertService.js
import { supabase } from '../supabaseClient'

export const alertService = {
  async list({ doctorId, status = 'all', severity = 'all', limit = 50 } = {}) {
    let q = supabase
      .from('alerts')
      .select('*, infant:infant_id(id, name, date_of_birth, doctor_id)')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (doctorId)              q = q.eq('doctor_id', doctorId)
    if (status   !== 'all')    q = q.eq('status', status)  // values: open, acknowledged, resolved
    if (severity !== 'all')    q = q.eq('severity', severity)
    const { data, error } = await q
    if (error) throw error
    return data ?? []
  },

  async create(input) {
    const row = {
      doctor_id:  input.doctor_id ?? null,
      infant_id:  input.infant_id ?? null,
      subject:    input.subject?.trim(),
      message:    input.message?.trim() || null,
      severity:   input.severity ?? 'info',
      source:     input.source ?? 'manual',
      status:     'open',
    }
    const { data, error } = await supabase.from('alerts').insert(row).select().single()
    if (error) throw error
    return data
  },

  async acknowledge(id) {
    const { data, error } = await supabase
      .from('alerts').update({ status: 'acknowledged' }).eq('id', id).select().single()
    if (error) throw error
    return data
  },

  async resolve(id) {
    const { data, error } = await supabase
      .from('alerts').update({ status: 'resolved' })
      .eq('id', id).select().single()
    if (error) throw error
    return data
  },

  async remove(id) {
    const { error } = await supabase.from('alerts').delete().eq('id', id)
    if (error) throw error
  },

  /** Volume by severity for the last N days (used by reports). */
  async volumeByDay({ doctorId, days = 14 } = {}) {
    const since = new Date(Date.now() - days * 86400000).toISOString()
    let q = supabase.from('alerts').select('created_at, severity').gte('created_at', since)
    if (doctorId) q = q.eq('doctor_id', doctorId)
    const { data, error } = await q
    if (error) throw error
    // Bucket by ISO date
    const buckets = new Map()
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const k = d.toISOString().slice(0, 10)
      buckets.set(k, { date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), info: 0, warning: 0, critical: 0 })
    }
    for (const row of data ?? []) {
      const k = row.created_at.slice(0, 10)
      if (buckets.has(k)) buckets.get(k)[row.severity] = (buckets.get(k)[row.severity] ?? 0) + 1
    }
    return Array.from(buckets.values())
  },
}