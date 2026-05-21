// src/components/ProtectedRoute.jsx
//
// Role-based route guard. Decision tree:
//
//   1. While auth is loading       → spinner
//   2. No session                  → /auth
//   3. Profile error (no role)     → /auth (with the error visible after we
//                                    sign the user out — AuthContext does that
//                                    on signIn; if it happens during a session,
//                                    the user is in a bad state and shouldn't
//                                    be rendering protected children)
//   4. Role mismatches required    → redirect to the user's actual home
//   5. All good                    → render

import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth, isValidRole, homeForRole } from '../contexts/AuthContext'
import { FullPageSpinner } from './ui/Spinner'

const SAFETY_TIMEOUT_MS = 12_000

export default function ProtectedRoute({ children, requiredRole }) {
  const { session, role, loading, profileError } = useAuth()

  // Safety net: if loading drags too long, fall through so the user isn't
  // stuck on a spinner. We treat that as unauthorized.
  const [bailOut, setBailOut] = useState(false)
  useEffect(() => {
    if (!loading) { setBailOut(false); return }
    const t = setTimeout(() => setBailOut(true), SAFETY_TIMEOUT_MS)
    return () => clearTimeout(t)
  }, [loading])

  if (loading && !bailOut) {
    return <FullPageSpinner message="Loading…" />
  }

  if (!session) {
    return <Navigate to="/auth" replace />
  }

  // Profile failed to load, or role is invalid → not authorized.
  if (profileError || !role || !isValidRole(role)) {
    return <Navigate to="/auth" replace />
  }

  // Role gate: redirect to the user's real home.
  if (requiredRole && role !== requiredRole) {
    return <Navigate to={homeForRole(role)} replace />
  }

  return children
}
