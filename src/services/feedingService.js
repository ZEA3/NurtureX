// src/services/feedingService.js
import { supabase } from '../supabaseClient'

export const feedingService = {
  async listForInfant(infantId, { limit = 50 } = {}) {
    const { data, error } = await supabase
      .from('feeding_logs')
      .select('*')
      .eq('infant_id', infantId)
      .order('fed_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return data ?? []
  },

  async create(input) {
    const row = {
      infant_id:    input.infant_id,
      fed_at:       input.fed_at || new Date().toISOString(),
      feed_type:    input.feed_type || null,
      amount_ml:    input.amount_ml ? Number(input.amount_ml) : null,
      duration_min: input.duration_min ? Number(input.duration_min) : null,
      notes:        input.notes?.trim() || null,
    }
    const { data, error } = await supabase.from('feeding_logs').insert(row).select().single()
    if (error) throw error
    return data
  },

  async remove(id) {
    const { error } = await supabase.from('feeding_logs').delete().eq('id', id)
    if (error) throw error
  },
}
