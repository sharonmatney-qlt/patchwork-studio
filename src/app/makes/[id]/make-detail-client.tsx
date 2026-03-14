'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Check, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import Nav from '@/components/nav'
import PatternPreview from '@/components/pattern-preview'
import StepPhotos from '@/components/step-photos'
import type { Make, MakeStatus, MakeSteps, MakePhoto } from '@/lib/supabase'
import { computePatternColors, computeFabricCounts } from '@/lib/pattern-utils'
import { updateMakeStatus, updateMakeSteps, updateMakeName, deleteMake } from '@/app/actions/makes'

// Defined locally so supabase.ts (which creates the DB client) never gets bundled client-side
const MAKE_STEP_LABELS: Record<string, string> = {
  cut:   'Cut',
  piece: 'Piece',
  layer: 'Layer',
  quilt: 'Quilt',
  bind:  'Bind',
}

const MAKE_STEP_DESCRIPTIONS: Record<string, string> = {
  cut:   'Cut all fabric squares according to the fabric requirements below.',
  piece: 'Lay out squares per the pattern. Sew with ¼" seam allowance using your preferred method. Press rows in opposite directions and nest seams. Sew rows together and press.',
  layer: 'Layer backing (wrong side up), batting, and quilt top (right side up). Baste to secure all three layers.',
  quilt: 'Quilt according to your preference.',
  bind:  'Trim excess batting and backing. Attach binding and hand or machine stitch to finish.',
}

const STATUS_ORDER: MakeStatus[] = ['planning', 'making', 'made']
const STATUS_LABELS: Record<MakeStatus, string> = {
  planning: 'Planning',
  making:   'Making',
  made:     'Made! 🎉',
}
const STATUS_COLORS: Record<MakeStatus, string> = {
  planning: 'bg-[#F5F5F4] text-[#78716C] border-[#E7E5E4]',
  making:   'bg-[#FDF0E8] text-[#C2683A] border-[#F5D5C0]',
  made:     'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]',
}

