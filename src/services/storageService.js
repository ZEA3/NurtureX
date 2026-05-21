// src/services/storageService.js
//
// Wraps Supabase Storage interactions for avatar images.
// Bucket:  "avatars"  (public read, authenticated write — see SQL schema)
// Path:    "<user-id>/avatar-<timestamp>.<ext>"

import { supabase } from '../supabaseClient'

const BUCKET = 'avatars'

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED   = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

export const storageService = {
  /**
   * Upload a File to the avatars bucket. Returns the public URL.
   */
  async uploadAvatar(userId, file) {
    if (!file) throw new Error('No file provided')
    if (!ALLOWED.includes(file.type)) throw new Error('Unsupported image type. Use PNG, JPG, WEBP, or GIF.')
    if (file.size > MAX_BYTES) throw new Error('Image too large (max 5 MB).')

    const ext  = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const path = `${userId}/avatar-${Date.now()}.${ext}`

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      })
    if (upErr) throw upErr

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
    return data.publicUrl
  },

  /**
   * Best-effort delete. Errors are swallowed — the row update is what matters.
   */
  async deleteByUrl(url) {
    if (!url) return
    // public URLs look like .../storage/v1/object/public/avatars/<path>
    const idx = url.indexOf(`/${BUCKET}/`)
    if (idx === -1) return
    const path = url.slice(idx + BUCKET.length + 2)
    await supabase.storage.from(BUCKET).remove([path]).catch(() => {})
  },
}
