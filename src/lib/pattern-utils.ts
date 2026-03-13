// ─── Shared pattern computation utilities ─────────────────────────────────────
// Pure functions used by both the studio (interactive) and pattern preview (read-only).
// No React dependencies — safe to import anywhere.

import {
  NEUTRAL, BLOCK_DEFS, PALETTES,
  type BlockDef, type SecondaryMode, type SashingConfig,
} from '@/config/blocks'
import type { PatternSettings } from '@/lib/supabase'

export { NEUTRAL }

// ─── Square / grid presets ────────────────────────────────────────────────────

export const SQUARE_PRESETS = [
  { label: '2.5"', value: 2.5, note: 'Mini charm' },
  { label: '5"',   value: 5,   note: 'Charm square' },
  { label: '10"',  value: 10,  note: 'Layer cake' },
]

export const GRID_PRESETS = [
  { cols: 9,  rows: 7  },
  { cols: 13, rows: 11 },
  { cols: 17, rows: 13 },
  { cols: 21, rows: 17 },
]

// ─── Dimension helpers ────────────────────────────────────────────────────────

export function finishedSq(cutIn: number): number { return cutIn - 0.5 }

export function quiltFinishedDims(cols: number, rows: number, cutIn: number) {
  const fs = finishedSq(cutIn)
  return { w: cols * fs, h: rows * fs }
}

export function quiltSizeName(wIn: number): string {
  if (wIn < 24) return 'Mini'
  if (wIn < 48) return 'Baby'
  if (wIn < 65) return 'Throw'
  if (wIn < 80) return 'Full'
  if (wIn < 98) return 'Queen'
  return 'King'
}

export function fmtIn(n: number): string {
  const whole = Math.floor(n), frac = n - whole
  if (frac === 0)                      return `${whole}"`
  if (Math.abs(frac - 0.25) < 0.001)  return `${whole}¼"`
  if (Math.abs(frac - 0.5)  < 0.001)  return `${whole}½"`
  if (Math.abs(frac - 0.75) < 0.001)  return `${whole}¾"`
  return `${n.toFixed(2).replace(/\.?0+$/, '')}"`
}

