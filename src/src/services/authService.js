// src/services/authService.js
//
// Public auth surface for NurtureX. In the two-role system there is NO
// public registration: doctors are created by an admin, admins are seeded
// directly in the database. So we only expose sign-in / sign-out / reset.

import { supabase } from '../supabaseClient'

export const authService = {
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (error) throw error
    return data
  },

  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  async resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo: `${window.location.origin}/auth` }
    )
    if (error) throw error
  },
}
