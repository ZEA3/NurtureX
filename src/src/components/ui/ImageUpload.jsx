// src/components/ui/ImageUpload.jsx
//
// Avatar picker with live preview. Doesn't upload itself — the parent
// receives the File and decides when (e.g. on form submit) to upload.

import { useRef, useState, useEffect } from 'react'
import { Camera, Upload, X } from 'lucide-react'
import Avatar from './Avatar'
import Button from './Button'

export default function ImageUpload({
  value,                // current avatar URL (string) or null
  name = '',
  onFileSelected,       // (file: File | null) => void
  size = 96,            // visual size in px
  disabled,
}) {
  const inputRef = useRef(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [error, setError]           = useState('')

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const pick = () => inputRef.current?.click()

  const handle = (file) => {
    setError('')
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5 MB.')
      return
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(URL.createObjectURL(file))
    onFileSelected?.(file)
  }

  const clear = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setError('')
    onFileSelected?.(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const displayUrl = previewUrl ?? value

  return (
    <div className="flex items-center gap-4">
      <div className="relative" style={{ width: size, height: size }}>
        <Avatar src={displayUrl} name={name} size="xl" className="!h-full !w-full !text-3xl" />
        <button
          type="button"
          onClick={pick}
          disabled={disabled}
          className="absolute -bottom-1 -right-1 h-9 w-9 rounded-full bg-brand-700 hover:bg-brand-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black grid place-items-center shadow-card border-2 border-white dark:border-black transition disabled:opacity-50"
          aria-label="Choose image"
        >
          <Camera size={15} />
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(e) => handle(e.target.files?.[0])}
          disabled={disabled}
        />
        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={pick} disabled={disabled}>
            <Upload size={14} /> Upload image
          </Button>
          {(previewUrl || value) && (
            <Button type="button" variant="ghost" size="sm" onClick={clear} disabled={disabled}>
              <X size={14} /> Clear
            </Button>
          )}
        </div>
        <p className="text-xs text-slate-500 dark:text-zinc-500">PNG, JPG, WEBP, or GIF — max 5 MB</p>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </div>
  )
}