// ─── Color utilities ──────────────────────────────────────────────────────────

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)]
}
export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r,g,b].map(v => Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('')
}
export function shadeDark(hex: string, amount = 0.35): string {
  const [r,g,b] = hexToRgb(hex)
  return rgbToHex(r*(1-amount), g*(1-amount), b*(1-amount))
}
export function shadeLight(hex: string, amount = 0.45): string {
  const [r,g,b] = hexToRgb(hex)
  return rgbToHex(r+(255-r)*amount, g+(255-g)*amount, b+(255-b)*amount)
}
export function contrastColor(hex: string): string {
  const [r,g,b] = hexToRgb(hex)
  const lum = (0.299*r + 0.587*g + 0.114*b) / 255
  return lum > 0.45 ? shadeDark(hex, 0.72) : shadeLight(hex, 0.78)
}
export function scrappyNudge(hex: string, seed: number): string {
  const [r,g,b] = hexToRgb(hex)
  const rng = (s: number) => ((Math.sin(s*127.1+311.7)*43758.5453)%1+1)%1
  const amount = 0.08 + rng(seed)*0.14
  return rng(seed+1) > 0.5
    ? rgbToHex(r*(1-amount), g*(1-amount), b*(1-amount))
    : rgbToHex(r+(255-r)*amount, g+(255-g)*amount, b+(255-b)*amount)
}
export function lowVolumeNudge(hex: string, seed: number): string {
  const p = ['#F5F0E8','#EDE8DF','#E8E0D4','#F0EAE0','#EBE5DA','#F2ECE4','#E5DDD0','#EFE8DC']
  const rng = (s: number) => ((Math.sin(s*311.7+127.1)*43758.5453)%1+1)%1
  return p[Math.floor(rng(seed)*p.length)]
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1,3),16)/255
  const g = parseInt(hex.slice(3,5),16)/255
  const b = parseInt(hex.slice(5,7),16)/255
  const max = Math.max(r,g,b), min = Math.min(r,g,b)
  const l = (max+min)/2
  if (max === min) return { h: 0, s: 0, l }
  const d = max - min
  const s = l > 0.5 ? d/(2-max-min) : d/(max+min)
  let h = 0
  if (max === r)      h = ((g-b)/d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b-r)/d + 2) / 6
  else                h = ((r-g)/d + 4) / 6
  return { h: h*360, s, l }
}
function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360
  const c = (1 - Math.abs(2*l-1)) * s
  const x = c * (1 - Math.abs((h/60) % 2 - 1))
  const m = l - c/2
  let r=0, g=0, b=0
  if      (h < 60)  { r=c; g=x; b=0 }
  else if (h < 120) { r=x; g=c; b=0 }
  else if (h < 180) { r=0; g=c; b=x }
  else if (h < 240) { r=0; g=x; b=c }
  else if (h < 300) { r=x; g=0; b=c }
  else              { r=c; g=0; b=x }
  const toHex = (n: number) => Math.round((n+m)*255).toString(16).padStart(2,'0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}
function lerpColor(a: string, b: string, t: number): string {
  const ar=parseInt(a.slice(1,3),16), ag=parseInt(a.slice(3,5),16), ab=parseInt(a.slice(5,7),16)
  const br=parseInt(b.slice(1,3),16), bg=parseInt(b.slice(3,5),16), bb=parseInt(b.slice(5,7),16)
  const toHex = (n: number) => Math.round(n).toString(16).padStart(2,'0')
  return `#${toHex(ar+(br-ar)*t)}${toHex(ag+(bg-ag)*t)}${toHex(ab+(bb-ab)*t)}`
}
export function ombreColor(base: string, col: number, row: number, cols: number, rows: number): string {
  const t = (cols > 1 && rows > 1) ? (col/(cols-1) + row/(rows-1)) / 2 : 0
  return lerpColor(base, '#FFFFFF', t * 0.42)
}
export function rainbowColor(base: string, col: number, row: number, cols: number, rows: number): string {
  const t = (cols > 1 && rows > 1) ? (col/(cols-1) + row/(rows-1)) / 2 : 0
  const { h, s, l } = hexToHsl(base)
  const newH = (h + t * 300) % 360
  return hslToHex(newH, Math.max(s, 0.60), Math.min(Math.max(l, 0.42), 0.65))
}

// ─── Color rule resolution ────────────────────────────────────────────────────

export function resolveSlots(
  rules: Record<string, { type: string; of?: string; amount?: number }>,
  freeColors: Record<string, string>
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [slot, rule] of Object.entries(rules)) {
    if (rule.type === 'NEUTRAL') out[slot] = NEUTRAL
    if (rule.type === 'FREE')    out[slot] = freeColors[slot] ?? '#888888'
  }
  for (const [slot, rule] of Object.entries(rules)) {
    if (rule.type === 'CONTRAST')    out[slot] = contrastColor(out[rule.of ?? ''] ?? '#888888')
    if (rule.type === 'SHADE_DARK')  out[slot] = shadeDark(out[rule.of ?? ''] ?? '#888888', rule.amount)
    if (rule.type === 'SHADE_LIGHT') out[slot] = shadeLight(out[rule.of ?? ''] ?? '#888888', rule.amount)
  }
  return out
}

export function resolveInverted(
  rules: Record<string, { type: string; of?: string; amount?: number }>,
  freeColors: Record<string, string>
): Record<string, string> {
  const hasNeutral = Object.values(rules).some(r => r.type === 'NEUTRAL')
  const swapped: Record<string, string> = { ...freeColors }
  const freeSlots = Object.entries(rules).filter(([,r]) => r.type === 'FREE').map(([s]) => s)
  if (hasNeutral) {
    // swap FREE ↔ NEUTRAL
    freeSlots.forEach(s => { swapped[s] = NEUTRAL })
  } else {
    // swap FREE ↔ CONTRAST-of-FREE
    const base = resolveSlots(rules, freeColors)
    freeSlots.forEach(s => { swapped[s] = contrastColor(base[freeSlots[0]] ?? '#888888') })
  }
  return resolveSlots(rules, swapped)
}

