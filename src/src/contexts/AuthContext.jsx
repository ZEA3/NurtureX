// src/contexts/AuthContext.jsx
//
// Two-role authentication: admin | doctor.
//
// SINGLE SOURCE OF TRUTH for role: the `profiles.role` column.
// We do NOT read role from auth.users.user_metadata for routing decisions
// — that field can be stale, missing, or set by signup, while the
// canonical role lives in the database (and is enforced by RLS).
//
// State machine:
//   bootstrapped=false              → initial getSession() in flight
//   session=null, bootstrapped=true → signed out
//   session set, profile=null       → profile lookup in flight
//   session set, profile loaded     → ready
//   session set, profileError set   → fatal: cannot determine role
//                                     (we never guess a role; see below)
//
// `loading` is derived. `role` is null until profile is fetched —
// callers MUST treat null as "not yet known", not as "doctor".

import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../supabaseClient'

const AuthContext = createContext(null)
const PROFILE_TIMEOUT_MS = 8_000

export const VALID_ROLES = ['admin', 'doctor']
export const isValidRole = (r) => VALID_ROLES.includes(r)

function withTimeout(promise, ms, label = 'operation') {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    promise.then(
      (v) => { clearTimeout(t); resolve(v) },
      (e) => { clearTimeout(t); reject(e) },
    )
  })
}

