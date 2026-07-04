// src/hooks/useNotifications.js
//
// Real-time notification counts for the Topbar.
// Tracks:
//   - Unread direct messages (parent → doctor)
//   - Pending appointment requests (status = 'scheduled')

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from './useAuth'

export function useNotifications() {
  const { user, isAdmin } = useAuth()

  const [unreadMessages,      setUnreadMessages]      = useState(0)
  const [pendingAppointments, setPendingAppointments] = useState(0)
  const [recentMessages,      setRecentMessages]      = useState([])
  const [recentAppointments,  setRecentAppointments]  = useState([])
  const [loading,             setLoading]             = useState(true)

  const total = unreadMessages + pendingAppointments

  // ── Fetch unread messages ────────────────────────────────────────
  const fetchMessages = useCallback(async () => {
    if (!user?.id) return
    try {
      const { data: convs } = await supabase
        .from('conversations')
        .select('id')
        .eq('doctor_id', user.id)

      if (!convs?.length) {
        setUnreadMessages(0)
        setRecentMessages([])
        return
      }
      const convIds = convs.map(c => c.id)

      const { count } = await supabase
        .from('direct_messages')
        .select('*', { count: 'exact', head: true })
        .in('conversation_id', convIds)
        .neq('sender_id', user.id)
        .is('read_at', null)

      setUnreadMessages(count ?? 0)

      const { data: msgs } = await supabase
        .from('direct_messages')
        .select('id, content, created_at, conversation_id, sender:sender_id(id, full_name, avatar_url)')
        .in('conversation_id', convIds)
        .neq('sender_id', user.id)
        .is('read_at', null)
        .order('created_at', { ascending: false })
        .limit(5)

      setRecentMessages(msgs ?? [])
    } catch (e) {
      console.error('[useNotifications] fetchMessages:', e)
    }
  }, [user?.id])

  // ── Fetch pending appointments ───────────────────────────────────
  const fetchAppointments = useCallback(async () => {
    if (!user?.id) return
    try {
      let q = supabase
        .from('appointments')
        .select('id, scheduled_at, appt_type, parent:parent_id(id, full_name), infant:infant_id(id, name)',
                { count: 'exact' })
        .eq('status', 'scheduled')
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(5)

      if (!isAdmin) q = q.eq('doctor_id', user.id)

      const { data, count } = await q
      setPendingAppointments(count ?? 0)
      setRecentAppointments(data ?? [])
    } catch (e) {
      console.error('[useNotifications] fetchAppointments:', e)
    }
  }, [user?.id, isAdmin])

  // ── Combined load ────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    setLoading(true)
    await Promise.allSettled([fetchMessages(), fetchAppointments()])
    setLoading(false)
  }, [fetchMessages, fetchAppointments])

  useEffect(() => { refresh() }, [refresh])

  // ── Real-time subscriptions ──────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return

    const msgChannel = supabase
      .channel(`notif-msg-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' },
          () => fetchMessages())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'direct_messages' },
          () => fetchMessages())
      .subscribe()

    const apptChannel = supabase
      .channel(`notif-appt-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' },
          () => fetchAppointments())
      .subscribe()

    return () => {
      supabase.removeChannel(msgChannel)
      supabase.removeChannel(apptChannel)
    }
  }, [user?.id, fetchMessages, fetchAppointments])

  return {
    total,
    unreadMessages,
    pendingAppointments,
    recentMessages,
    recentAppointments,
    loading,
    refresh,
  }
}