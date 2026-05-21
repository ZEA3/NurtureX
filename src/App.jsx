// src/App.jsx
//
// Routing for the two-role system: admin + doctor.
//
// BrowserRouter + Vercel's SPA rewrite (see vercel.json) gives clean URLs
// like https://<you>.vercel.app/admin/doctors that survive page reloads.

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

// Auth
import AuthPage from './pages/auth/AuthPage'

// Layout + Guards
import DashboardLayout from './components/DashboardLayout'
import ProtectedRoute  from './components/ProtectedRoute'

// Admin pages
import AdminDashboard    from './pages/admin/AdminDashboard'
import AdminDoctors      from './pages/admin/AdminDoctors'
import AdminPatients     from './pages/admin/AdminPatients'
import AdminInfants      from './pages/admin/AdminInfants'
import AdminAppointments from './pages/admin/AdminAppointments'
import AdminReports      from './pages/admin/AdminReports'

// Doctor pages
import DoctorDashboard     from './pages/doctor/DoctorDashboard'
import DoctorPatients      from './pages/doctor/DoctorPatients'
import DoctorInfants       from './pages/doctor/DoctorInfants'
import DoctorAppointments  from './pages/doctor/DoctorAppointments'
import DoctorVaccinations  from './pages/doctor/DoctorVaccinations'
import DoctorMessages      from './pages/doctor/DoctorMessages'
import DoctorAITools       from './pages/doctor/DoctorAITools'
import DoctorProfile       from './pages/doctor/DoctorProfile'

// Shared (used by both admin and doctor routes)
import InfantDetail from './pages/shared/InfantDetail'
import AlertsPage   from './pages/shared/AlertsPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Root → auth (auth page redirects logged-in users to their dashboard) */}
        <Route path="/" element={<Navigate to="/auth" replace />} />

        {/* Public */}
        <Route path="/auth" element={<AuthPage />} />

        {/* ── Admin panel ── */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole="admin">
              <DashboardLayout title="Admin Panel" />
            </ProtectedRoute>
          }
        >
          <Route index               element={<AdminDashboard />} />
          <Route path="doctors"      element={<AdminDoctors />} />
          <Route path="patients"     element={<AdminPatients />} />
          <Route path="infants"      element={<AdminInfants />} />
          <Route path="infants/:id"  element={<InfantDetail />} />
          <Route path="appointments" element={<AdminAppointments />} />
          <Route path="alerts"       element={<AlertsPage />} />
          <Route path="reports"      element={<AdminReports />} />
        </Route>

        {/* ── Doctor panel ── */}
        <Route
          path="/doctor"
          element={
            <ProtectedRoute requiredRole="doctor">
              <DashboardLayout title="Doctor Panel" />
            </ProtectedRoute>
          }
        >
          <Route index                 element={<DoctorDashboard />} />
          <Route path="patients"       element={<DoctorPatients />} />
          <Route path="infants"        element={<DoctorInfants />} />
          <Route path="infants/:id"    element={<InfantDetail />} />
          <Route path="appointments"   element={<DoctorAppointments />} />
          <Route path="vaccinations"   element={<DoctorVaccinations />} />
          <Route path="messages"       element={<DoctorMessages />} />
          <Route path="alerts"         element={<AlertsPage />} />
          <Route path="ai-tools"       element={<DoctorAITools />} />
          <Route path="profile"        element={<DoctorProfile />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
