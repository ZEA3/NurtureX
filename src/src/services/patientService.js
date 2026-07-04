// src/services/patientService.js
//
// Parents (patients). Reads from the 'patients' VIEW which is built on
// profiles WHERE role='parent'. doctor_id on profiles links parent → doctor.

import { supabase } from '../supabaseClient'

const SELECT = `
  id, full_name, email, phone, role, status, avatar_url,
  doctor_id, created_at, updated_at,
  doctor:doctor_id(id, full_name, specialty)
`

export const patientService = {

  // ── List parents ───────────────────────────────────────────────
  async list({ search = '', status = 'all', doctorId, page = 1, pageSize = 10 } = {}) {
    let q = supabase
      .from('profiles')
      .select(SELECT, { count: 'exact' })
      .eq('role', 'parent')
      .order('created_at', { ascending: false })

    if (search.trim()) {
      const s = `%${search.trim()}%`
      q = q.or(`full_name.ilike.${s},email.ilike.${s},phone.ilike.${s}`)
    }
    if (status !== 'all') q = q.eq('status', status)
    if (doctorId) q = q.eq('doctor_id', doctorId)

    const from = (page - 1) * pageSize
    q = q.range(from, from + pageSize - 1)

    const { data, error, count } = await q
    if (error) throw error
    return { rows: data ?? [], total: count ?? 0 }
  },

  // ── Get single parent with their infants ──────────────────────
  async getById(id) {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id, full_name, email, phone, role, status, avatar_url,
        doctor_id, created_at, updated_at,
        doctor:doctor_id(id, full_name, specialty),
        infants!infants_parent_id_fkey(
          id, name, date_of_birth, gender, status,
          birth_weight_kg, birth_height_cm, blood_type
        )
      `)
      .eq('id', id)
      .eq('role', 'parent')
      .maybeSingle()
    if (error) throw error
    return data
  },

  // ── Assign a doctor to a parent (and all their infants) ───────
  async assignDoctor(parentId, doctorId) {
    // 1. Update parent's profile
    const { error: e1 } = await supabase
      .from('profiles')
      .update({ doctor_id: doctorId })
      .eq('id', parentId)
    if (e1) throw e1

    // 2. Update all their infants
    const { error: e2 } = await supabase
      .from('infants')
      .update({ doctor_id: doctorId })
      .eq('parent_id', parentId)
    if (e2) throw e2

    return true
  },

  // ── Unassign doctor from parent ───────────────────────────────
  async unassignDoctor(parentId) {
    const { error } = await supabase
      .from('profiles')
      .update({ doctor_id: null })
      .eq('id', parentId)
    if (error) throw error
    return true
  },

  // ── Get all parents for admin (no doctor filter) ──────────────
  async listAll({ search = '', page = 1, pageSize = 10 } = {}) {
    return patientService.list({ search, page, pageSize })
  },
}