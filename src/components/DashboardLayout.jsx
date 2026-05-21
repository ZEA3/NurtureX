// src/components/DashboardLayout.jsx
import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar  from './Topbar'

export default function DashboardLayout({ title }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="lg:ml-64">
        <Topbar title={title} onMenuClick={() => setOpen(true)} />
        <main className="p-4 sm:p-6 lg:p-8 max-w-[1400px]">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
