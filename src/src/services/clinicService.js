// src/services/clinicService.js
import { supabase } from '../supabaseClient'

export const clinicService = {
  async getByDoctor(doctorId) {
    const { data, error } = await supabase
      .from('doctor_clinics')
      .select('*')
      .eq('doctor_id', doctorId)
    if (error) throw error
    return data
  },

  async create(payload) {
    const { data, error } = await supabase
      .from('doctor_clinics')
      .insert(payload)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('doctor_clinics')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async remove(id) {
    const { error } = await supabase.from('doctor_clinics').delete().eq('id', id)
    if (error) throw error
  },
}
