// src/services/messageService.js
//
// Doctor↔patient (mother) messaging. RLS scopes to the doctor.
// `sender` is one of:
//   - 'doctor'  : a message the doctor sent to the parent
//   - 'patient' : a message the parent sent in (logged by the doctor manually,
//                 or via a future SMS/email integration)
//   - 'system'  : automated entries (e.g. "appointment confirmation sent")

import { supabase } from '../supabaseClient'

const SELECT = `*, patient:patient_id(id, full_name, phone, email)`

export const messageService = {
  /**
   * One conversation per patient. This returns the latest message per
   * patient_id for the inbox view. Plus unread count.
   *
   * Implementation: pull recent messages, group client-side. For small
   * volumes this is fine and avoids a stored procedure.
   */
  async listThreads({ doctorId, search = '' } = {}) {
    let q = supabase
      .from('messages')
      .select(SELECT)
      .order('created_at', { ascending: false })
      .limit(500)
    if (doctorId) q = q.eq('doctor_id', doctorId)
    const { data, error } = await q
    if (error) throw error

    const byPatient = new Map()
    for (const m of data ?? []) {
      if (!m.patient_id) continue
      if (!byPatient.has(m.patient_id)) {
        byPatient.set(m.patient_id, {
          patient: m.patient,
          patient_id: m.patient_id,
          last:    m,
          unread:  0,
        })
      }
      const t = byPatient.get(m.patient_id)
      if (m.sender === 'patient' && !m.read_at) t.unread += 1
    }

    let threads = Array.from(byPatient.values())
    if (search.trim()) {
      const s = search.trim().toLowerCase()
      threads = threads.filter(t => t.patient?.full_name?.toLowerCase().includes(s))
    }
    return threads
  },

  /** All messages for a single patient thread, oldest first. */
  async listForPatient(patientId, { limit = 200 } = {}) {
    const { data, error } = await supabase
      .from('messages')
      .select(SELECT)
      .eq('patient_id', patientId)
      .order('created_at', { ascending: true })
      .limit(limit)
    if (error) throw error
    return data ?? []
  },

  async send({ doctor_id, patient_id, content, sender = 'doctor' }) {
    const row = {
      doctor_id, patient_id, sender,
      content: content.trim(),
      // Doctor's own outgoing messages are immediately "read" (by them).
      read_at: sender === 'doctor' ? new Date().toISOString() : null,
    }
    const { data, error } = await supabase
      .from('messages').insert(row).select(SELECT).single()
    if (error) throw error
    return data
  },

  /**
   * Mark a patient's incoming messages as read by the doctor.
   * Called when the doctor opens the thread.
   */
  async markThreadRead(patientId) {
    const { error } = await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('patient_id', patientId)
      .eq('sender', 'patient')
      .is('read_at', null)
    if (error) throw error
  },

  async remove(id) {
    const { error } = await supabase.from('messages').delete().eq('id', id)
    if (error) throw error
  },

  /** Total unread count for the doctor (used in sidebar badges). */
  async unreadCount({ doctorId }) {
    let q = supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('sender', 'patient')
      .is('read_at', null)
    if (doctorId) q = q.eq('doctor_id', doctorId)
    const { count, error } = await q
    if (error) throw error
    return count ?? 0
  },
}
