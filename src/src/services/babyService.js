// src/services/babyService.js
import { supabase } from '../supabaseClient'

export const babyService = {
  // All babies (admin)
  async getAll() {
    const { data, error } = await supabase
      .from('babies')
      .select('*, parent:profiles!parent_id(full_name)')
      .order('name')
    if (error) throw error
    return data
  },

  // Babies belonging to a specific parent
  async getByParent(parentId) {
    const { data, error } = await supabase
      .from('babies')
      .select('*')
      .eq('parent_id', parentId)
      .order('name')
    if (error) throw error
    return data
  },

  // Babies linked to a doctor via appointments
  async getByDoctor(doctorId) {
    const { data, error } = await supabase
      .from('appointments')
      .select('baby:babies(*), user:profiles!user_id(full_name)')
      .eq('doctor_id', doctorId)
    if (error) throw error
    // De-duplicate by baby id
    const seen = new Set()
    return data.filter(row => {
      if (!row.baby || seen.has(row.baby.id)) return false
      seen.add(row.baby.id)
      return true
    })
  },
}
