'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Check, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import type { Make, MakeStatus, MakeSteps } from '@/lib/supabase'

// Defined locally so supabase.ts (which creates the DB client) never gets bundled client-side
const MAKE_STEP_LABELS: Record<string, string> = {
  cut: 'Cut',
  press: 'Press',
  sew: 'Sew',
  quilt: 'Quilt',
  bind: 'Bind',
}
import { updateMakeStatus, updateMakeSteps, updateMakeName, deleteMake } from '@/app/actions/makes'

const STATUS_ORDER: MakeStatus[] = ['planning', 'making', 'made']

const STATUS_LABELS: Record<MakeStatus, string> = {
  planning: 'Planning',
  making: 'Making',
  made: 'Made! 🎉',
}

const STATUS_COLORS: Record<MakeStatus, string> = {
  planning: 'bg-[#F5F5F4] text-[#78716C] border-[#E7E5E4]',
  making: 'bg-[#FDF0E8] text-[#C2683A] border-[#F5D5C0]',
  made: 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]',
}

export default function MakeDetailClient({ make }: { make: Make }) {
  const router = useRouter()
  const [name, setName] = useState(make.name)
  const [isEditingName, setIsEditingName] = useState(false)
  const [status, setStatus] = useState<MakeStatus>(make.status)
  const [steps, setSteps] = useState<MakeSteps>(make.steps)
  const [expandedStep, setExpandedStep] = useState<keyof MakeSteps | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const stepKeys = Object.keys(steps) as Array<keyof MakeSteps>
  const doneCount = stepKeys.filter((k) => steps[k].done).length
  const progress = Math.round((doneCount / stepKeys.length) * 100)

  const currentStatusIdx = STATUS_ORDER.indexOf(status)
  const nextStatus = STATUS_ORDER[currentStatusIdx + 1] ?? null
  const prevStatus = STATUS_ORDER[currentStatusIdx - 1] ?? null

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
    setSteps((prev) => ({ ...prev, [key]: { ...prev[key], notes } }))
  }

  const handleNoteSave = async (key: keyof MakeSteps) => {
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
    <div className="min-h-screen bg-[#FAFAF8] pt-24 pb-16">
      <div className="max-w-2xl mx-auto px-6">

        {/* Back link */}
        <Link
          href="/makes"
          className="inline-flex items-center gap-1 text-sm text-[#78716C] hover:text-[#1C1917] transition-colors mb-6"
        >
          <ChevronLeft size={14} />
          My Makes
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1 min-w-0">
            {isEditingName ? (
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={handleNameSave}
                onKeyDown={(e) => { if (e.key === 'Enter') handleNameSave() }}
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
                className="text-sm text-[#A8A29E] hover:text-[#C2683A] transition-colors mt-1 inline-block"
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
            {prevStatus && (
              <button
                onClick={() => handleStatusChange(prevStatus)}
                className="p-1.5 rounded-lg border border-[#E7E5E4] text-[#A8A29E] hover:text-[#78716C] hover:border-[#D6D3D1] transition-colors cursor-pointer"
              >
                <ChevronLeft size={14} />
              </button>
            )}
            <span className={`flex-1 text-center text-sm font-semibold px-4 py-2 rounded-xl border ${STATUS_COLORS[status]}`}>
              {STATUS_LABELS[status]}
            </span>
            {nextStatus && (
              <button
                onClick={() => handleStatusChange(nextStatus)}
                className="p-1.5 rounded-lg border border-[#E7E5E4] text-[#A8A29E] hover:text-[#C2683A] hover:border-[#F5D5C0] transition-colors cursor-pointer"
              >
                <ChevronRight size={14} />
              </button>
            )}
          </div>

          {/* Status stepper */}
          <div className="flex items-center mt-4 gap-1">
            {STATUS_ORDER.map((s, i) => (
              <div key={s} className="flex items-center flex-1">
                <button
                  onClick={() => handleStatusChange(s)}
                  className={`flex-1 h-1.5 rounded-full transition-all cursor-pointer ${
                    STATUS_ORDER.indexOf(status) >= i ? 'bg-[#C2683A]' : 'bg-[#E7E5E4]'
                  }`}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1.5">
            {STATUS_ORDER.map((s) => (
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

        {/* Steps */}
        <div className="bg-white rounded-2xl border border-[#E7E5E4] overflow-hidden mb-4">
          <p className="text-xs font-medium text-[#A8A29E] uppercase tracking-wide px-5 pt-5 pb-3">Steps</p>
          {stepKeys.map((key, i) => {
            const step = steps[key]
            const isExpanded = expandedStep === key
            const isLast = i === stepKeys.length - 1

            return (
              <div key={key} className={`${!isLast ? 'border-b border-[#F5F5F4]' : ''}`}>
                <div className="flex items-center gap-3 px-5 py-4">
                  {/* Checkbox */}
                  <button
                    onClick={() => handleStepToggle(key)}
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all cursor-pointer ${
                      step.done
                        ? 'bg-[#C2683A] border-[#C2683A]'
                        : 'border-[#D6D3D1] hover:border-[#C2683A]'
                    }`}
                  >
                    {step.done && <Check size={11} className="text-white" strokeWidth={3} />}
                  </button>

                  {/* Label */}
                  <span className={`flex-1 text-sm font-medium ${step.done ? 'text-[#A8A29E] line-through' : 'text-[#1C1917]'}`}>
                    {MAKE_STEP_LABELS[key]}
                  </span>

                  {/* Notes indicator + expand */}
                  <div className="flex items-center gap-2">
                    {step.notes && (
                      <span className="text-[10px] bg-[#FDF0E8] text-[#C2683A] px-1.5 py-0.5 rounded-full">note</span>
                    )}
                    <button
                      onClick={() => setExpandedStep(isExpanded ? null : key)}
                      className="text-[#A8A29E] hover:text-[#78716C] transition-colors cursor-pointer"
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                </div>

                {/* Notes field */}
                {isExpanded && (
                  <div className="px-5 pb-4">
                    <textarea
                      value={step.notes}
                      onChange={(e) => handleNoteChange(key, e.target.value)}
                      onBlur={() => handleNoteSave(key)}
                      placeholder="Add notes for this step…"
                      rows={3}
                      className="w-full border border-[#E7E5E4] rounded-xl px-3 py-2.5 text-sm text-[#1C1917] focus:outline-none focus:border-[#C2683A] transition-colors resize-none placeholder:text-[#C4BFB9]"
                    />
                    <p className="text-xs text-[#A8A29E] mt-1">Notes save automatically</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Auto-save indicator */}
        {isSaving && (
          <p className="text-xs text-center text-[#A8A29E]">Saving…</p>
        )}

      </div>
    </div>
  )
}
