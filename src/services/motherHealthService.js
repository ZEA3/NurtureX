// src/services/motherHealthService.js
//
// Read-mostly wrapper around the Phase 3 ("Mother Health") tables. The doctor
// dashboard surfaces these on the Patient Record page. Doctor-side RLS
// (is_doctor_of) scopes everything to the doctor's own patients automatically.
//
// All list helpers take a parentId — the patient's `profiles.id` — and sort
// newest-first so the UI can call rows[0] for the latest reading.

import { supabase } from '../supabaseClient'

export const motherHealthService = {

  // ── Vitals ──────────────────────────────────────────────────────
  async listVitals(parentId, { limit = 90 } = {}) {
    const { data, error } = await supabase
      .from('mother_vitals')
      .select('*')
      .eq('parent_id', parentId)
      .order('recorded_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return data ?? []
  },

  // ── Mood ────────────────────────────────────────────────────────
  async listMoodLogs(parentId, { limit = 90 } = {}) {
    const { data, error } = await supabase
      .from('mood_logs')
      .select('*')
      .eq('parent_id', parentId)
      .order('logged_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return data ?? []
  },

  // ── Breastfeeding ───────────────────────────────────────────────
  async listBreastfeeding(parentId, { limit = 60 } = {}) {
    const { data, error } = await supabase
      .from('breastfeeding_sessions')
      .select('*')
      .eq('parent_id', parentId)
      .order('started_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return data ?? []
  },

  // ── Medications ─────────────────────────────────────────────────
  async listMedications(parentId) {
    const { data, error } = await supabase
      .from('medication_reminders')
      .select('*')
      .eq('parent_id', parentId)
      .order('reminder_time', { ascending: true })
    if (error) throw error
    return data ?? []
  },

  /// Intake history for the last `days` days. Used to compute adherence %.
  async listIntakeRecent(parentId, { days = 14 } = {}) {
    const since = new Date(Date.now() - days * 86400000)
      .toISOString()
      .slice(0, 10)
    const { data, error } = await supabase
      .from('medication_intake_logs')
      .select('*')
      .eq('parent_id', parentId)
      .gte('scheduled_date', since)
      .order('scheduled_date', { ascending: false })
    if (error) throw error
    return data ?? []
  },

  // ── Checkups ────────────────────────────────────────────────────
  async listCheckups(parentId) {
    const { data, error } = await supabase
      .from('postpartum_checkups')
      .select('*')
      .eq('parent_id', parentId)
      .order('scheduled_at', { ascending: true, nullsFirst: false })
    if (error) throw error
    return data ?? []
  },

  /// Schedule a new visit. The doctor uses this from the Patient Record.
  async createCheckup({ parent_id, checkup_type, scheduled_at, doctor_notes }) {
    const { data, error } = await supabase
      .from('postpartum_checkups')
      .insert({
        parent_id,
        checkup_type,
        scheduled_at: scheduled_at || null,
        doctor_notes: doctor_notes?.trim() || null,
        status: 'upcoming',
      })
      .select()
      .single()
    if (error) throw error
    return data
  },

  /// Update notes / status on a checkup. RLS lets the assigned doctor edit.
  async updateCheckup(id, patch) {
    const clean = {}
    if ('doctor_notes' in patch) clean.doctor_notes = patch.doctor_notes?.trim() || null
    if ('status' in patch)       clean.status       = patch.status
    if ('scheduled_at' in patch) clean.scheduled_at = patch.scheduled_at || null
    if ('completed_at' in patch) clean.completed_at = patch.completed_at || null
    if (Object.keys(clean).length === 0) return null
    const { data, error } = await supabase
      .from('postpartum_checkups')
      .update(clean)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async markCheckupCompleted(id) {
    return this.updateCheckup(id, {
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
  },

  // ── Questions the patient prepared for their visit ──────────────
  async listQuestions(parentId) {
    const { data, error } = await supabase
      .from('checkup_questions')
      .select('*')
      .eq('parent_id', parentId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return data ?? []
  },
}
