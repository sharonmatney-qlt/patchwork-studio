'use client'

import type { PatternSettings } from '@/lib/supabase'
import { computePatternColors, fmtIn } from '@/lib/pattern-utils'
import { BLOCK_DEFS } from '@/config/blocks'

interface PatternPreviewProps {
  settings: PatternSettings
  className?: string
}

export default function PatternPreview({ settings, className = '' }: PatternPreviewProps) {
  const { colors, cols, rows, cutSize, finishedW, finishedH, sizeName } = computePatternColors(settings)
  const blockLabel = BLOCK_DEFS[settings.activeBlockIdx]?.label ?? 'Unknown'

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* Quilt grid */}
      <div
        className="w-full rounded-xl overflow-hidden border border-[#E7E5E4]"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          aspectRatio: `${cols} / ${rows}`,
        }}
      >
        {colors.map((color, i) => (
          <div key={i} style={{ backgroundColor: color }} />
        ))}
      </div>

      {/* Dimensions */}
      <div className="flex items-center justify-between text-xs text-[#78716C] px-1">
        <span className="font-medium text-[#1C1917]">{sizeName}</span>
        <span>{fmtIn(finishedW)} × {fmtIn(finishedH)}</span>
        <span>{cutSize}" cut · {cols}×{rows}</span>
      </div>
    </div>
  )
}