export function AuthProvider({ children }) {
  const [session,       setSession]      = useState(null)
  const [profile,       setProfile]      = useState(null)
  const [bootstrapped,  setBootstrapped] = useState(false)
  const [profileError,  setProfileError] = useState(null)

  const mounted = useRef(true)
  useEffect(() => () => { mounted.current = false }, [])

  /**
   * Loading is derived state.
   *  - true while we're booting (haven't checked the existing session yet)
   *  - true while we have a session but no profile (and no fatal error)
   *  - false when fully resolved (signed out, or signed in with profile)
   */
  const loading = !bootstrapped || Boolean(session && !profile && !profileError)

  /**
   * Fetch the profile row (the canonical source of `role`).
   *
   * If the lookup fails or returns no row, we set `profileError` and leave
   * `profile` null. Callers/guards must treat that as "unauthorized".
   *
   * We never invent a role from user_metadata — that's how doctors end up
   * on /admin.
   */
  const fetchProfile = useCallback(async (userId) => {
    if (!userId) return
    setProfileError(null)
    try {
      const { data, error } = await withTimeout(
        supabase
          .from('profiles')
          .select('id, email, full_name, role, status, phone, specialty, bio, avatar_url, clinic_name, clinic_address, clinic_phone, created_at, updated_at')
          .eq('id', userId)
          .maybeSingle(),
        PROFILE_TIMEOUT_MS,
        'profile lookup',
      )
      if (!mounted.current) return
      if (error) throw error

      if (!data) {
        // No profiles row exists. This is a misconfigured account —
        // refuse to assume a role. The handle_new_user() trigger should
        // have created one. The admin needs to investigate.
        const msg = 'Your profile could not be found. Contact your administrator.'
        console.error('[Auth] no profiles row for user', userId)
        setProfileError(msg)
        setProfile(null)
        return
      }

      if (!isValidRole(data.role)) {
        const msg = `Your account role is "${data.role ?? 'unset'}", which is not allowed to access this app.`
        console.error('[Auth] invalid role on profile:', data.role)
        setProfileError(msg)
        setProfile(null)
        return
      }

      setProfile(data)
    } catch (err) {
      if (!mounted.current) return
      console.error('[Auth] profile lookup failed:', err)
      setProfileError(err.message ?? 'Could not load profile')
      setProfile(null)
    }
  }, [])

  /* ── Bootstrap: read existing session, then subscribe to changes ── */
  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        const { data, error } = await withTimeout(
          supabase.auth.getSession(),
          PROFILE_TIMEOUT_MS,
          'getSession',
        )
        if (cancelled) return
        if (error) throw error
        const s = data?.session ?? null
        setSession(s)
        if (s?.user?.id) await fetchProfile(s.user.id)
      } catch (err) {
        if (!cancelled) {
          console.error('[Auth] getSession failed:', err)
          setProfileError(err.message ?? 'Authentication unavailable')
        }
      } finally {
        if (!cancelled) setBootstrapped(true)
      }
    })()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (cancelled) return

        // SIGNED_OUT: clear everything.
        if (event === 'SIGNED_OUT' || !newSession) {
          setSession(null)
          setProfile(null)
          setProfileError(null)
          return
        }

        // Token refreshed for the same user — keep the cached profile.
        const sameUser = profile?.id && profile.id === newSession.user.id
        setSession(newSession)
        if (!sameUser) {
          setProfile(null)
          setProfileError(null)
          fetchProfile(newSession.user.id)
        }
      },
    )

    return () => { cancelled = true; subscription.unsubscribe() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchProfile])

  /**
   * Sign in. Returns { profile } once the role has been resolved from the
   * database, so callers can navigate based on the *real* role.
   *
   * If the profile cannot be resolved, we sign the user back out and throw —
   * we refuse to leave the user "half-authenticated" with an unknown role,
   * because that's exactly the bug we're fixing.
   */
  const signIn = useCallback(async (email, password) => {
    setProfileError(null)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error

    const userId = data.session?.user?.id
    if (!userId) throw new Error('Sign-in succeeded but no user was returned.')

    setSession(data.session)
    setProfile(null)

    // Fetch the profile inline so we can return the real role to the caller.
    let profileRow = null
    try {
      const { data: row, error: pErr } = await withTimeout(
        supabase
          .from('profiles')
          .select('id, email, full_name, role, status, phone, specialty, bio, avatar_url, clinic_name, clinic_address, clinic_phone, created_at, updated_at')
          .eq('id', userId)
          .maybeSingle(),
        PROFILE_TIMEOUT_MS,
        'profile lookup',
      )
      if (pErr) throw pErr
      profileRow = row
    } catch (err) {
      // Don't leave the user signed in with no resolvable role.
      console.error('[Auth] post-sign-in profile lookup failed:', err)
      await supabase.auth.signOut().catch(() => {})
      setSession(null); setProfile(null)
      throw new Error('Signed in, but could not load your profile. Try again, or contact your administrator.')
    }

    if (!profileRow) {
      await supabase.auth.signOut().catch(() => {})
      setSession(null); setProfile(null)
      throw new Error('Your account has no profile. Ask your administrator to set you up.')
    }

    if (!isValidRole(profileRow.role)) {
      await supabase.auth.signOut().catch(() => {})
      setSession(null); setProfile(null)
      throw new Error(`Your account role ("${profileRow.role ?? 'unset'}") is not authorized to use this app.`)
    }

    if (profileRow.status === 'suspended' || profileRow.status === 'inactive') {
      await supabase.auth.signOut().catch(() => {})
      setSession(null); setProfile(null)
      throw new Error('This account is not active. Contact your administrator.')
    }

    setProfile(profileRow)
    return { session: data.session, user: data.user, profile: profileRow }
  }, [])

  const signOut = useCallback(async () => {
    setProfileError(null)
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setSession(null)
    setProfile(null)
  }, [])

  const refreshProfile = useCallback(() => {
    if (session?.user?.id) return fetchProfile(session.user.id)
  }, [session, fetchProfile])

  const value = {
    session,
    user:         session?.user ?? null,
    profile,
    role:         profile?.role ?? null,    // null until DB-resolved
    loading,
    authError:    profileError,             // surfaced to UI under the same name
    profileError,
    isAdmin:      profile?.role === 'admin',
    isDoctor:     profile?.role === 'doctor',
    isAuthorized: Boolean(profile && isValidRole(profile.role)),
    signIn,
    signOut,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

/** Where should this role land after auth? */
export function homeForRole(role) {
  if (role === 'admin')  return '/admin'
  if (role === 'doctor') return '/doctor'
  return '/auth'
}
