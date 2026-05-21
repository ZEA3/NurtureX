// src/pages/doctor/DoctorAITools.jsx
//
// AI Tools panel — three placeholder modules:
//   1. Baby Cry Analyzer       (audio upload)
//   2. Food Safety Scanner     (image upload)
//   3. Early Risk Detection    (form-based)
//
// These are placeholders. The "Analyze" button currently shows a fake result
// after a 1.5s delay. To wire to a real AI service, replace the analyse()
// stubs at the marked TODO comments.

import { useState, useRef } from 'react'
import {
  Mic, Upload, Sparkles, Camera, Activity, AlertCircle, RefreshCw, CheckCircle2,
} from 'lucide-react'
import Button from '../../components/ui/Button'
import { Field, Input, Select } from '../../components/ui/Field'
import { cn } from '../../utils/cn'

export default function DoctorAITools() {
  return (
    <>
      <div className="mb-7">
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400">
            <Sparkles size={11} /> AI assisted
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">AI Tools</h1>
        <p className="text-sm text-slate-500 dark:text-zinc-500 mt-1">Audio, vision and risk-detection helpers powered by AI.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <CryAnalyzer />
        <FoodScanner />
        <RiskDetection />
      </div>

      <div className="mt-6 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-300 flex gap-2.5">
        <AlertCircle size={16} className="shrink-0 mt-0.5" />
        <div>
          <strong>These are placeholder UIs.</strong> They simulate results to
          showcase the workflow. Look for the <code className="font-mono text-xs">// TODO: connect AI service</code> comments
          inside each tool to wire up your actual backend.
        </div>
      </div>
    </>
  )
}

/* ─────────────────────────── Cry Analyzer ─────────────────────────── */

const FAKE_CRY_RESULTS = [
  { label: 'Hunger',        confidence: 0.78, color: 'bg-amber-500' },
  { label: 'Discomfort',    confidence: 0.12, color: 'bg-orange-500' },
  { label: 'Pain',          confidence: 0.06, color: 'bg-red-500' },
  { label: 'Sleepiness',    confidence: 0.04, color: 'bg-purple-500' },
]

