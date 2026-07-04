// src/pages/user/UserProfile.jsx
import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { profileService } from '../../services/profileService'
import { supabase } from '../../supabaseClient'
import Icon from '../../components/Icon'

const TABS = ['Profile', 'Security']

export default function UserProfile() {
  const { profile, setProfile } = useAuth()
  const { showToast } = useToast()

  const [tab, setTab]         = useState('Profile')
  const [saving, setSaving]   = useState(false)

  const [form, setForm] = useState({
    full_name: profile?.full_name || '',
    phone:     profile?.phone     || '',
    bio:       profile?.bio       || '',
  })

  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false })

  const handleProfileSave = async () => {
    if (!form.full_name.trim()) { showToast('Name is required', 'error'); return }
    setSaving(true)
    try {
      const updated = await profileService.update(profile.id, form)
      if (setProfile) setProfile(p => ({ ...p, ...updated }))
      showToast('Profile updated!', 'success')
    } catch (e) {
      showToast(e.message || 'Update failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordSave = async () => {
    if (!pwForm.next || pwForm.next.length < 6) { showToast('Password must be at least 6 characters', 'error'); return }
    if (pwForm.next !== pwForm.confirm) { showToast('Passwords do not match', 'error'); return }
    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: pwForm.next })
      if (error) throw error
      showToast('Password changed!', 'success')
      setPwForm({ current: '', next: '', confirm: '' })
    } catch (e) {
      showToast(e.message || 'Password change failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  const initials = profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'

  return (
    <div className="page-content" style={{ maxWidth: 640, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>My Profile</h1>

      {/* Avatar card */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--brand-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand)', fontWeight: 800, fontSize: 26, fontFamily: 'Instrument Serif, serif', flexShrink: 0 }}>
          {initials}
        </div>
        <div>
          <p style={{ fontWeight: 700, fontSize: 18 }}>{profile?.full_name || '—'}</p>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{profile?.email}</p>
          <span style={{ display: 'inline-block', marginTop: 6, padding: '2px 10px', borderRadius: 20, background: 'var(--brand-light)', color: 'var(--brand)', fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>
            {profile?.role || 'User'}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '8px 18px', background: 'none', border: 'none', cursor: 'pointer',
            fontWeight: 600, fontSize: 14,
            color: tab === t ? 'var(--brand)' : 'var(--text-secondary)',
            borderBottom: tab === t ? '2px solid var(--brand)' : '2px solid transparent',
            marginBottom: -1,
            transition: 'all 0.15s',
          }}>{t}</button>
        ))}
      </div>

      {tab === 'Profile' && (
        <div className="card">
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 18 }}>Personal Information</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input className="form-input" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" value={profile?.email || ''} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Email cannot be changed here.</p>
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input className="form-input" type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 (555) 000-0000" />
            </div>
            <div className="form-group">
              <label className="form-label">Bio</label>
              <textarea className="form-input" rows={3} value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="Tell us a little about yourself…" style={{ resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={handleProfileSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'Security' && (
        <div className="card">
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 18 }}>Change Password</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { key: 'next',    label: 'New Password',     placeholder: 'At least 6 characters' },
              { key: 'confirm', label: 'Confirm Password', placeholder: 'Repeat new password'   },
            ].map(({ key, label, placeholder }) => (
              <div key={key} className="form-group">
                <label className="form-label">{label}</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="form-input"
                    type={showPw[key] ? 'text' : 'password'}
                    value={pwForm[key]}
                    onChange={e => setPwForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    style={{ paddingRight: 40 }}
                  />
                  <button onClick={() => setShowPw(p => ({ ...p, [key]: !p[key] }))} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                    <Icon name={showPw[key] ? 'eye-off' : 'eye'} size={16} />
                  </button>
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={handlePasswordSave} disabled={saving}>
                {saving ? 'Updating…' : 'Update Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