export default function MakeDetailClient({ make, initialPhotos }: { make: Make; initialPhotos: MakePhoto[] }) {
  const router = useRouter()
  const [name, setName]                   = useState(make.name)
  const [isEditingName, setIsEditingName] = useState(false)
  const [status, setStatus]               = useState<MakeStatus>(make.status)
  const [steps, setSteps]                 = useState<MakeSteps>(make.steps)
  const [expandedStep, setExpandedStep]   = useState<keyof MakeSteps | null>(null)
  const [isSaving, setIsSaving]           = useState(false)
  const [isDeleting, setIsDeleting]       = useState(false)
  const [photos, setPhotos]               = useState<MakePhoto[]>(initialPhotos)

  // Per-step photo helpers — keep in sync as uploads/deletes happen
  const stepPhotos = (key: string) => photos.filter(p => p.step === key)
  const stepPhotoCount = (key: string) => photos.filter(p => p.step === key).length

  // Explicit order — Object.keys() on JSONB from DB doesn't guarantee order
  const stepKeys: Array<keyof MakeSteps> = ['cut', 'piece', 'layer', 'quilt', 'bind']
  const doneCount = stepKeys.filter(k => steps[k].done).length
  const progress  = Math.round((doneCount / stepKeys.length) * 100)
  const currentStatusIdx = STATUS_ORDER.indexOf(status)

  // Fabric counts derived from pattern settings
  const fabricCounts = make.pattern
    ? computeFabricCounts(computePatternColors(make.pattern.settings))
    : []
  const totalSquares = fabricCounts.reduce((s, f) => s + f.count, 0)

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleNameSave = async () => {
    if (name.trim() === make.name) { setIsEditingName(false); return }
    await updateMakeName(make.id, name.trim())
    setIsEditingName(false)
    router.refresh()
  }

  const handleStatusChange = async (newStatus: MakeStatus) => {
    setStatus(newStatus)
    await updateMakeStatus(make.id, newStatus)
    router.refresh()
  }

  const handleStepToggle = async (key: keyof MakeSteps) => {
    const updated = { ...steps, [key]: { ...steps[key], done: !steps[key].done } }
    setSteps(updated)
    setIsSaving(true)
    await updateMakeSteps(make.id, updated)
    setIsSaving(false)
  }

  const handleNoteChange = (key: keyof MakeSteps, notes: string) => {
    setSteps(prev => ({ ...prev, [key]: { ...prev[key], notes } }))
  }

  const handleNoteSave = async () => {
    setIsSaving(true)
    await updateMakeSteps(make.id, steps)
    setIsSaving(false)
  }

  const handleDelete = async () => {
    if (!confirm('Delete this make? This cannot be undone.')) return
    setIsDeleting(true)
    await deleteMake(make.id)
    router.push('/makes')
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <Nav />

      <div className="flex" style={{ paddingTop: '64px', minHeight: 'calc(100vh - 64px)' }}>

        {/* ── Left pane: pattern preview ──────────────────────────────── */}
        <aside
          className="hidden lg:flex flex-col w-[420px] xl:w-[480px] flex-shrink-0 border-r border-[#E7E5E4] bg-white sticky top-16 self-start"
          style={{ height: 'calc(100vh - 64px)', overflowY: 'auto' }}
        >
          <div className="p-6 flex flex-col gap-4 h-full">
            <Link
              href="/makes"
              className="inline-flex items-center gap-1 text-xs text-[#A8A29E] hover:text-[#78716C] transition-colors"
            >
              <ChevronLeft size={12} />
              My Makes
            </Link>

            {make.pattern ? (
              <>
                <PatternPreview settings={make.pattern.settings} />
                <div className="pt-3 border-t border-[#F5F5F4]">
                  <p className="text-xs text-[#A8A29E] mb-1">Pattern</p>
                  <Link
                    href={`/studio?pattern=${make.pattern_id}`}
                    className="text-sm font-medium text-[#1C1917] hover:text-[#C2683A] transition-colors"
                  >
                    {make.pattern.name} →
                  </Link>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-[#A8A29E]">
                No pattern linked
              </div>
            )}
          </div>
        </aside>

        {/* ── Right pane: make details ─────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-6 py-8">

            {/* Mobile back */}
            <Link
              href="/makes"
              className="lg:hidden inline-flex items-center gap-1 text-sm text-[#78716C] hover:text-[#1C1917] transition-colors mb-4"
            >
              <ChevronLeft size={14} />
              My Makes
            </Link>

            {/* Mobile pattern preview */}
            {make.pattern && (
              <div className="lg:hidden bg-white rounded-2xl border border-[#E7E5E4] p-4 mb-4">
                <PatternPreview settings={make.pattern.settings} />
              </div>
            )}

            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1 min-w-0">
                {isEditingName ? (
                  <input
                    autoFocus
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onBlur={handleNameSave}
                    onKeyDown={e => { if (e.key === 'Enter') handleNameSave() }}
                    className="text-2xl font-semibold text-[#1C1917] bg-transparent border-b-2 border-[#C2683A] outline-none w-full"
                  />
                ) : (
                  <h1
                    className="text-2xl font-semibold text-[#1C1917] cursor-pointer hover:text-[#C2683A] transition-colors"
                    onClick={() => setIsEditingName(true)}
                    title="Click to rename"
                  >
                    {name}
                  </h1>
                )}
                {make.pattern && (
                  <Link
                    href={`/studio?pattern=${make.pattern_id}`}
                    className="lg:hidden text-sm text-[#A8A29E] hover:text-[#C2683A] transition-colors mt-0.5 inline-block"
                  >
                    {make.pattern.name} →
                  </Link>
                )}
              </div>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="ml-4 p-2 rounded-lg text-[#A8A29E] hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Trash2 size={16} />
              </button>
            </div>

            {/* Status */}
            <div className="bg-white rounded-2xl border border-[#E7E5E4] p-5 mb-4">
              <p className="text-xs font-medium text-[#A8A29E] uppercase tracking-wide mb-3">Status</p>
              <div className="flex items-center gap-2">
                {currentStatusIdx > 0 && (
                  <button
                    onClick={() => handleStatusChange(STATUS_ORDER[currentStatusIdx - 1])}
                    className="p-1.5 rounded-lg border border-[#E7E5E4] text-[#A8A29E] hover:text-[#78716C] hover:border-[#D6D3D1] transition-colors cursor-pointer"
                  >
                    <ChevronLeft size={14} />
                  </button>
                )}
                <span className={`flex-1 text-center text-sm font-semibold px-4 py-2 rounded-xl border ${STATUS_COLORS[status]}`}>
                  {STATUS_LABELS[status]}
                </span>
                {currentStatusIdx < STATUS_ORDER.length - 1 && (
                  <button
                    onClick={() => handleStatusChange(STATUS_ORDER[currentStatusIdx + 1])}
                    className="p-1.5 rounded-lg border border-[#E7E5E4] text-[#A8A29E] hover:text-[#C2683A] hover:border-[#F5D5C0] transition-colors cursor-pointer"
                  >
                    <ChevronRight size={14} />
                  </button>
                )}
              </div>
              <div className="flex items-center mt-4 gap-1">
                {STATUS_ORDER.map((s, i) => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    className={`flex-1 h-1.5 rounded-full transition-all cursor-pointer ${STATUS_ORDER.indexOf(status) >= i ? 'bg-[#C2683A]' : 'bg-[#E7E5E4]'}`}
                  />
                ))}
              </div>
              <div className="flex justify-between mt-1.5">
                {STATUS_ORDER.map(s => (
                  <span key={s} className={`text-[10px] ${status === s ? 'text-[#C2683A] font-medium' : 'text-[#A8A29E]'}`}>
                    {STATUS_LABELS[s]}
                  </span>
                ))}
              </div>
            </div>

            {/* Progress */}
            <div className="bg-white rounded-2xl border border-[#E7E5E4] p-5 mb-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-[#A8A29E] uppercase tracking-wide">Progress</p>
                <span className="text-sm font-semibold text-[#1C1917]">{doneCount} of {stepKeys.length} steps</span>
              </div>
              <div className="h-2 bg-[#F5F5F4] rounded-full overflow-hidden mb-1">
                <div
                  className="h-full bg-[#C2683A] rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-right text-xs text-[#A8A29E]">{progress}%</p>
            </div>

            {/* Fabric requirements */}
            {fabricCounts.length > 0 && (
              <div className="bg-white rounded-2xl border border-[#E7E5E4] overflow-hidden mb-4">
                <div className="px-5 pt-5 pb-3 border-b border-[#F5F5F4]">
                  <p className="text-xs font-medium text-[#A8A29E] uppercase tracking-wide">Fabric Requirements</p>
                  <p className="text-xs text-[#A8A29E] mt-0.5">{totalSquares} total squares</p>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#F5F5F4]">
                      <th className="text-left text-[10px] font-medium text-[#A8A29E] uppercase tracking-wide px-5 py-2.5">Color</th>
                      <th className="text-right text-[10px] font-medium text-[#A8A29E] uppercase tracking-wide px-5 py-2.5">Squares</th>
                      <th className="text-right text-[10px] font-medium text-[#A8A29E] uppercase tracking-wide px-5 py-2.5">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fabricCounts.map(({ hex, count }, i) => (
                      <tr key={i} className="border-b border-[#F5F5F4] last:border-0">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-5 h-5 rounded-md border border-black/10 flex-shrink-0"
                              style={{ backgroundColor: hex }}
                            />
                            <span className="text-xs font-mono text-[#78716C]">{hex.toUpperCase()}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-right text-sm font-medium text-[#1C1917]">{count}</td>
                        <td className="px-5 py-3 text-right text-xs text-[#A8A29E]">
                          {Math.round((count / totalSquares) * 100)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Assembly */}
            <div className="bg-white rounded-2xl border border-[#E7E5E4] overflow-hidden mb-4">
              <div className="px-5 pt-5 pb-3 border-b border-[#F5F5F4]">
                <p className="text-xs font-medium text-[#A8A29E] uppercase tracking-wide">Assembly</p>
              </div>
              {stepKeys.map((key, i) => {
                const step     = steps[key]
                const isExpanded = expandedStep === key
                const isLast   = i === stepKeys.length - 1

                return (
                  <div key={String(key)} className={`${!isLast ? 'border-b border-[#F5F5F4]' : ''}`}>
                    <div className="flex items-center gap-3 px-5 py-4">
                      {/* Step number bubble */}
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold transition-all ${step.done ? 'bg-[#C2683A] text-white' : 'bg-[#F5F5F4] text-[#A8A29E]'}`}>
                        {step.done ? <Check size={10} strokeWidth={3} /> : i + 1}
                      </div>

                      {/* Checkbox */}
                      <button
                        onClick={() => handleStepToggle(key)}
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all cursor-pointer ${step.done ? 'bg-[#C2683A] border-[#C2683A]' : 'border-[#D6D3D1] hover:border-[#C2683A]'}`}
                      >
                        {step.done && <Check size={11} className="text-white" strokeWidth={3} />}
                      </button>

                      {/* Label */}
                      <span className={`flex-1 text-sm font-medium ${step.done ? 'text-[#A8A29E] line-through' : 'text-[#1C1917]'}`}>
                        {MAKE_STEP_LABELS[String(key)]}
                      </span>

                      <div className="flex items-center gap-2">
                        {step.notes && (
                          <span className="text-[10px] bg-[#FDF0E8] text-[#C2683A] px-1.5 py-0.5 rounded-full">note</span>
                        )}
                        {stepPhotoCount(String(key)) > 0 && (
                          <span className="text-[10px] bg-[#F0F9FF] text-[#0284C7] px-1.5 py-0.5 rounded-full">
                            {stepPhotoCount(String(key))} 📷
                          </span>
                        )}
                        <button
                          onClick={() => setExpandedStep(isExpanded ? null : key)}
                          className="text-[#A8A29E] hover:text-[#78716C] transition-colors cursor-pointer"
                        >
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-5 pb-4 ml-14">
                        <p className="text-xs text-[#78716C] mb-3 leading-relaxed">
                          {MAKE_STEP_DESCRIPTIONS[String(key)]}
                        </p>
                        <textarea
                          value={step.notes}
                          onChange={e => handleNoteChange(key, e.target.value)}
                          onBlur={handleNoteSave}
                          placeholder="Add your own notes for this step…"
                          rows={3}
                          className="w-full border border-[#E7E5E4] rounded-xl px-3 py-2.5 text-sm text-[#1C1917] focus:outline-none focus:border-[#C2683A] transition-colors resize-none placeholder:text-[#C4BFB9]"
                        />
                        <p className="text-xs text-[#A8A29E] mt-1 mb-3">Notes save automatically</p>

                        {/* Step photos */}
                        <StepPhotos
                          makeId={make.id}
                          step={String(key)}
                          initialPhotos={stepPhotos(String(key))}
                          onAdd={photo => setPhotos(prev => [...prev, photo])}
                          onRemove={id => setPhotos(prev => prev.filter(p => p.id !== id))}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {isSaving && <p className="text-xs text-center text-[#A8A29E] mt-2">Saving…</p>}

          </div>
        </main>
      </div>
    </div>
  )
}