function CryAnalyzer() {
  const fileInput = useRef(null)
  const [file,    setFile]    = useState(null)
  const [running, setRunning] = useState(false)
  const [result,  setResult]  = useState(null)
  const [error,   setError]   = useState('')

  const reset = () => { setFile(null); setResult(null); setError(''); if (fileInput.current) fileInput.current.value = '' }

  const onPick = (e) => {
    const f = e.target.files?.[0]
    setError('')
    if (!f) return
    if (!f.type.startsWith('audio/')) { setError('Please upload an audio file.'); return }
    if (f.size > 10 * 1024 * 1024)    { setError('File must be under 10 MB.'); return }
    setFile(f); setResult(null)
  }

  const analyse = async () => {
    if (!file) return
    setRunning(true); setError('')
    try {
      // TODO: connect AI service
      // Replace this delay with a fetch to your cry-classification endpoint:
      //   const fd = new FormData(); fd.append('audio', file)
      //   const res = await fetch('/api/cry-analyze', { method: 'POST', body: fd })
      //   setResult(await res.json())
      await new Promise(r => setTimeout(r, 1500))
      setResult(FAKE_CRY_RESULTS)
    } catch (err) {
      setError('Analysis failed. Try again.')
    } finally {
      setRunning(false)
    }
  }

  return (
    <ToolCard icon={Mic} title="Baby Cry Analyzer" subtitle="Upload audio to classify the cry." accent="bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400">
      <input ref={fileInput} type="file" accept="audio/*" onChange={onPick} className="hidden" id="cry-input" />
      {!file ? (
        <label htmlFor="cry-input" className="block w-full cursor-pointer rounded-lg border-2 border-dashed border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950 px-5 py-8 text-center hover:border-brand-500 hover:bg-brand-50/40 dark:hover:border-zinc-500 dark:hover:bg-zinc-900 transition">
          <Upload size={22} className="mx-auto text-slate-400 mb-2" />
          <div className="text-sm font-semibold text-slate-700 dark:text-zinc-200">Click to upload audio</div>
          <div className="text-[11px] text-slate-500 dark:text-zinc-500 mt-0.5">MP3, WAV, M4A — up to 10 MB</div>
        </label>
      ) : (
        <div className="space-y-3">
          <div className="rounded-lg bg-slate-50 dark:bg-zinc-950 p-3 text-xs">
            <div className="font-semibold text-slate-900 dark:text-white truncate">{file.name}</div>
            <div className="text-slate-500 dark:text-zinc-500">{(file.size / 1024).toFixed(1)} KB</div>
            <audio controls className="w-full mt-2 h-9" src={URL.createObjectURL(file)} />
          </div>
          {error && <ErrorBanner>{error}</ErrorBanner>}
          {!result ? (
            <div className="flex gap-2">
              <Button onClick={analyse} loading={running} className="flex-1">
                {!running && <><Sparkles size={13} /> Analyze</>}
              </Button>
              <Button variant="ghost" onClick={reset}><RefreshCw size={13} /></Button>
            </div>
          ) : (
            <ResultPanel onReset={reset}>
              <div className="space-y-2">
                {result.map(r => (
                  <div key={r.label}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-700 dark:text-zinc-200">{r.label}</span>
                      <span className="text-slate-500 dark:text-zinc-500">{Math.round(r.confidence * 100)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                      <div className={cn('h-full rounded-full', r.color)} style={{ width: `${r.confidence * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </ResultPanel>
          )}
        </div>
      )}
    </ToolCard>
  )
}

/* ─────────────────────────── Food Scanner ─────────────────────────── */

function FoodScanner() {
  const fileInput = useRef(null)
  const [file,    setFile]    = useState(null)
  const [preview, setPreview] = useState('')
  const [running, setRunning] = useState(false)
  const [result,  setResult]  = useState(null)
  const [error,   setError]   = useState('')

  const reset = () => {
    if (preview) URL.revokeObjectURL(preview)
    setFile(null); setPreview(''); setResult(null); setError('')
    if (fileInput.current) fileInput.current.value = ''
  }

  const onPick = (e) => {
    const f = e.target.files?.[0]
    setError('')
    if (!f) return
    if (!f.type.startsWith('image/')) { setError('Please upload an image.'); return }
    if (f.size > 5 * 1024 * 1024)     { setError('File must be under 5 MB.'); return }
    setFile(f); setPreview(URL.createObjectURL(f)); setResult(null)
  }

  const analyse = async () => {
    if (!file) return
    setRunning(true); setError('')
    try {
      // TODO: connect AI service
      // Send the image to your food-safety endpoint:
      //   const fd = new FormData(); fd.append('image', file)
      //   const res = await fetch('/api/food-scan', { method: 'POST', body: fd })
      //   setResult(await res.json())
      await new Promise(r => setTimeout(r, 1500))
      setResult({
        verdict: 'safe',
        title: 'Looks safe',
        notes: 'No common allergens or harmful ingredients detected. Always introduce new foods one at a time.',
      })
    } catch (err) {
      setError('Scan failed. Try again.')
    } finally {
      setRunning(false)
    }
  }

  return (
    <ToolCard icon={Camera} title="Food Safety Scanner" subtitle="Upload food photo for safety analysis." accent="bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
      <input ref={fileInput} type="file" accept="image/*" onChange={onPick} className="hidden" id="food-input" />
      {!file ? (
        <label htmlFor="food-input" className="block w-full cursor-pointer rounded-lg border-2 border-dashed border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950 px-5 py-8 text-center hover:border-brand-500 hover:bg-brand-50/40 dark:hover:border-zinc-500 dark:hover:bg-zinc-900 transition">
          <Camera size={22} className="mx-auto text-slate-400 mb-2" />
          <div className="text-sm font-semibold text-slate-700 dark:text-zinc-200">Click to upload image</div>
          <div className="text-[11px] text-slate-500 dark:text-zinc-500 mt-0.5">PNG, JPG, WebP — up to 5 MB</div>
        </label>
      ) : (
        <div className="space-y-3">
          <div className="rounded-lg overflow-hidden bg-slate-100 dark:bg-zinc-950">
            <img src={preview} alt="" className="w-full h-40 object-cover" />
          </div>
          {error && <ErrorBanner>{error}</ErrorBanner>}
          {!result ? (
            <div className="flex gap-2">
              <Button onClick={analyse} loading={running} className="flex-1">
                {!running && <><Sparkles size={13} /> Scan</>}
              </Button>
              <Button variant="ghost" onClick={reset}><RefreshCw size={13} /></Button>
            </div>
          ) : (
            <ResultPanel onReset={reset}>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 size={18} className="text-emerald-600" />
                <span className="font-bold text-slate-900 dark:text-white">{result.title}</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">{result.notes}</p>
            </ResultPanel>
          )}
        </div>
      )}
    </ToolCard>
  )
}

/* ─────────────────────────── Risk Detection ─────────────────────────── */

function RiskDetection() {
  const [form, setForm] = useState({ age_months: '', weight_kg: '', height_cm: '', symptoms: 'none' })
  const [running, setRunning] = useState(false)
  const [result,  setResult]  = useState(null)

  const analyse = async (e) => {
    e.preventDefault()
    setRunning(true)
    try {
      // TODO: connect AI service
      // POST `form` to your risk-detection endpoint:
      //   const res = await fetch('/api/risk-detect', { method: 'POST', body: JSON.stringify(form) })
      //   setResult(await res.json())
      await new Promise(r => setTimeout(r, 1200))
      const score = Math.random()
      setResult({
        score: Math.round(score * 100),
        level: score < 0.33 ? 'low' : score < 0.66 ? 'moderate' : 'high',
      })
    } finally {
      setRunning(false)
    }
  }

  const reset = () => { setResult(null); setForm({ age_months: '', weight_kg: '', height_cm: '', symptoms: 'none' }) }

  const levelStyles = {
    low:      'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
    moderate: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
    high:     'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  }

  return (
    <ToolCard icon={Activity} title="Early Risk Detection" subtitle="Quick health screening signals." accent="bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
      {!result ? (
        <form onSubmit={analyse}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Age (months)"><Input type="number" value={form.age_months} onChange={(e) => setForm(f => ({ ...f, age_months: e.target.value }))} required disabled={running} /></Field>
            <Field label="Weight (kg)"><Input type="number" step="0.1" value={form.weight_kg} onChange={(e) => setForm(f => ({ ...f, weight_kg: e.target.value }))} required disabled={running} /></Field>
            <Field label="Height (cm)"><Input type="number" step="0.1" value={form.height_cm} onChange={(e) => setForm(f => ({ ...f, height_cm: e.target.value }))} required disabled={running} /></Field>
            <Field label="Symptoms">
              <Select value={form.symptoms} onChange={(e) => setForm(f => ({ ...f, symptoms: e.target.value }))} disabled={running}>
                <option value="none">None</option>
                <option value="fever">Fever</option>
                <option value="cough">Cough</option>
                <option value="rash">Rash</option>
                <option value="lethargy">Lethargy</option>
              </Select>
            </Field>
          </div>
          <Button type="submit" loading={running} className="w-full mt-2">
            {!running && <><Sparkles size={13} /> Run analysis</>}
          </Button>
        </form>
      ) : (
        <ResultPanel onReset={reset}>
          <div className={cn('rounded-lg px-4 py-5 text-center', levelStyles[result.level])}>
            <div className="text-4xl font-extrabold tracking-tight">{result.score}</div>
            <div className="text-[11px] font-bold uppercase tracking-wider mt-1">{result.level} risk</div>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-500 mt-3 leading-relaxed">
            This is a screening signal only — confirm with a clinical assessment.
          </p>
        </ResultPanel>
      )}
    </ToolCard>
  )
}

/* ─────────────────────────── Shared bits ─────────────────────────── */

function ToolCard({ icon: Icon, title, subtitle, accent, children }) {
  return (
    <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className={'h-10 w-10 rounded-xl grid place-items-center ' + accent}>
          <Icon size={18} />
        </div>
        <div>
          <h2 className="font-bold text-slate-900 dark:text-white leading-tight">{title}</h2>
          <p className="text-xs text-slate-500 dark:text-zinc-500">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

function ResultPanel({ children, onReset }) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 p-4">
      {children}
      <Button variant="ghost" size="sm" onClick={onReset} className="mt-3 w-full">
        <RefreshCw size={12} /> Try another
      </Button>
    </div>
  )
}

function ErrorBanner({ children }) {
  return (
    <div className="rounded-lg border-l-[3px] border-red-500 bg-red-50 dark:bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-400 flex gap-2">
      <AlertCircle size={13} className="shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  )
}
