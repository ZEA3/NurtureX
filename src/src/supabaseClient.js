// src/supabaseClient.js
//
// Reads Supabase credentials from Vite environment variables.
//
// LOCAL DEVELOPMENT
//   • Create a file called  .env  in the project root (same folder as package.json)
//   • Add these two lines (no quotes needed):
//       VITE_SUPABASE_URL=https://your-project-ref.supabase.co
//       VITE_SUPABASE_ANON_KEY=eyJ...your-anon-key...
//   • Restart npm run dev — Vite only reads .env on startup.
//
// VERCEL DEPLOYMENT
//   • Go to: Vercel Dashboard → Your Project → Settings → Environment Variables
//   • Add VITE_SUPABASE_URL  and  VITE_SUPABASE_ANON_KEY  there.
//   • Redeploy after saving.
//
// WHERE TO FIND YOUR VALUES
//   Supabase Dashboard → Project Settings → API
//   • "Project URL"          → VITE_SUPABASE_URL
//   • "anon / public" key    → VITE_SUPABASE_ANON_KEY
//   ⚠️  Never use the service_role key in browser code — it bypasses RLS.

import { createClient } from '@supabase/supabase-js'

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// ── Guard: fail loudly instead of silently connecting to localhost ──
if (!supabaseUrl || !supabaseAnonKey) {
  const msg =
    '[NurtureX] Supabase credentials not found.\n\n' +
    'LOCAL: Create a .env file in the project root:\n' +
    '  VITE_SUPABASE_URL=https://your-ref.supabase.co\n' +
    '  VITE_SUPABASE_ANON_KEY=your-anon-key\n\n' +
    'VERCEL: Add both variables in Project → Settings → Environment Variables.\n\n' +
    'Find your values at: Supabase Dashboard → Project Settings → API'

  // Show a visible error in the browser instead of a silent crash
  document.addEventListener('DOMContentLoaded', () => {
    document.body.innerHTML = `
      <div style="font-family:system-ui;max-width:560px;margin:80px auto;padding:24px;
                  border:2px solid #ef4444;border-radius:12px;background:#fef2f2;color:#991b1b">
        <h2 style="margin:0 0 12px;font-size:18px">⚠️ Supabase Not Configured</h2>
        <p style="margin:0 0 16px;font-size:14px;line-height:1.6">
          The app cannot connect because Supabase credentials are missing.
        </p>
        <pre style="background:#fee2e2;padding:12px;border-radius:8px;font-size:12px;
                    overflow-x:auto;margin:0 0 16px;white-space:pre-wrap">
LOCAL — create <strong>.env</strong> in the project root:
VITE_SUPABASE_URL=https://your-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

VERCEL — add both vars in:
Project → Settings → Environment Variables
        </pre>
        <p style="margin:0;font-size:13px">
          Find your values at:<br/>
          <a href="https://supabase.com/dashboard" target="_blank"
             style="color:#dc2626">Supabase Dashboard → Project Settings → API</a>
        </p>
      </div>`
  })

  // Still export a non-crashing client so imports don't break
  // but every call will fail with a clear message
  console.error(msg)
}

// ── Main client ─────────────────────────────────────────────────────
// Used everywhere in the app.
// Falls back to empty strings so createClient doesn't throw at import
// time, but all API calls will fail until real credentials are provided.
export const supabase = createClient(
  supabaseUrl     || '',
  supabaseAnonKey || '',
  {
    auth: {
      persistSession:     true,
      autoRefreshToken:   true,
      detectSessionInUrl: true,
      storageKey:         'nurturex.auth',
    },
  }
)

// ── Admin-scope client ───────────────────────────────────────────────
// Used for creating new doctor accounts without overwriting the admin
// session. Does NOT persist any session.
export const supabaseAdminScope = createClient(
  supabaseUrl     || '',
  supabaseAnonKey || '',
  {
    auth: {
      persistSession:   false,
      autoRefreshToken: false,
      storageKey:       'nurturex.admin-scope',
    },
  }
)
