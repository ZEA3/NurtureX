// src/components/Topbar.jsx
//
// Sticky top bar: hamburger (mobile) + page title + search + theme toggle
// + notifications + profile dropdown.

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, Search, Bell, Sun, Moon, ChevronDown, User, LogOut, Settings } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import { useToast } from '../hooks/useToast'
import { cn } from '../utils/cn'
import Avatar from './ui/Avatar'

export default function Topbar({ title, onMenuClick }) {
  const { profile, isAdmin, signOut } = useAuth()
  const { isDark, toggle } = useTheme()
  const navigate = useNavigate()
  const toast = useToast()

  const [showProfile, setShowProfile] = useState(false)
  const [showNotif,   setShowNotif]   = useState(false)
  const profileRef = useRef(null)
  const notifRef   = useRef(null)

  useEffect(() => {
    if (!showProfile && !showNotif) return
    const onClick = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false)
      if (notifRef.current   && !notifRef.current.contains(e.target))   setShowNotif(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [showProfile, showNotif])

  const root = isAdmin ? '/admin' : '/doctor'

  const handleSignOut = async () => {
    setShowProfile(false)
    try { await signOut(); navigate('/auth', { replace: true }) }
    catch (err) { toast.error(err.message ?? 'Could not sign out') }
  }

  return (
    <header className="sticky top-0 z-30 h-16 px-4 lg:px-6 flex items-center gap-3 bg-white/80 dark:bg-zinc-950/80 backdrop-blur border-b border-slate-200 dark:border-zinc-900">
      <button
        type="button"
        onClick={onMenuClick}
        className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-900"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      <h1 className="font-bold text-slate-900 dark:text-white tracking-tight truncate">{title}</h1>

      <div className="flex-1" />

      {/* Search */}
      <div className="hidden md:flex items-center gap-2 h-9 w-64 px-3 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/15 transition">
        <Search size={14} className="text-slate-400" />
        <input
          type="search"
          placeholder="Search…"
          className="bg-transparent border-0 outline-none text-sm w-full text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500"
        />
      </div>

      {/* Theme */}
      <button
        type="button"
        onClick={toggle}
        className="p-2 rounded-lg text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-900 transition"
        title="Toggle theme"
        aria-label="Toggle theme"
      >
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      {/* Notifications */}
      <div ref={notifRef} className="relative">
        <button
          type="button"
          onClick={() => { setShowNotif(v => !v); setShowProfile(false) }}
          className="relative p-2 rounded-lg text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-900 transition"
          aria-label="Notifications"
        >
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 border-2 border-white dark:border-zinc-950" />
        </button>
        {showNotif && (
          <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lift overflow-hidden animate-fade-in">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
              <span className="text-sm font-semibold">Notifications</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
                3 new
              </span>
            </div>
            <div className="p-2 text-sm text-slate-500 dark:text-zinc-400 text-center py-8">
              You're all caught up
            </div>
          </div>
        )}
      </div>

      {/* Profile */}
      <div ref={profileRef} className="relative">
        <button
          type="button"
          onClick={() => { setShowProfile(v => !v); setShowNotif(false) }}
          className="flex items-center gap-2 p-1 pl-1 pr-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-900 transition"
        >
          <Avatar src={profile?.avatar_url} name={profile?.full_name} size="sm" />
          <ChevronDown size={13} className="text-slate-400" />
        </button>
        {showProfile && (
          <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lift overflow-hidden animate-fade-in">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-zinc-800">
              <div className="text-sm font-semibold truncate">{profile?.full_name ?? 'User'}</div>
              <div className="text-xs text-slate-500 dark:text-zinc-500 capitalize">{profile?.role}</div>
            </div>
            <button
              type="button"
              onClick={() => { setShowProfile(false); navigate(`${root}/profile`) }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-zinc-800"
            >
              <User size={15} /> My profile
            </button>
            <button
              type="button"
              onClick={() => { setShowProfile(false); toggle() }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-zinc-800"
            >
              <Settings size={15} /> Toggle theme
            </button>
            <hr className="border-slate-200 dark:border-zinc-800" />
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
            >
              <LogOut size={15} /> Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