// ─── Pattern generator ────────────────────────────────────────────────────────

export function generatePattern(
  primary: BlockDef,
  secondary: SecondaryMode,
  sashing: SashingConfig,
  cols: number, rows: number,
  freeColors: Record<string, string>,
  scrappy: boolean, lowVolume: boolean,
  primMode: 'solid' | 'ombre' | 'rainbow',
  blockDefs: BlockDef[]
): string[] {
  const primaryResolved  = resolveSlots(primary.colorRules, freeColors)
  const primaryFree      = freeColors[primary.freeSlots[0]] ?? '#888888'
  const contrastFill     = contrastColor(primaryFree)
  const invertedResolved = secondary.type === 'inverted' ? resolveInverted(primary.colorRules, freeColors) : null
  const secondaryDef     = secondary.type === 'block' ? blockDefs[secondary.defIdx!] : null
  const secondaryRes     = secondaryDef ? resolveSlots(secondaryDef.colorRules, freeColors) : null

  const sashCols = sashing.layout === 'columns' || sashing.layout === 'both'
  const sashRows = sashing.layout === 'rows'    || sashing.layout === 'both'
  const groupW   = sashCols ? primary.tileW + 1 : primary.tileW
  const groupH   = sashRows ? primary.tileH + 1 : primary.tileH

  const sashBase = sashing.layout !== 'none'
    ? (sashing.color === 'neutral' ? NEUTRAL : contrastFill)
    : null

  const applyWash = (base: string, col: number, row: number): string => {
    if (primMode === 'ombre')   return ombreColor(base, col, row, cols, rows)
    if (primMode === 'rainbow') return rainbowColor(base, col, row, cols, rows)
    return base
  }

  return Array.from({ length: cols * rows }, (_, i) => {
    const row = Math.floor(i / cols)
    const col = i % cols
    const posInGroupCol = col % groupW
    const posInGroupRow = row % groupH

    if (sashBase !== null && (
      (sashCols && posInGroupCol === primary.tileW) ||
      (sashRows && posInGroupRow === primary.tileH)
    )) {
      if (sashing.color === 'neutral'  && lowVolume) return lowVolumeNudge(sashBase, i*11+col*17+row*23)
      if (sashing.color === 'contrast' && scrappy)   return scrappyNudge(sashBase,   i*7+col*13+row*31)
      return sashBase
    }

    const tileCol = posInGroupCol
    const tileRow = posInGroupRow
    const pos     = tileRow * primary.tileW + tileCol

    const blockCol = Math.floor(col / groupW)
    const blockRow = Math.floor(row / groupH)
    const isPrimary = secondary.type === 'none' || (blockCol + blockRow) % 2 === 0

    if (isPrimary) {
      const slot = primary.grid[pos]
      const rule = primary.colorRules[slot]
      let base = primaryResolved[slot] ?? '#CCCCCC'
      if (rule?.type === 'FREE') {
        base = applyWash(base, col, row)
        if (scrappy) return scrappyNudge(base, i*7+col*13+row*31)
      }
      if (lowVolume && rule?.type === 'NEUTRAL') return lowVolumeNudge(base, i*11+col*17+row*23)
      return base
    }

    switch (secondary.type) {
      case 'neutral': {
        const c = lowVolume ? lowVolumeNudge(NEUTRAL, i*11+col*17+row*23) : NEUTRAL
        return c
      }
      case 'contrast': {
        const slot = primary.grid[pos]
        const rule = primary.colorRules[slot]
        let base = primaryResolved[slot] ?? '#CCCCCC'
        if (rule?.type === 'FREE') base = applyWash(contrastFill, col, row)
        else base = contrastFill
        if (scrappy && rule?.type !== 'NEUTRAL') return scrappyNudge(base, i*7+col*13+row*31)
        return base
      }
      case 'inverted': {
        if (!invertedResolved) return '#CCCCCC'
        const slot = primary.grid[pos]
        const rule = primary.colorRules[slot]
        let base = invertedResolved[slot] ?? '#CCCCCC'
        if (rule?.type === 'FREE') base = applyWash(base, col, row)
        if (scrappy && rule?.type !== 'NEUTRAL') return scrappyNudge(base, i*7+col*13+row*31)
        if (lowVolume && rule?.type === 'NEUTRAL') return lowVolumeNudge(base, i*11+col*17+row*23)
        return base
      }
      case 'block': {
        if (!secondaryDef || !secondaryRes) return '#CCCCCC'
        const slot = secondaryDef.grid[pos]
        const rule = secondaryDef.colorRules[slot]
        let base = secondaryRes[slot] ?? '#CCCCCC'
        if (rule?.type === 'FREE') base = applyWash(base, col, row)
        if (scrappy && rule?.type !== 'NEUTRAL') return scrappyNudge(base, i*7+col*13+row*31)
        if (lowVolume && rule?.type === 'NEUTRAL') return lowVolumeNudge(base, i*11+col*17+row*23)
        return base
      }
      default: return primaryResolved[primary.grid[0]] ?? '#CCCCCC'
    }
  })
}

