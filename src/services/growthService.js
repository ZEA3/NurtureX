// src/services/growthService.js
import { supabase } from '../supabaseClient'

export const growthService = {
  async listForInfant(infantId) {
    const { data, error } = await supabase
      .from('growth_records')
      .select('*')
      .eq('infant_id', infantId)
      .order('measured_at', { ascending: true })
    if (error) throw error
    return data ?? []
  },

  async create(input) {
    const row = {
      infant_id:          input.infant_id,
      measured_at:        input.measured_at || new Date().toISOString().slice(0,10),
      weight_kg:          input.weight_kg ? Number(input.weight_kg) : null,
      height_cm:          input.height_cm ? Number(input.height_cm) : null,
      head_circumference: input.head_circumference ? Number(input.head_circumference) : null,
      notes:              input.notes?.trim() || null,
    }
    const { data, error } = await supabase.from('growth_records').insert(row).select().single()
    if (error) throw error
    return data
  },

  async remove(id) {
    const { error } = await supabase.from('growth_records').delete().eq('id', id)
    if (error) throw error
  },
}
