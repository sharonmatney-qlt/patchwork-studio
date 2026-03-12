'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Trash2, ExternalLink, Clock } from 'lucide-react'
import { SavedPattern } from '@/lib/supabase'
import { deletePattern } from '@/app/actions/patterns'
import { BLOCK_DEFS, PALETTES } from '@/config/blocks'

export default function DashboardClient({ patterns }: { patterns: SavedPattern[] }) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const router = useRouter()

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this pattern? This cannot be undone.')) return
    setDeletingId(id)
    await deletePattern(id)
    setDeletingId(null)
    router.refresh()
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {patterns.map((p) => (
        <PatternCard
          key={p.id}
          pattern={p}
          isDeleting={deletingId === p.id}
          onDelete={() => handleDelete(p.id)}
        />
      ))}
    </div>
  )
}

function PatternCard({
  pattern,
  isDeleting,
  onDelete,
}: {
  pattern: SavedPattern
  isDeleting: boolean
  onDelete: () => void
}) {
  const s = pattern.settings
  const block = BLOCK_DEFS[s.activeBlockIdx]
  const palette = PALETTES[s.activePaletteIdx]

  // Build a tiny color swatch from the palette's main colors
  const swatchColors = Object.values(palette.colors).slice(0, 8)
  const updatedAt = new Date(pattern.updated_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className={`bg-white rounded-2xl border border-[#E7E5E4] overflow-hidden group transition-all hover:shadow-md hover:border-[#D6D3D1] ${isDeleting ? 'opacity-50' : ''}`}>
      {/* Color swatch thumbnail */}
      <div className="h-32 grid" style={{ gridTemplateColumns: `repeat(${Math.min(swatchColors.length, 4)}, 1fr)` }}>
        {swatchColors.slice(0, 8).map((color, i) => (
          <div key={i} style={{ backgroundColor: color }} />
        ))}
      </div>

      {/* Card body */}
      <div className="p-4">
        <h3 className="font-semibold text-[#1C1917] text-sm mb-0.5 truncate">{pattern.name}</h3>
        <p className="text-xs text-[#78716C] mb-3">{block.label}</p>

        <div className="flex items-center gap-1.5 text-xs text-[#A8A29E] mb-4">
          <Clock size={11} />
          <span>{updatedAt}</span>
        </div>

        <div className="flex gap-2">
          <Link
            href={`/studio?pattern=${pattern.id}`}
            className="flex-1 flex items-center justify-center gap-1.5 bg-[#C2683A] text-white text-xs font-medium py-2 rounded-lg hover:bg-[#9A4F28] transition-colors"
          >
            <ExternalLink size={12} />
            Open
          </Link>
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="p-2 rounded-lg border border-[#E7E5E4] text-[#A8A29E] hover:text-red-500 hover:border-red-200 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
