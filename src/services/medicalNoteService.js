// src/services/medicalNoteService.js
//
// Medical notes & recommendations attached to a patient or infant.
// RLS scopes: doctors see their own; admins see all.

import { supabase } from '../supabaseClient'

const SELECT = `
  *,
  patient:patient_id(id, full_name),
  infant:infant_id(id, name),
  doctor:doctor_id(id, full_name)
`

export const medicalNoteService = {
  async list({ doctorId, patientId, infantId, page = 1, pageSize = 50 } = {}) {
    let q = supabase
      .from('medical_notes')
      .select(SELECT, { count: 'exact' })
      .order('created_at', { ascending: false })
    if (doctorId)  q = q.eq('doctor_id', doctorId)
    if (patientId) q = q.eq('patient_id', patientId)
    if (infantId)  q = q.eq('infant_id', infantId)
    const start = (page - 1) * pageSize
    q = q.range(start, start + pageSize - 1)
    const { data, error, count } = await q
    if (error) throw error
    return { rows: data ?? [], total: count ?? 0 }
  },

  async listForInfant(infantId) {
    const { data, error } = await supabase
      .from('medical_notes')
      .select(SELECT)
      .eq('infant_id', infantId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  },

  async create(input) {
    const row = {
      doctor_id:       input.doctor_id ?? null,
      patient_id:      input.patient_id ?? null,
      infant_id:       input.infant_id ?? null,
      title:           input.title?.trim(),
      content:         input.content?.trim(),
      recommendations: input.recommendations?.trim() || null,
    }
    const { data, error } = await supabase
      .from('medical_notes').insert(row).select(SELECT).single()
    if (error) throw error
    return data
  },

  async update(id, patch) {
    const allowed = ['title', 'content', 'recommendations']
    const cleaned = Object.fromEntries(
      Object.entries(patch).filter(([k]) => allowed.includes(k))
    )
    const { data, error } = await supabase
      .from('medical_notes').update(cleaned).eq('id', id).select(SELECT).single()
    if (error) throw error
    return data
  },

  async remove(id) {
    const { error } = await supabase.from('medical_notes').delete().eq('id', id)
    if (error) throw error
  },
}
