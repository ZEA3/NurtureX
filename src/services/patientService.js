// src/services/patientService.js
//
// Mothers (patients). RLS handles role-based access: doctors see their
// own; admins see everything. Service just calls the API.

import { supabase } from '../supabaseClient'

export const patientService = {
  /**
   * @param {Object} opts
   * @param {string} [opts.search]
   * @param {string} [opts.status]   'all' | 'active' | 'discharged' | 'archived'
   * @param {string} [opts.doctorId] filter by assigned doctor (admin view)
   * @param {number} [opts.page]
   * @param {number} [opts.pageSize]
   */
  async list({ search = '', status = 'all', doctorId, page = 1, pageSize = 10 } = {}) {
    let q = supabase
      .from('patients')
      .select('*, doctor:doctor_id(id, full_name, specialty)', { count: 'exact' })
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

  async getById(id) {
    const { data, error } = await supabase
      .from('patients')
      .select('*, doctor:doctor_id(id, full_name, specialty), infants(*)')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return data
  },

  async create(input) {
    const row = {
      full_name:  input.full_name?.trim(),
      email:      input.email?.trim() || null,
      phone:      input.phone?.trim() || null,
      age:        input.age ? Number(input.age) : null,
      due_date:   input.due_date || null,
      blood_type: input.blood_type?.trim() || null,
      notes:      input.notes?.trim() || null,
      status:     input.status ?? 'active',
      doctor_id:  input.doctor_id ?? null,
    }
    const { data, error } = await supabase.from('patients').insert(row).select().single()
    if (error) throw error
    return data
  },

  async update(id, patch) {
    const allowed = ['full_name', 'email', 'phone', 'age', 'due_date', 'blood_type', 'notes', 'status', 'doctor_id']
    const cleaned = Object.fromEntries(
      Object.entries(patch).filter(([k]) => allowed.includes(k))
    )
    const { data, error } = await supabase
      .from('patients').update(cleaned).eq('id', id).select().single()
    if (error) throw error
    return data
  },

  async remove(id) {
    const { error } = await supabase.from('patients').delete().eq('id', id)
    if (error) throw error
  },
}