// ─── High-level: compute display colors from saved pattern settings ───────────

export interface PatternColors {
  colors: string[]   // one hex per square, with overrides applied
  baseColors: string[] // before squareOverrides (used for fabric grouping)
  cols: number
  rows: number
  cutSize: number    // in inches
  finishedW: number  // in inches
  finishedH: number  // in inches
  sizeName: string
}

export function computePatternColors(settings: PatternSettings): PatternColors {
  const { BLOCK_DEFS: defs, PALETTES: palettes } = { BLOCK_DEFS, PALETTES }

  const def     = defs[settings.activeBlockIdx]
  const palette = palettes[settings.activePaletteIdx]

  const cols = settings.isCustomGrid
    ? (settings.customCols ?? def.defaultCols)
    : GRID_PRESETS[settings.activeGridIdx ?? 1].cols
  const rows = settings.isCustomGrid
    ? (settings.customRows ?? def.defaultRows)
    : GRID_PRESETS[settings.activeGridIdx ?? 1].rows

  const cutSize = settings.isCustomSquare
    ? Math.max(0.5, parseFloat(settings.customSquareStr ?? '5') || 5)
    : SQUARE_PRESETS[settings.squarePresetIdx ?? 1].value

  const freeColors: Record<string, string> = {}
  def.freeSlots.forEach(slot => {
    freeColors[slot] = palette.colors[slot] ?? palette.colors.A ?? '#888888'
  })

  const baseColors = generatePattern(
    def,
    settings.secondaryMode as SecondaryMode,
    settings.sashing as SashingConfig,
    cols, rows,
    freeColors,
    settings.scrappy, settings.lowVolume,
    settings.primaryMode,
    defs
  )

  const overrides = settings.squareOverrides ?? {}
  const colors = baseColors.map((c, i) => overrides[i] ?? overrides[String(i)] ?? c)

  const { w: finishedW, h: finishedH } = quiltFinishedDims(cols, rows, cutSize)

  return {
    colors,
    baseColors,
    cols,
    rows,
    cutSize,
    finishedW,
    finishedH,
    sizeName: quiltSizeName(finishedW),
  }
}

// ─── Fabric count: group squares by color ─────────────────────────────────────

export interface FabricColor {
  hex: string
  count: number
}

export function computeFabricCounts(patternColors: PatternColors): FabricColor[] {
  const counts: Record<string, number> = {}
  for (const hex of patternColors.colors) {
    const key = hex.toLowerCase()
    counts[key] = (counts[key] ?? 0) + 1
  }
  return Object.entries(counts)
    .map(([hex, count]) => ({ hex, count }))
    .sort((a, b) => b.count - a.count)
}
