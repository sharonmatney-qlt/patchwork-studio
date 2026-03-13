"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Shuffle, Download, Bookmark,
  RotateCcw, Sparkles, Info, Plus, Minus, ArrowLeft, Paintbrush, Undo2, Redo2,
  LayoutDashboard, X,
} from "lucide-react";
import Link from "next/link";
import {
  NEUTRAL, BLOCK_DEFS, PALETTES, KONA_FAMILIES, KONA_COLORS,
  type BlockDef, type ColorRule, type SecondaryMode, type SashingConfig,
  type Palette, type KonaColor,
} from "@/config/blocks";
import { savePattern, getPattern } from "@/app/actions/patterns";
import type { PatternSettings } from "@/lib/supabase";

// ─── Color utilities ─────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
}
function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r,g,b].map(v => Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,"0")).join("");
}
function shadeDark(hex: string, amount = 0.35): string {
  const [r,g,b] = hexToRgb(hex);
  return rgbToHex(r*(1-amount), g*(1-amount), b*(1-amount));
}
function shadeLight(hex: string, amount = 0.45): string {
  const [r,g,b] = hexToRgb(hex);
  return rgbToHex(r+(255-r)*amount, g+(255-g)*amount, b+(255-b)*amount);
}
function contrastColor(hex: string): string {
  const [r,g,b] = hexToRgb(hex);
  const lum = (0.299*r + 0.587*g + 0.114*b) / 255;
  return lum > 0.45 ? shadeDark(hex, 0.72) : shadeLight(hex, 0.78);
}
function scrappyNudge(hex: string, seed: number): string {
  const [r,g,b] = hexToRgb(hex);
  const rng = (s: number) => ((Math.sin(s*127.1+311.7)*43758.5453)%1+1)%1;
  const amount = 0.08 + rng(seed)*0.14;
  return rng(seed+1) > 0.5
    ? rgbToHex(r*(1-amount), g*(1-amount), b*(1-amount))
    : rgbToHex(r+(255-r)*amount, g+(255-g)*amount, b+(255-b)*amount);
}
function lowVolumeNudge(hex: string, seed: number): string {
  const p = ["#F5F0E8","#EDE8DF","#E8E0D4","#F0EAE0","#EBE5DA","#F2ECE4","#E5DDD0","#EFE8DC"];
  const rng = (s: number) => ((Math.sin(s*311.7+127.1)*43758.5453)%1+1)%1;
  return p[Math.floor(rng(seed)*p.length)];
}

// ─── Color wash utilities (ombré + rainbow) ───────────────────────────────────
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1,3),16)/255;
  const g = parseInt(hex.slice(3,5),16)/255;
  const b = parseInt(hex.slice(5,7),16)/255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  const l = (max+min)/2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d/(2-max-min) : d/(max+min);
  let h = 0;
  if (max === r)      h = ((g-b)/d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b-r)/d + 2) / 6;
  else                h = ((r-g)/d + 4) / 6;
  return { h: h*360, s, l };
}
function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2*l-1)) * s;
  const x = c * (1 - Math.abs((h/60) % 2 - 1));
  const m = l - c/2;
  let r=0, g=0, b=0;
  if      (h < 60)  { r=c; g=x; b=0; }
  else if (h < 120) { r=x; g=c; b=0; }
  else if (h < 180) { r=0; g=c; b=x; }
  else if (h < 240) { r=0; g=x; b=c; }
  else if (h < 300) { r=x; g=0; b=c; }
  else              { r=c; g=0; b=x; }
  const toHex = (n: number) => Math.round((n+m)*255).toString(16).padStart(2,"0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
function lerpColor(a: string, b: string, t: number): string {
  const ar=parseInt(a.slice(1,3),16), ag=parseInt(a.slice(3,5),16), ab=parseInt(a.slice(5,7),16);
  const br=parseInt(b.slice(1,3),16), bg=parseInt(b.slice(3,5),16), bb=parseInt(b.slice(5,7),16);
  const toHex = (n: number) => Math.round(n).toString(16).padStart(2,"0");
  return `#${toHex(ar+(br-ar)*t)}${toHex(ag+(bg-ag)*t)}${toHex(ab+(bb-ab)*t)}`;
}
// Diagonal wash: top-left = base color, bottom-right = 42% lighter
function ombreColor(base: string, col: number, row: number, cols: number, rows: number): string {
  const t = (cols > 1 && rows > 1)
    ? (col/(cols-1) + row/(rows-1)) / 2
    : 0;
  return lerpColor(base, "#FFFFFF", t * 0.42);
}
// Diagonal rainbow: hue sweeps 300° from base color's starting hue
function rainbowColor(base: string, col: number, row: number, cols: number, rows: number): string {
  const t = (cols > 1 && rows > 1)
    ? (col/(cols-1) + row/(rows-1)) / 2
    : 0;
  const { h, s, l } = hexToHsl(base);
  const newH = (h + t * 300) % 360;
  // Ensure enough saturation and a pleasant mid lightness for vivid rainbow
  return hslToHex(newH, Math.max(s, 0.60), Math.min(Math.max(l, 0.42), 0.65));
}

// ─── Scrappy print-simulation patterns ───────────────────────────────────────
// Each entry is a tiny repeating SVG tile applied as a background-image overlay
// on scrappy squares — giving the impression of woven / printed fabric texture.

function buildPatternUri(svg: string): string {
  const encoded = svg.replace(/"/g, "'").replace(/#/g, "%23");
  return `url("data:image/svg+xml,${encoded}")`;
}

const PRINT_PATTERNS: string[] = [
  // Fine dots
  buildPatternUri(`<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><circle cx="4" cy="4" r="1.2" fill="rgba(0,0,0,0.22)"/></svg>`),
  // Diagonal stripes
  buildPatternUri(`<svg xmlns="http://www.w3.org/2000/svg" width="6" height="6"><path d="M-1 7L7-1M-1 3L3-1M3 7L7 3" stroke="rgba(0,0,0,0.20)" stroke-width="1" fill="none"/></svg>`),
  // Crosshatch
  buildPatternUri(`<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><path d="M0 0L10 10M10 0L0 10" stroke="rgba(0,0,0,0.18)" stroke-width="0.8" fill="none"/></svg>`),
  // Scattered speckle
  buildPatternUri(`<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><circle cx="2" cy="3" r="0.9" fill="rgba(0,0,0,0.25)"/><circle cx="7" cy="8" r="0.7" fill="rgba(0,0,0,0.20)"/><circle cx="8" cy="2" r="1" fill="rgba(0,0,0,0.22)"/></svg>`),
  // Short dashes
  buildPatternUri(`<svg xmlns="http://www.w3.org/2000/svg" width="10" height="6"><path d="M1 3h4" stroke="rgba(0,0,0,0.25)" stroke-width="1" stroke-linecap="round" fill="none"/></svg>`),
  // Woven grid
  buildPatternUri(`<svg xmlns="http://www.w3.org/2000/svg" width="6" height="6"><path d="M0 3h6M3 0v6" stroke="rgba(0,0,0,0.14)" stroke-width="0.6" fill="none"/></svg>`),
  // Multi-scatter
  buildPatternUri(`<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12"><circle cx="3" cy="4" r="0.8" fill="rgba(0,0,0,0.25)"/><circle cx="9" cy="2" r="0.7" fill="rgba(0,0,0,0.20)"/><circle cx="6" cy="9" r="0.9" fill="rgba(0,0,0,0.22)"/><circle cx="10" cy="7" r="0.7" fill="rgba(0,0,0,0.18)"/></svg>`),
  // Diagonal dashes
  buildPatternUri(`<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><path d="M1 7l2-4M5 7l2-4" stroke="rgba(0,0,0,0.22)" stroke-width="0.9" stroke-linecap="round" fill="none"/></svg>`),
];

function getPrintPattern(squareIdx: number): string {
  const rng = ((Math.sin(squareIdx * 91.3 + 47.2) * 43758.5453) % 1 + 1) % 1;
  return PRINT_PATTERNS[Math.floor(rng * PRINT_PATTERNS.length)];
}

// ─── Quilt size helpers ───────────────────────────────────────────────────────

function finishedSq(cutIn: number): number { return cutIn - 0.5; }
function quiltFinishedDims(cols: number, rows: number, cutIn: number) {
  const fs = finishedSq(cutIn);
  return { w: cols * fs, h: rows * fs };
}
function quiltSizeName(wIn: number): string {
  if (wIn < 24) return "Mini";
  if (wIn < 48) return "Baby";
  if (wIn < 65) return "Throw";
  if (wIn < 80) return "Full";
  if (wIn < 98) return "Queen";
  return "King";
}
function fmtIn(n: number): string {
  const whole = Math.floor(n), frac = n - whole;
  if (frac === 0)                      return `${whole}"`;
  if (Math.abs(frac - 0.25) < 0.001)  return `${whole}¼"`;
  if (Math.abs(frac - 0.5)  < 0.001)  return `${whole}½"`;
  if (Math.abs(frac - 0.75) < 0.001)  return `${whole}¾"`;
  return `${n.toFixed(2).replace(/\.?0+$/, '')}"`;
}

// ─── Presets ──────────────────────────────────────────────────────────────────

const SQUARE_PRESETS = [
  { label: '2.5"', value: 2.5, note: "Mini charm" },
  { label: '5"',   value: 5,   note: "Charm square" },
  { label: '10"',  value: 10,  note: "Layer cake" },
];

const GRID_PRESETS = [
  { cols: 9,  rows: 7  },
  { cols: 13, rows: 11 },
  { cols: 17, rows: 13 },
  { cols: 21, rows: 17 },
];

// ─── Color rule system ────────────────────────────────────────────────────────

function resolveSlots(rules: Record<string, ColorRule>, freeColors: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [slot, rule] of Object.entries(rules)) {
    if (rule.type === "NEUTRAL") out[slot] = NEUTRAL;
    if (rule.type === "FREE")    out[slot] = freeColors[slot] ?? "#888888";
  }
  for (const [slot, rule] of Object.entries(rules)) {
    if (rule.type === "CONTRAST")    out[slot] = contrastColor(out[rule.of] ?? "#888888");
    if (rule.type === "SHADE_DARK")  out[slot] = shadeDark(out[rule.of] ?? "#888888", rule.amount);
    if (rule.type === "SHADE_LIGHT") out[slot] = shadeLight(out[rule.of] ?? "#888888", rule.amount);
  }
  return out;
}

/** Swap the two main roles — used for the Inverted secondary mode.
 *  Blocks with NEUTRAL: swap FREE ↔ NEUTRAL (cream on color → color on cream).
 *  Blocks without NEUTRAL (e.g. Nine-Patch, Check): swap FREE ↔ CONTRAST-of-FREE.
 *  SHADE derivatives are re-derived from whichever base they point to after the swap. */
function resolveInverted(rules: Record<string, ColorRule>, freeColors: Record<string, string>): Record<string, string> {
  const primaryFree = Object.values(freeColors)[0] ?? "#888888";
  const hasNeutral  = Object.values(rules).some(r => r.type === "NEUTRAL");
  const out: Record<string, string> = {};

  if (hasNeutral) {
    // Swap FREE ↔ NEUTRAL  (works for Checkerboard / Gingham / Stripe / Log Cabin)
    for (const [slot, rule] of Object.entries(rules)) {
      if (rule.type === "NEUTRAL") out[slot] = primaryFree;
      if (rule.type === "FREE")    out[slot] = NEUTRAL;
    }
  } else {
    // No neutral — swap FREE ↔ CONTRAST-of-FREE  (Nine-Patch / Check / Granny Square)
    for (const [slot, rule] of Object.entries(rules)) {
      if (rule.type === "FREE")     out[slot] = contrastColor(primaryFree);
      if (rule.type === "CONTRAST") out[slot] = primaryFree;
    }
  }

  // Re-derive any SHADE slots from their (now-swapped) base colors
  for (const [slot, rule] of Object.entries(rules)) {
    if (rule.type === "SHADE_DARK")  out[slot] = shadeDark(out[rule.of]  ?? "#888888", rule.amount);
    if (rule.type === "SHADE_LIGHT") out[slot] = shadeLight(out[rule.of] ?? "#888888", rule.amount);
  }
  return out;
}

// ─── Pattern engine ───────────────────────────────────────────────────────────
//
// For each square, we determine whether it falls in a "primary block position"
// or a "secondary block position" by treating the grid as a checkerboard of
// (primary.tileW × primary.tileH) sized block units. The secondary block fills
// the alternate positions.
//
// primary positions:   (blockCol + blockRow) % 2 === 0
// secondary positions: (blockCol + blockRow) % 2 === 1

function generatePattern(
  primary: BlockDef,
  secondary: SecondaryMode,
  sashing: SashingConfig,
  cols: number, rows: number,
  freeColors: Record<string, string>,
  scrappy: boolean, lowVolume: boolean,
  primMode: "solid" | "ombre" | "rainbow",
  blockDefs: BlockDef[]   // passed in to avoid circular reference
): string[] {
  const primaryResolved  = resolveSlots(primary.colorRules, freeColors);
  const primaryFree      = freeColors[primary.freeSlots[0]] ?? "#888888";
  const contrastFill     = contrastColor(primaryFree);
  const invertedResolved = secondary.type === "inverted" ? resolveInverted(primary.colorRules, freeColors) : null;
  const secondaryDef     = secondary.type === "block" ? blockDefs[secondary.defIdx] : null;
  const secondaryRes     = secondaryDef ? resolveSlots(secondaryDef.colorRules, freeColors) : null;

  // Sashing geometry:
  // Each "group" is (tileW+1) columns wide when column sashing is active — tileW block
  // columns followed by 1 sashing column. Same logic applies to rows. This ensures each
  // block gets a full tileW×tileH footprint before the sashing strip fires.
  const sashCols = sashing.layout === "columns" || sashing.layout === "both";
  const sashRows = sashing.layout === "rows"    || sashing.layout === "both";
  const groupW   = sashCols ? primary.tileW + 1 : primary.tileW;
  const groupH   = sashRows ? primary.tileH + 1 : primary.tileH;

  const sashBase = sashing.layout !== "none"
    ? (sashing.color === "neutral" ? NEUTRAL : contrastFill)
    : null;

  // Apply ombré or rainbow wash to a FREE-colored square at its grid position
  const applyWash = (base: string, col: number, row: number): string => {
    if (primMode === "ombre")   return ombreColor(base, col, row, cols, rows);
    if (primMode === "rainbow") return rainbowColor(base, col, row, cols, rows);
    return base;
  };

  return Array.from({ length: cols * rows }, (_, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;

    // Position within the current group (block cols 0..tileW-1, sash slot = tileW)
    const posInGroupCol = col % groupW;
    const posInGroupRow = row % groupH;

    // Sashing strip — the final slot of each group
    if (sashBase !== null && (
      (sashCols && posInGroupCol === primary.tileW) ||
      (sashRows && posInGroupRow === primary.tileH)
    )) {
      if (sashing.color === "neutral"  && lowVolume) return lowVolumeNudge(sashBase, i*11+col*17+row*23);
      if (sashing.color === "contrast" && scrappy)   return scrappyNudge(sashBase,   i*7+col*13+row*31);
      return sashBase;
    }

    // Tile position within the block (posInGroupCol is already 0..tileW-1 here)
    const tileCol = posInGroupCol;
    const tileRow = posInGroupRow;
    const pos     = tileRow * primary.tileW + tileCol;

    // Is this square in a primary or secondary block position?
    const blockCol = Math.floor(col / groupW);
    const blockRow = Math.floor(row / groupH);
    const isPrimary = secondary.type === "none" || (blockCol + blockRow) % 2 === 0;

    if (isPrimary) {
      const slot = primary.grid[pos];
      const rule = primary.colorRules[slot];
      let base = primaryResolved[slot] ?? "#CCCCCC";
      if (rule?.type === "FREE") {
        base = applyWash(base, col, row);
        if (scrappy) return scrappyNudge(base, i*7+col*13+row*31);
      }
      if (lowVolume && rule?.type === "NEUTRAL") return lowVolumeNudge(base, i*11+col*17+row*23);
      return base;
    }

    // Secondary rendering
    switch (secondary.type) {
      case "neutral": {
        if (lowVolume) return lowVolumeNudge(NEUTRAL, i*11+col*17+row*23);
        return NEUTRAL;
      }
      case "contrast": {
        if (scrappy) return scrappyNudge(contrastFill, i*7+col*13+row*31);
        return contrastFill;
      }
      case "inverted": {
        const slot = primary.grid[pos];
        const origRule = primary.colorRules[slot];
        let base = invertedResolved![slot] ?? "#CCCCCC";
        // In inverted, the originally-NEUTRAL slots now display the free color — apply wash there
        if (origRule?.type === "NEUTRAL") {
          base = applyWash(base, col, row);
          if (scrappy) return scrappyNudge(base, i*7+col*13+row*31);
        }
        if (lowVolume && origRule?.type === "FREE") return lowVolumeNudge(base, i*11+col*17+row*23);
        return base;
      }
      case "block": {
        const sd = secondaryDef!;
        const slot = sd.grid[pos]; // compatible blocks share tileW/tileH so pos is valid
        const rule = sd.colorRules[slot];
        let base = secondaryRes![slot] ?? "#CCCCCC";
        if (rule?.type === "FREE") {
          base = applyWash(base, col, row);
          if (scrappy) return scrappyNudge(base, i*7+col*13+row*31);
        }
        if (lowVolume && rule?.type === "NEUTRAL") return lowVolumeNudge(base, i*11+col*17+row*23);
        return base;
      }
      default: return primaryResolved[primary.grid[0]] ?? "#CCCCCC";
    }
  });
}

// ─── Studio nav ───────────────────────────────────────────────────────────────

function StudioNav({ onSave, justSaved, patternName }: {
  onSave: () => void;
  justSaved: boolean;
  patternName: string;
}) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#FAFAF8]/95 backdrop-blur-md border-b border-[#E7E5E4]">
      <div className="max-w-screen-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="grid grid-cols-3 gap-0.5 w-6 h-6">
              {["#C2683A","#E8C9B0","#C2683A","#E8C9B0","#C2683A","#E8C9B0","#C2683A","#E8C9B0","#C2683A"].map(
                (c, i) => <div key={i} className="rounded-[1px]" style={{ backgroundColor: c }} />
              )}
            </div>
            <span className="font-semibold text-[#1C1917] text-base tracking-tight group-hover:text-[#C2683A] transition-colors">
              Patchwork
            </span>
          </Link>
          <span className="text-[#D6D3D1] hidden sm:block">·</span>
          {patternName !== "Untitled Pattern" ? (
            <span className="text-sm text-[#1C1917] font-medium hidden sm:block">{patternName}</span>
          ) : (
            <span className="text-sm text-[#78716C] hidden sm:block">Pattern Studio</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-sm text-[#78716C] px-3 py-1.5 rounded-lg hover:bg-[#F5F5F4] transition-colors cursor-pointer"
          >
            <LayoutDashboard size={14} /><span className="hidden sm:inline">My Patterns</span>
          </Link>
          <button
            onClick={onSave}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors cursor-pointer border border-[#E7E5E4] hover:border-[#C2683A] hover:text-[#C2683A] text-[#78716C]"
          >
            <Bookmark size={14} className={justSaved ? "text-[#C2683A] fill-[#C2683A]" : ""} />
            <span className="hidden sm:inline">{justSaved ? "Saved!" : "Save"}</span>
          </button>
          <button className="flex items-center gap-1.5 text-sm text-[#78716C] px-3 py-1.5 rounded-lg hover:bg-[#F5F5F4] transition-colors cursor-pointer">
            <Download size={14} /><span className="hidden sm:inline">Export PDF</span>
          </button>
          <button className="bg-[#C2683A] text-white text-sm font-medium px-4 py-1.5 rounded-lg hover:bg-[#9A4F28] transition-colors cursor-pointer flex items-center gap-1.5">
            <Sparkles size={13} /><span>Upgrade</span>
          </button>
        </div>
      </div>
    </nav>
  );
}

// ─── Main studio component ────────────────────────────────────────────────────

// Suspense wrapper required by Next.js because useSearchParams is used inside
export default function StudioPage() {
  return (
    <Suspense>
      <StudioContent />
    </Suspense>
  );
}

function StudioContent() {
  // ── Primary block + palette ──────────────────────────────────────────────
  const [activeBlockIdx, setActiveBlockIdx]     = useState(0);
  const [activePaletteIdx, setActivePaletteIdx] = useState(0);

  // ── Secondary block ──────────────────────────────────────────────────────
  const [secondaryMode, setSecondaryMode] = useState<SecondaryMode>({ type: "none" });

  // ── Sashing ───────────────────────────────────────────────────────────────
  const [sashing, setSashing] = useState<SashingConfig>({ layout: "none", color: "neutral" });

  // ── Grid ─────────────────────────────────────────────────────────────────
  const [activeGridIdx, setActiveGridIdx]   = useState(1);
  const [isCustomGrid, setIsCustomGrid]     = useState(true);
  const [customCols, setCustomCols]         = useState(BLOCK_DEFS[0].defaultCols);
  const [customRows, setCustomRows]         = useState(BLOCK_DEFS[0].defaultRows);
  // renderedCols/Rows track what's actually built — may differ from picker while transitioning
  const [renderedCols, setRenderedCols]     = useState(BLOCK_DEFS[0].defaultCols);
  const [renderedRows, setRenderedRows]     = useState(BLOCK_DEFS[0].defaultRows);

  // ── Square size ───────────────────────────────────────────────────────────
  const [squarePresetIdx, setSquarePresetIdx] = useState(1);
  const [isCustomSquare, setIsCustomSquare]   = useState(false);
  const [customSquareStr, setCustomSquareStr] = useState("3.5");

  // ── Variations + UI ──────────────────────────────────────────────────────
  const [scrappy, setScrappy]             = useState(false);
  const [lowVolume, setLowVolume]         = useState(false);
  const [primaryMode, setPrimaryMode]     = useState<"solid" | "ombre" | "rainbow">("solid");
  const [grid, setGrid]                   = useState<string[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [justSaved, setJustSaved]         = useState(false);
  const generationSeed                    = useRef(0);

  // ── Save / load ───────────────────────────────────────────────────────────
  const [savedPatternId, setSavedPatternId] = useState<string | null>(null);
  const [patternName, setPatternName]       = useState("Untitled Pattern");
  const [showSaveModal, setShowSaveModal]       = useState(false);
  const [isSaving, setIsSaving]                 = useState(false);
  const [showStartMakePrompt, setShowStartMakePrompt] = useState(false);
  const searchParams                        = useSearchParams();
  const router                              = useRouter();

  // ── Color picker ─────────────────────────────────────────────────────────
  const [selectedSquareIdx, setSelectedSquareIdx] = useState<number | null>(null);
  const [squareOverrides, setSquareOverrides]     = useState<Record<number, string>>({});
  const [colorPickerScope, setColorPickerScope]   = useState<"square" | "all">("square");
  const [colorPickerFamily, setColorPickerFamily] = useState<string>("All");
  const [paintModeActive, setPaintModeActive]     = useState(false);
  const [paintColor, setPaintColor]               = useState<string>("#888888");

  // ── Override history (undo/redo) ─────────────────────────────────────────
  const overridesHistoryRef = useRef<Record<number, string>[]>([{}]);
  const historyIdxRef       = useRef(0);
  const [historyIdx, setHistoryIdx] = useState(0);

  // ── Derived values ────────────────────────────────────────────────────────
  const activeCols = isCustomGrid ? customCols : GRID_PRESETS[activeGridIdx].cols;
  const activeRows = isCustomGrid ? customRows : GRID_PRESETS[activeGridIdx].rows;
  const activeSquareSize = isCustomSquare
    ? Math.max(0.5, parseFloat(customSquareStr) || 5)
    : SQUARE_PRESETS[squarePresetIdx].value;
  const { w: finW, h: finH } = quiltFinishedDims(renderedCols, renderedRows, activeSquareSize);
  const sizeName = quiltSizeName(finW);
  const activeBlock = BLOCK_DEFS[activeBlockIdx];

  // Blocks compatible for secondary "Block" mode: same tile size, not the primary itself
  const compatibleBlocks = BLOCK_DEFS
    .map((b, idx) => ({ b, idx }))
    .filter(({ b, idx }) =>
      idx !== activeBlockIdx &&
      b.tileW === activeBlock.tileW &&
      b.tileH === activeBlock.tileH
    );

  // ── Pattern builder ───────────────────────────────────────────────────────
  const buildGrid = useCallback(
    (
      blockIdx: number,
      paletteIdx: number,
      cols: number,
      rows: number,
      secMode: SecondaryMode,
      sashingCfg: SashingConfig,
      isScrappy: boolean,
      isLowVolume: boolean,
      primMode: "solid" | "ombre" | "rainbow" = "solid",
      animate = true
    ) => {
      if (animate) setIsTransitioning(true);
      generationSeed.current += 1;
      const thisSeed = generationSeed.current;
      setTimeout(() => {
        if (thisSeed !== generationSeed.current) return;
        const def = BLOCK_DEFS[blockIdx];
        const palette = PALETTES[paletteIdx];
        const colors: Record<string, string> = {};
        def.freeSlots.forEach((slot) => {
          colors[slot] = palette.colors[slot] ?? palette.colors.A ?? "#888888";
        });
        setGrid(generatePattern(def, secMode, sashingCfg, cols, rows, colors, isScrappy, isLowVolume, primMode, BLOCK_DEFS));
        setRenderedCols(cols);
        setRenderedRows(rows);
        setIsTransitioning(false);
      }, animate ? 180 : 0);
    },
    []
  );

  useEffect(() => {
    const first = BLOCK_DEFS[0];
    buildGrid(0, 0, first.defaultCols, first.defaultRows, first.defaultSecondary, { layout: "none", color: "neutral" }, false, false, "solid", false);
  }, [buildGrid]);

  // Load a saved pattern from ?pattern=<id>
  useEffect(() => {
    const patternId = searchParams.get("pattern");
    if (!patternId) return;
    getPattern(patternId).then((p) => {
      if (!p) return;
      const s = p.settings;
      setSavedPatternId(p.id);
      setPatternName(p.name);
      setActiveBlockIdx(s.activeBlockIdx);
      setActivePaletteIdx(s.activePaletteIdx);
      setSecondaryMode(s.secondaryMode as SecondaryMode);
      setSashing(s.sashing);
      setIsCustomGrid(s.isCustomGrid);
      if (s.activeGridIdx !== undefined) setActiveGridIdx(s.activeGridIdx);
      if (s.customCols !== undefined) setCustomCols(s.customCols);
      if (s.customRows !== undefined) setCustomRows(s.customRows);
      setIsCustomSquare(s.isCustomSquare);
      if (s.squarePresetIdx !== undefined) setSquarePresetIdx(s.squarePresetIdx);
      if (s.customSquareStr !== undefined) setCustomSquareStr(s.customSquareStr);
      setScrappy(s.scrappy);
      setLowVolume(s.lowVolume);
      setPrimaryMode(s.primaryMode);
      const overrides: Record<number, string> = {};
      Object.entries(s.squareOverrides).forEach(([k, v]) => { overrides[parseInt(k)] = v; });
      setSquareOverrides(overrides);
      overridesHistoryRef.current = [overrides];
      historyIdxRef.current = 0;
      setHistoryIdx(0);
      const cols = s.isCustomGrid
        ? (s.customCols ?? BLOCK_DEFS[s.activeBlockIdx].defaultCols)
        : GRID_PRESETS[s.activeGridIdx ?? 1].cols;
      const rows = s.isCustomGrid
        ? (s.customRows ?? BLOCK_DEFS[s.activeBlockIdx].defaultRows)
        : GRID_PRESETS[s.activeGridIdx ?? 1].rows;
      buildGrid(s.activeBlockIdx, s.activePaletteIdx, cols, rows, s.secondaryMode as SecondaryMode, s.sashing as SashingConfig, s.scrappy, s.lowVolume, s.primaryMode, false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleGenerate = () => {
    const nextPalette = (activePaletteIdx + 1) % PALETTES.length;
    setActivePaletteIdx(nextPalette);
    setSquareOverrides({});
    setSelectedSquareIdx(null);
    setPaintModeActive(false);
    overridesHistoryRef.current = [{}]; historyIdxRef.current = 0; setHistoryIdx(0);
    buildGrid(activeBlockIdx, nextPalette, activeCols, activeRows, secondaryMode, sashing, scrappy, lowVolume, primaryMode);
  };

  const handleBlockChange = (idx: number) => {
    const newBlock = BLOCK_DEFS[idx];
    // Apply this block's smart defaults for secondary mode and grid dimensions
    const newSec  = newBlock.defaultSecondary;
    const newCols = newBlock.defaultCols;
    const newRows = newBlock.defaultRows;

    setActiveBlockIdx(idx);
    setSecondaryMode(newSec);
    setIsCustomGrid(true);
    setCustomCols(newCols);
    setCustomRows(newRows);
    setSquareOverrides({});
    setSelectedSquareIdx(null);
    setPaintModeActive(false);
    overridesHistoryRef.current = [{}]; historyIdxRef.current = 0; setHistoryIdx(0);

    buildGrid(idx, activePaletteIdx, newCols, newRows, newSec, sashing, scrappy, lowVolume, primaryMode);
  };

  const handlePaletteChange = (idx: number) => {
    setActivePaletteIdx(idx);
    setSquareOverrides({});
    setSelectedSquareIdx(null);
    setPaintModeActive(false);
    overridesHistoryRef.current = [{}]; historyIdxRef.current = 0; setHistoryIdx(0);
    buildGrid(activeBlockIdx, idx, activeCols, activeRows, secondaryMode, sashing, scrappy, lowVolume, primaryMode);
  };

  const handleSecondaryMode = (modeType: SecondaryMode["type"]) => {
    let newSec: SecondaryMode;
    if (modeType === "block") {
      if (compatibleBlocks.length === 0) return;
      newSec = { type: "block", defIdx: compatibleBlocks[0].idx };
    } else {
      newSec = { type: modeType };
    }
    setSecondaryMode(newSec);
    buildGrid(activeBlockIdx, activePaletteIdx, activeCols, activeRows, newSec, sashing, scrappy, lowVolume, primaryMode);
  };

  const handleSecondaryBlockSelect = (defIdx: number) => {
    const newSec: SecondaryMode = { type: "block", defIdx };
    setSecondaryMode(newSec);
    buildGrid(activeBlockIdx, activePaletteIdx, activeCols, activeRows, newSec, sashing, scrappy, lowVolume, primaryMode);
  };

  const handleSashingLayout = (layout: SashingConfig["layout"]) => {
    const next: SashingConfig = { ...sashing, layout };
    setSashing(next);
    buildGrid(activeBlockIdx, activePaletteIdx, activeCols, activeRows, secondaryMode, next, scrappy, lowVolume, primaryMode);
  };

  const handleSashingColor = (color: SashingConfig["color"]) => {
    const next: SashingConfig = { ...sashing, color };
    setSashing(next);
    if (sashing.layout !== "none") {
      buildGrid(activeBlockIdx, activePaletteIdx, activeCols, activeRows, secondaryMode, next, scrappy, lowVolume, primaryMode);
    }
  };

  const handleGridPreset = (idx: number) => {
    setActiveGridIdx(idx);
    setIsCustomGrid(false);
    const { cols, rows } = GRID_PRESETS[idx];
    buildGrid(activeBlockIdx, activePaletteIdx, cols, rows, secondaryMode, sashing, scrappy, lowVolume, primaryMode);
  };

  const handleCustomGridSelect = () => {
    if (!isCustomGrid) {
      setIsCustomGrid(true);
      buildGrid(activeBlockIdx, activePaletteIdx, customCols, customRows, secondaryMode, sashing, scrappy, lowVolume, primaryMode);
    }
  };

  const handleCustomCols = (val: number) => {
    const v = Math.max(3, Math.min(30, val));
    setCustomCols(v);
    setIsCustomGrid(true);
    buildGrid(activeBlockIdx, activePaletteIdx, v, customRows, secondaryMode, sashing, scrappy, lowVolume, primaryMode);
  };

  const handleCustomRows = (val: number) => {
    const v = Math.max(3, Math.min(25, val));
    setCustomRows(v);
    setIsCustomGrid(true);
    buildGrid(activeBlockIdx, activePaletteIdx, customCols, v, secondaryMode, sashing, scrappy, lowVolume, primaryMode);
  };

  const handleSquarePreset = (idx: number) => {
    setSquarePresetIdx(idx);
    setIsCustomSquare(false);
  };

  const handleScrappyChange = (val: boolean) => {
    setScrappy(val);
    buildGrid(activeBlockIdx, activePaletteIdx, activeCols, activeRows, secondaryMode, sashing, val, lowVolume, primaryMode);
  };

  const handleLowVolumeChange = (val: boolean) => {
    setLowVolume(val);
    buildGrid(activeBlockIdx, activePaletteIdx, activeCols, activeRows, secondaryMode, sashing, scrappy, val, primaryMode);
  };

  const handlePrimaryModeChange = (mode: "solid" | "ombre" | "rainbow") => {
    setPrimaryMode(mode);
    buildGrid(activeBlockIdx, activePaletteIdx, activeCols, activeRows, secondaryMode, sashing, scrappy, lowVolume, mode);
  };

  const handleSave = () => {
    setShowSaveModal(true);
  };

  const handleConfirmSave = async () => {
    setIsSaving(true);
    const settings: PatternSettings = {
      activeBlockIdx,
      activePaletteIdx,
      secondaryMode,
      sashing,
      isCustomGrid,
      activeGridIdx,
      customCols,
      customRows,
      isCustomSquare,
      squarePresetIdx,
      customSquareStr,
      scrappy,
      lowVolume,
      primaryMode,
      squareOverrides: Object.fromEntries(
        Object.entries(squareOverrides).map(([k, v]) => [String(k), v])
      ),
    };
    const result = await savePattern(settings, patternName, savedPatternId ?? undefined);
    setIsSaving(false);
    if (!result.error) {
      const isNew = !savedPatternId;
      setSavedPatternId(result.id);
      setShowSaveModal(false);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
      if (isNew) setShowStartMakePrompt(true);
    } else if (result.error === 'Not signed in') {
      setShowSaveModal(false);
      window.location.href = '/sign-in';
    } else {
      alert(`Save failed: ${result.error}`);
    }
  };

  const pushOverrides = (newOverrides: Record<number, string>) => {
    const newHistory = overridesHistoryRef.current.slice(0, historyIdxRef.current + 1);
    newHistory.push(newOverrides);
    overridesHistoryRef.current = newHistory;
    historyIdxRef.current = newHistory.length - 1;
    setHistoryIdx(historyIdxRef.current);
    setSquareOverrides(newOverrides);
  };

  const handleApplyColor = (squareIdx: number, hex: string, scope: "square" | "all") => {
    const targetColor = (squareOverrides[squareIdx] ?? grid[squareIdx] ?? "").toLowerCase();
    let newOverrides: Record<number, string>;
    if (scope === "square") {
      newOverrides = { ...squareOverrides, [squareIdx]: hex };
    } else {
      newOverrides = { ...squareOverrides };
      grid.forEach((c, i) => {
        if ((squareOverrides[i] ?? c).toLowerCase() === targetColor) {
          newOverrides[i] = hex;
        }
      });
    }
    pushOverrides(newOverrides);
  };

  const handleResetSquare = (squareIdx: number) => {
    const next = { ...squareOverrides };
    delete next[squareIdx];
    pushOverrides(next);
  };

  const handleUndo = () => {
    if (historyIdxRef.current > 0) {
      historyIdxRef.current -= 1;
      setHistoryIdx(historyIdxRef.current);
      setSquareOverrides(overridesHistoryRef.current[historyIdxRef.current]);
    }
  };

  const handleRedo = () => {
    if (historyIdxRef.current < overridesHistoryRef.current.length - 1) {
      historyIdxRef.current += 1;
      setHistoryIdx(historyIdxRef.current);
      setSquareOverrides(overridesHistoryRef.current[historyIdxRef.current]);
    }
  };

  const activePalette = PALETTES[activePaletteIdx];

  // Secondary label for display
  const secondaryLabel: string | null =
    secondaryMode.type === "none"     ? null :
    secondaryMode.type === "neutral"  ? "Neutral" :
    secondaryMode.type === "contrast" ? "Contrast" :
    secondaryMode.type === "inverted" ? "Inverted" :
    secondaryMode.type === "block"    ? BLOCK_DEFS[secondaryMode.defIdx].label : null;

  // Secondary mode options
  const SEC_MODES: { type: SecondaryMode["type"]; label: string; desc: string }[] = [
    { type: "none",     label: "None",     desc: "Single block only" },
    { type: "neutral",  label: "Neutral",  desc: "Plain cream alternate" },
    { type: "contrast", label: "Contrast", desc: "Solid contrast alternate" },
    { type: "inverted", label: "Inverted", desc: "Colors swapped" },
    { type: "block",    label: "Block",    desc: "Another block type" },
  ];

  // Current display color for selected square (with override applied)
  const selectedDisplayColor = selectedSquareIdx !== null
    ? (squareOverrides[selectedSquareIdx] ?? grid[selectedSquareIdx] ?? "#888888")
    : "#888888";

  const allDisplayColors = grid.map((c, i) => squareOverrides[i] ?? c);

  // In paint mode the editor shows the paint color (not the selected square's color)
  const editorCurrentColor = paintModeActive ? paintColor : selectedDisplayColor;

  const canUndo = historyIdx > 0;
  const canRedo = historyIdx < overridesHistoryRef.current.length - 1;

  return (
    <div className="bg-[#FAFAF8]" style={{ height: "100vh", overflow: "hidden" }}>
      <StudioNav onSave={handleSave} justSaved={justSaved} patternName={patternName} />

      {/* ── Start a Make prompt ───────────────────────────────────────────── */}
      {showStartMakePrompt && savedPatternId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm text-center">
            <div className="text-3xl mb-3">🧵</div>
            <h2 className="font-semibold text-[#1C1917] text-base mb-2">Pattern saved!</h2>
            <p className="text-sm text-[#78716C] mb-5">Ready to start making it? Track your progress from Planning to Made.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowStartMakePrompt(false)}
                className="flex-1 border border-[#E7E5E4] text-sm text-[#78716C] py-2.5 rounded-xl hover:bg-[#F5F5F4] transition-colors cursor-pointer"
              >
                Not yet
              </button>
              <button
                onClick={() => router.push(`/makes/new?pattern=${savedPatternId}`)}
                className="flex-1 bg-[#C2683A] text-white text-sm font-medium py-2.5 rounded-xl hover:bg-[#9A4F28] transition-colors cursor-pointer"
              >
                Start a Make
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Save modal ────────────────────────────────────────────────────── */}
      {showSaveModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-[#1C1917] text-base">Save pattern</h2>
              <button onClick={() => setShowSaveModal(false)} className="text-[#78716C] hover:text-[#1C1917] transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <label className="block text-sm text-[#78716C] mb-1.5">Pattern name</label>
            <input
              autoFocus
              type="text"
              value={patternName}
              onChange={(e) => setPatternName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleConfirmSave(); }}
              className="w-full border border-[#E7E5E4] rounded-xl px-3 py-2.5 text-sm text-[#1C1917] focus:outline-none focus:border-[#C2683A] transition-colors mb-4"
              placeholder="e.g. Terracotta Granny Square"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowSaveModal(false)}
                className="flex-1 border border-[#E7E5E4] text-sm text-[#78716C] py-2.5 rounded-xl hover:bg-[#F5F5F4] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSave}
                disabled={isSaving}
                className="flex-1 bg-[#C2683A] text-white text-sm font-medium py-2.5 rounded-xl hover:bg-[#9A4F28] transition-colors cursor-pointer disabled:opacity-60"
              >
                {isSaving ? "Saving…" : savedPatternId ? "Update" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="pt-14 flex flex-col lg:flex-row" style={{ height: "100vh" }}>

        {/* ── Left panel ─────────────────────────────────────────────────── */}
        <aside className="w-full lg:w-80 xl:w-[340px] bg-white border-r border-[#E7E5E4] flex-shrink-0 overflow-y-auto" style={{ height: "calc(100vh - 56px)" }}>

          {/* ── Color editor (shown when a square is selected) ────────────── */}
          {selectedSquareIdx !== null ? (
            <ColorEditorPanel
              squareIdx={selectedSquareIdx}
              currentColor={editorCurrentColor}
              allDisplayColors={allDisplayColors}
              scope={colorPickerScope}
              family={colorPickerFamily}
              onScopeChange={setColorPickerScope}
              onFamilyChange={setColorPickerFamily}
              onApply={handleApplyColor}
              onReset={handleResetSquare}
              onClose={() => { setSelectedSquareIdx(null); setPaintModeActive(false); }}
              paintModeActive={paintModeActive}
              onPaintModeToggle={() => {
                if (!paintModeActive) setPaintColor(selectedDisplayColor);
                setPaintModeActive(a => !a);
              }}
              onPaintColorChange={setPaintColor}
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={handleUndo}
              onRedo={handleRedo}
            />
          ) : (

          /* ── Normal controls ─────────────────────────────────────────────── */
          <div className="p-5 space-y-6">

            {/* Primary block */}
            <section>
              <SectionLabel>Primary Block</SectionLabel>
              <div className="grid grid-cols-2 gap-2">
                {BLOCK_DEFS.map((b, idx) => (
                  <button
                    key={b.key}
                    onClick={() => handleBlockChange(idx)}
                    className={`px-3 py-2.5 rounded-xl text-xs font-medium text-left transition-all cursor-pointer leading-tight ${
                      activeBlockIdx === idx
                        ? "bg-[#1C1917] text-white"
                        : "bg-[#F5F5F4] text-[#78716C] hover:bg-[#EDEBE9] hover:text-[#1C1917]"
                    }`}
                  >
                    <div className="font-semibold">{b.label}</div>
                    <div className={`text-[10px] mt-0.5 ${activeBlockIdx === idx ? "text-white/60" : "text-[#A8A29E]"}`}>
                      {b.description}
                    </div>
                  </button>
                ))}
                {/* Block Library placeholder — full library coming soon */}
                <button
                  disabled
                  title="More blocks coming soon"
                  className="px-3 py-2.5 rounded-xl text-xs font-medium text-left leading-tight bg-[#F5F5F4] text-[#D6D3D1] cursor-not-allowed border border-dashed border-[#E7E5E4]"
                >
                  <div className="font-semibold">Block Library</div>
                  <div className="text-[10px] mt-0.5 text-[#D6D3D1]">More blocks coming soon</div>
                </button>
              </div>
            </section>

            {/* ── Secondary block ─────────────────────────────────────────── */}
            <section>
              <SectionLabel>
                Secondary Block
                <TooltipIcon text="Fills alternate block positions on the grid — creates breathing room, contrast, or complex patterns. None = single repeating block." />
              </SectionLabel>

              {/* Mode selector */}
              <div className="grid grid-cols-3 gap-1.5 mb-2">
                {SEC_MODES.filter(m => m.type !== "block").map(m => (
                  <button
                    key={m.type}
                    onClick={() => handleSecondaryMode(m.type)}
                    title={m.desc}
                    className={`py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      secondaryMode.type === m.type
                        ? "bg-[#1C1917] text-white"
                        : "bg-[#F5F5F4] text-[#78716C] hover:bg-[#EDEBE9] hover:text-[#1C1917]"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
                {/* Block option — shown only if compatible blocks exist */}
                <button
                  onClick={() => handleSecondaryMode("block")}
                  disabled={compatibleBlocks.length === 0}
                  title={compatibleBlocks.length === 0 ? "No other blocks with the same tile size" : "Another block type"}
                  className={`py-2 rounded-xl text-xs font-semibold transition-all col-span-1 ${
                    compatibleBlocks.length === 0
                      ? "bg-[#F5F5F4] text-[#D6D3D1] cursor-not-allowed"
                      : secondaryMode.type === "block"
                        ? "bg-[#1C1917] text-white cursor-pointer"
                        : "bg-[#F5F5F4] text-[#78716C] hover:bg-[#EDEBE9] hover:text-[#1C1917] cursor-pointer"
                  }`}
                >
                  Block
                </button>
              </div>

              {/* Description line */}
              {secondaryMode.type !== "none" && (
                <p className="text-[11px] text-[#A8A29E] px-0.5 mb-2">
                  {secondaryMode.type === "neutral"  && "Alternate positions fill with cream — classic plain block set."}
                  {secondaryMode.type === "contrast" && "Alternate positions fill with a solid contrast color."}
                  {secondaryMode.type === "inverted" && "Alternate positions use the same block, colors swapped."}
                  {secondaryMode.type === "block"    && "Alternate positions use a different block — same color palette."}
                </p>
              )}

              {/* Compatible block sub-picker (shown when "block" mode active) */}
              {secondaryMode.type === "block" && compatibleBlocks.length > 0 && (
                <div className="grid grid-cols-2 gap-1.5 mt-1">
                  {compatibleBlocks.map(({ b, idx }) => (
                    <button
                      key={b.key}
                      onClick={() => handleSecondaryBlockSelect(idx)}
                      className={`px-3 py-2 rounded-xl text-xs font-medium text-left transition-all cursor-pointer leading-tight ${
                        secondaryMode.type === "block" && secondaryMode.defIdx === idx
                          ? "bg-[#C2683A] text-white"
                          : "bg-[#F5F5F4] text-[#78716C] hover:bg-[#EDEBE9] hover:text-[#1C1917]"
                      }`}
                    >
                      <div className="font-semibold">{b.label}</div>
                      <div className={`text-[10px] mt-0.5 ${secondaryMode.type === "block" && secondaryMode.defIdx === idx ? "text-white/70" : "text-[#A8A29E]"}`}>
                        {b.description}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* ── Sashing ──────────────────────────────────────────────── */}
            <section>
              <SectionLabel>
                Sashing
                <TooltipIcon text="Adds a fabric strip between blocks at interior boundaries. 1 square wide — same cut size as your block squares. Works best with 3×3 and 4×4 blocks." />
              </SectionLabel>

              {/* Layout selector */}
              <div className="grid grid-cols-4 gap-1.5 mb-2">
                {(["none", "columns", "rows", "both"] as const).map((layout) => (
                  <button
                    key={layout}
                    onClick={() => handleSashingLayout(layout)}
                    className={`py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      sashing.layout === layout
                        ? "bg-[#1C1917] text-white"
                        : "bg-[#F5F5F4] text-[#78716C] hover:bg-[#EDEBE9] hover:text-[#1C1917]"
                    }`}
                  >
                    {layout === "none" ? "None" : layout === "columns" ? "Cols" : layout === "rows" ? "Rows" : "Both"}
                  </button>
                ))}
              </div>

              {/* Color selector — only visible when sashing is active */}
              {sashing.layout !== "none" && (
                <div className="grid grid-cols-2 gap-1.5">
                  {(["neutral", "contrast"] as const).map((color) => (
                    <button
                      key={color}
                      onClick={() => handleSashingColor(color)}
                      className={`py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer capitalize ${
                        sashing.color === color
                          ? "bg-[#1C1917] text-white"
                          : "bg-[#F5F5F4] text-[#78716C] hover:bg-[#EDEBE9] hover:text-[#1C1917]"
                      }`}
                    >
                      {color === "neutral" ? "Neutral" : "Contrast"}
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* Color palette */}
            <section>
              <SectionLabel>Color Palette</SectionLabel>
              <div className="grid grid-cols-4 gap-2">
                {PALETTES.map((p, idx) => (
                  <button
                    key={p.label}
                    onClick={() => handlePaletteChange(idx)}
                    title={p.label}
                    className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl transition-all cursor-pointer ${
                      activePaletteIdx === idx
                        ? "bg-[#F5E6DC] ring-1 ring-[#C2683A]"
                        : "hover:bg-[#F5F5F4]"
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-full border border-black/10 shadow-sm"
                      style={{ backgroundColor: p.colors.A ?? p.colors.B }}
                    />
                    <span className="text-[10px] text-[#78716C] font-medium">{p.label}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Square size */}
            <section>
              <SectionLabel>
                Square Size
                <TooltipIcon text={`Cut size of each square. Finished size = cut − ½" (seam allowance). Changing square size doesn't affect the visual grid — it sets your finished quilt dimensions.`} />
              </SectionLabel>
              <div className="flex gap-1.5 mb-2">
                {SQUARE_PRESETS.map((sp, idx) => (
                  <button
                    key={sp.label}
                    onClick={() => handleSquarePreset(idx)}
                    title={sp.note}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                      !isCustomSquare && squarePresetIdx === idx
                        ? "bg-[#1C1917] text-white"
                        : "bg-[#F5F5F4] text-[#78716C] hover:bg-[#EDEBE9] hover:text-[#1C1917]"
                    }`}
                  >
                    {sp.label}
                  </button>
                ))}
                <button
                  onClick={() => setIsCustomSquare(true)}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                    isCustomSquare
                      ? "bg-[#1C1917] text-white"
                      : "bg-[#F5F5F4] text-[#78716C] hover:bg-[#EDEBE9] hover:text-[#1C1917]"
                  }`}
                >
                  Custom
                </button>
              </div>
              {isCustomSquare && (
                <div className="flex items-center gap-2 bg-[#F5F5F4] rounded-xl px-3 py-2">
                  <span className="text-xs text-[#78716C] shrink-0">Cut size</span>
                  <input
                    type="number" min={0.5} max={18} step={0.25}
                    value={customSquareStr}
                    onChange={(e) => setCustomSquareStr(e.target.value)}
                    className="flex-1 bg-transparent text-sm font-semibold text-[#1C1917] text-right outline-none min-w-0"
                    autoFocus
                  />
                  <span className="text-xs text-[#78716C]">inches</span>
                </div>
              )}
              <p className="text-[11px] text-[#A8A29E] mt-1.5 px-0.5">
                {activeSquareSize > 0.5
                  ? `Finished square: ${fmtIn(finishedSq(activeSquareSize))}`
                  : "Enter a valid cut size"}
              </p>
            </section>

            {/* Grid size */}
            <section>
              <SectionLabel>Grid Size</SectionLabel>
              <div className="flex flex-col gap-1.5">
                {GRID_PRESETS.map((g, idx) => {
                  const { w, h } = quiltFinishedDims(g.cols, g.rows, activeSquareSize);
                  const name = quiltSizeName(w);
                  const isActive = !isCustomGrid && activeGridIdx === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleGridPreset(idx)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${
                        isActive
                          ? "bg-[#1C1917] text-white"
                          : "bg-[#F5F5F4] text-[#78716C] hover:bg-[#EDEBE9] hover:text-[#1C1917]"
                      }`}
                    >
                      <span className="font-semibold font-mono tracking-wide">{g.cols}×{g.rows}</span>
                      <span className={`text-xs tabular-nums ${isActive ? "text-white/70" : "text-[#A8A29E]"}`}>
                        {name} · {fmtIn(w)} × {fmtIn(h)}
                      </span>
                    </button>
                  );
                })}
                <div
                  onClick={handleCustomGridSelect}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${
                    isCustomGrid
                      ? "bg-[#1C1917] text-white"
                      : "bg-[#F5F5F4] text-[#78716C] hover:bg-[#EDEBE9] hover:text-[#1C1917]"
                  }`}
                >
                  <span className={`font-semibold shrink-0 ${isCustomGrid ? "text-white" : "text-[#78716C]"}`}>
                    Custom
                  </span>
                  <div className="flex items-center gap-1.5 ml-auto" onClick={(e) => e.stopPropagation()}>
                    <Stepper value={customCols} min={3} max={30} onChange={handleCustomCols} dark={isCustomGrid} />
                    <span className={`text-xs ${isCustomGrid ? "text-white/60" : "text-[#A8A29E]"}`}>×</span>
                    <Stepper value={customRows} min={3} max={25} onChange={handleCustomRows} dark={isCustomGrid} />
                    {isCustomGrid && (
                      <span className="text-[10px] text-white/50 ml-1">
                        {fmtIn(quiltFinishedDims(customCols, customRows, activeSquareSize).w)}
                        {" × "}
                        {fmtIn(quiltFinishedDims(customCols, customRows, activeSquareSize).h)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Variations */}
            <section>
              <SectionLabel>
                Variations
                <TooltipIcon text="Scrappy adds subtle tonal variety to colored squares. Low Volume swaps cream squares for a range of soft whites and naturals. Both apply to primary and secondary blocks." />
              </SectionLabel>
              <div className="space-y-2.5">
                <Toggle label="Scrappy"    description="Tonal variety in colored squares"    checked={scrappy}    onChange={handleScrappyChange} />
                <Toggle label="Low Volume" description="Varied creams instead of one neutral" checked={lowVolume} onChange={handleLowVolumeChange} />

                {/* Color Wash — mutually exclusive; applies a diagonal wash to FREE squares */}
                <div className="pt-0.5">
                  <div className="text-[11px] text-[#A8A29E] font-medium tracking-wide uppercase mb-1.5">Color Wash</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(["solid", "ombre", "rainbow"] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => handlePrimaryModeChange(mode)}
                        className={`py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                          primaryMode === mode
                            ? "bg-[#1C1917] text-white shadow-sm"
                            : "bg-[#F5F5F4] text-[#78716C] hover:bg-[#EDEBE9] hover:text-[#1C1917]"
                        }`}
                      >
                        {mode === "solid" ? "Solid" : mode === "ombre" ? "Ombré" : "Rainbow"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Generate */}
            <div className="space-y-2 pt-1">
              <button
                onClick={handleGenerate}
                className="w-full bg-[#C2683A] text-white font-semibold py-3.5 rounded-xl hover:bg-[#9A4F28] transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
              >
                <Shuffle size={16} />
                Generate new palette
              </button>
              <button
                onClick={() => buildGrid(activeBlockIdx, activePaletteIdx, activeCols, activeRows, secondaryMode, sashing, scrappy, lowVolume, primaryMode)}
                className="w-full border border-[#E7E5E4] text-[#78716C] text-sm py-2.5 rounded-xl hover:border-[#C2683A] hover:text-[#C2683A] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw size={13} />
                Regenerate same block
              </button>
            </div>

            {/* Save */}
            <div>
              <button
                onClick={handleSave}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all cursor-pointer ${
                  justSaved
                    ? "bg-[#F5E6DC] border-[#C2683A] text-[#C2683A]"
                    : "border-[#E7E5E4] text-[#78716C] hover:border-[#C2683A] hover:text-[#C2683A]"
                }`}
              >
                <Bookmark size={14} className={justSaved ? "fill-[#C2683A]" : ""} />
                {justSaved ? "Saved!" : savedPatternId ? "Update pattern" : "Save pattern"}
              </button>
            </div>

          </div>
          /* end normal controls */
          )}
        </aside>

        {/* ── Right panel ────────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto" style={{ height: "calc(100vh - 56px)" }}>
          <div className="min-h-full flex flex-col items-center justify-center p-6 lg:p-10 gap-5">

            {/* Label bar */}
            <div className="flex items-center gap-2.5 text-sm flex-wrap justify-center">
              <span className="font-bold text-[#C2683A] uppercase tracking-widest text-xs">
                {activeBlock.label} Block
              </span>
              {secondaryLabel && (
                <>
                  <span className="text-[#D6D3D1]">+</span>
                  <span className="font-semibold text-[#78716C] uppercase tracking-widest text-xs">
                    {secondaryLabel}
                  </span>
                </>
              )}
              <span className="text-[#D6D3D1]">·</span>
              <span className="text-[#78716C]">{activePalette.emoji} {activePalette.label}</span>
              {sashing.layout !== "none" && (
                <>
                  <span className="text-[#D6D3D1]">·</span>
                  <span className="text-[#78716C] text-xs">
                    {sashing.layout === "columns" ? "Sashing cols" : sashing.layout === "rows" ? "Sashing rows" : "Sashing"} · {sashing.color}
                  </span>
                </>
              )}
              {scrappy   && <><span className="text-[#D6D3D1]">·</span><span className="text-[#78716C] text-xs">Scrappy</span></>}
              {lowVolume && <><span className="text-[#D6D3D1]">·</span><span className="text-[#78716C] text-xs">Low Volume</span></>}
              {Object.keys(squareOverrides).length > 0 && (
                <>
                  <span className="text-[#D6D3D1]">·</span>
                  <span className="text-[#C2683A] text-xs font-medium">
                    {Object.keys(squareOverrides).length} custom
                  </span>
                </>
              )}
            </div>

            {/* Pattern grid */}
            <div
              className="w-full rounded-2xl overflow-hidden shadow-2xl border border-black/5"
              style={{ aspectRatio: `${renderedCols} / ${renderedRows}`, maxWidth: "min(100%, 800px)" }}
            >
              <div
                className="w-full h-full"
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${renderedCols}, 1fr)`,
                  gridTemplateRows: `repeat(${renderedRows}, 1fr)`,
                }}
              >
                {grid.map((color, i) => {
                  const displayColor = squareOverrides[i] ?? color;
                  const isSelected = !paintModeActive && selectedSquareIdx === i;
                  const printPattern = scrappy ? getPrintPattern(i) : undefined;
                  return (
                    <div
                      key={i}
                      onClick={() => {
                        if (paintModeActive) {
                          // Paint mode: immediately paint this square with the current paint color
                          handleApplyColor(i, paintColor, "square");
                        } else {
                          // Normal mode: select square and open/switch the color editor
                          setSelectedSquareIdx(selectedSquareIdx === i ? null : i);
                        }
                      }}
                      style={{
                        backgroundColor: displayColor,
                        backgroundImage: printPattern,
                        backgroundRepeat: printPattern ? "repeat" : undefined,
                        transition: isTransitioning
                          ? `background-color ${0.05 + (i % 16) * 0.008}s ease`
                          : "background-color 0.25s ease",
                        boxShadow: isSelected ? "inset 0 0 0 2px white, inset 0 0 0 3.5px #1C1917" : undefined,
                        cursor: paintModeActive ? "crosshair" : "pointer",
                      }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Finished dimensions */}
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-[#1C1917] tracking-tight">
                  {fmtIn(finW)} × {fmtIn(finH)}
                </span>
                <span className="text-sm font-semibold text-[#C2683A] uppercase tracking-wider">
                  {sizeName}
                </span>
              </div>
              <p className="text-xs text-[#A8A29E] tabular-nums">
                {renderedCols} × {renderedRows} grid &nbsp;·&nbsp; {renderedCols * renderedRows} squares &nbsp;·&nbsp; {fmtIn(activeSquareSize)} squares &nbsp;·&nbsp; {fmtIn(finishedSq(activeSquareSize))} finished
              </p>
            </div>

            {/* Click-to-edit hint */}
            <p className="text-xs text-[#A8A29E] flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm border border-[#D6D3D1]" />
              Click any square to edit its color with Kona fabrics
            </p>

          </div>
        </main>
      </div>
    </div>
  );
}

// ─── Color editor panel ───────────────────────────────────────────────────────

function ColorEditorPanel({
  squareIdx,
  currentColor,
  allDisplayColors,
  scope,
  family,
  onScopeChange,
  onFamilyChange,
  onApply,
  onReset,
  onClose,
  paintModeActive,
  onPaintModeToggle,
  onPaintColorChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: {
  squareIdx: number;
  currentColor: string;
  allDisplayColors: string[];
  scope: "square" | "all";
  family: string;
  onScopeChange: (s: "square" | "all") => void;
  onFamilyChange: (f: string) => void;
  onApply: (squareIdx: number, hex: string, scope: "square" | "all") => void;
  onReset: (squareIdx: number) => void;
  onClose: () => void;
  paintModeActive: boolean;
  onPaintModeToggle: () => void;
  onPaintColorChange: (hex: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}) {
  const [hexInput, setHexInput] = useState(currentColor.toUpperCase());

  const likeCount = allDisplayColors.filter(
    c => c.toLowerCase() === currentColor.toLowerCase()
  ).length;

  const filteredColors =
    family === "All" ? KONA_COLORS : KONA_COLORS.filter(k => k.family === family);

  // Sync hex input when current color changes (different square selected, or paint color changed)
  useEffect(() => {
    setHexInput(currentColor.toUpperCase());
  }, [currentColor, squareIdx]);

  const applyHex = (raw: string) => {
    const val = raw.startsWith("#") ? raw : `#${raw}`;
    if (/^#[0-9a-fA-F]{6}$/.test(val)) {
      if (paintModeActive) {
        onPaintColorChange(val.toLowerCase());
      } else {
        onApply(squareIdx, val.toLowerCase(), scope);
      }
    }
  };

  const handleSwatchClick = (hex: string) => {
    setHexInput(hex.toUpperCase());
    if (paintModeActive) {
      onPaintColorChange(hex);
    } else {
      onApply(squareIdx, hex, scope);
    }
  };

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 56px)" }}>

      {/* Header */}
      <div className="px-4 py-3 border-b border-[#E7E5E4] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-0.5">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-sm text-[#78716C] hover:text-[#1C1917] transition-colors cursor-pointer pr-2"
          >
            <ArrowLeft size={14} />
            <span>Controls</span>
          </button>
          <div className="w-px h-4 bg-[#E7E5E4]" />
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo"
            className={`p-1.5 rounded-lg transition-colors ${canUndo ? "text-[#78716C] hover:bg-[#F5F5F4] hover:text-[#1C1917] cursor-pointer" : "text-[#D6D3D1] cursor-not-allowed"}`}
          >
            <Undo2 size={14} />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo"
            className={`p-1.5 rounded-lg transition-colors ${canRedo ? "text-[#78716C] hover:bg-[#F5F5F4] hover:text-[#1C1917] cursor-pointer" : "text-[#D6D3D1] cursor-not-allowed"}`}
          >
            <Redo2 size={14} />
          </button>
        </div>
        <span className="text-[10px] font-bold text-[#1C1917] uppercase tracking-widest">Kona Colors</span>
      </div>

      {/* Paint mode toggle bar */}
      <button
        onClick={onPaintModeToggle}
        className={`mx-4 mt-3 mb-1 flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex-shrink-0 ${
          paintModeActive
            ? "bg-[#C2683A] text-white"
            : "bg-[#F5F5F4] text-[#78716C] hover:bg-[#EDEBE9] hover:text-[#1C1917]"
        }`}
      >
        <Paintbrush size={13} />
        Paint
        {paintModeActive ? (
          <span className="ml-auto text-white/80 font-normal text-[10px] tracking-wide">
            tap squares to paint
          </span>
        ) : (
          <span className="ml-auto text-[#A8A29E] font-normal">off</span>
        )}
      </button>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">

        {/* Current color swatch + hex input */}
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl border border-black/10 shadow-sm flex-shrink-0"
            style={{ backgroundColor: currentColor }}
          />
          <div className="flex-1">
            <label className="text-[10px] font-bold text-[#78716C] uppercase tracking-widest block mb-1">
              {paintModeActive ? "Paint color" : "Hex"}
            </label>
            <input
              type="text"
              value={hexInput}
              maxLength={7}
              spellCheck={false}
              onChange={(e) => setHexInput(e.target.value.toUpperCase())}
              onBlur={() => applyHex(hexInput)}
              onKeyDown={(e) => { if (e.key === "Enter") applyHex(hexInput); }}
              className="w-full bg-[#F5F5F4] rounded-lg px-3 py-2 text-sm font-mono text-[#1C1917] outline-none focus:ring-2 focus:ring-[#C2683A] focus:ring-offset-1"
            />
          </div>
        </div>

        {/* Scope toggle — hidden in paint mode (always paints one square at a time) */}
        {!paintModeActive && (
        <div>
          <div className="text-[10px] font-bold text-[#78716C] uppercase tracking-widest mb-1.5">
            Apply to
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => onScopeChange("square")}
              className={`py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                scope === "square"
                  ? "bg-[#1C1917] text-white"
                  : "bg-[#F5F5F4] text-[#78716C] hover:bg-[#EDEBE9] hover:text-[#1C1917]"
              }`}
            >
              This square
            </button>
            <button
              onClick={() => likeCount > 1 && onScopeChange("all")}
              disabled={likeCount <= 1}
              className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                likeCount <= 1
                  ? "bg-[#F5F5F4] text-[#D6D3D1] cursor-not-allowed"
                  : scope === "all"
                    ? "bg-[#1C1917] text-white cursor-pointer"
                    : "bg-[#F5F5F4] text-[#78716C] hover:bg-[#EDEBE9] hover:text-[#1C1917] cursor-pointer"
              }`}
            >
              All {likeCount} like this
            </button>
          </div>
        </div>
        )}

        {/* Family filter */}
        <div>
          <div className="text-[10px] font-bold text-[#78716C] uppercase tracking-widest mb-2">
            Kona Cotton
          </div>
          <div className="flex flex-wrap gap-1 mb-3">
            {["All", ...KONA_FAMILIES].map(f => (
              <button
                key={f}
                onClick={() => onFamilyChange(f)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                  family === f
                    ? "bg-[#1C1917] text-white"
                    : "bg-[#F5F5F4] text-[#78716C] hover:bg-[#EDEBE9]"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Color swatches grid */}
          <div className="grid grid-cols-6 gap-1.5">
            {filteredColors.map(k => {
              const isActive = currentColor.toLowerCase() === k.hex.toLowerCase();
              return (
                <button
                  key={k.hex + k.name}
                  title={k.name}
                  onClick={() => handleSwatchClick(k.hex)}
                  className="aspect-square rounded-lg cursor-pointer transition-transform hover:scale-110 active:scale-95"
                  style={{
                    backgroundColor: k.hex,
                    boxShadow: isActive
                      ? "0 0 0 2px white, 0 0 0 3.5px #1C1917"
                      : "0 0 0 1px rgba(0,0,0,0.12)",
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Reset — hidden in paint mode */}
        {!paintModeActive && (
          <button
            onClick={() => onReset(squareIdx)}
            className="text-[11px] text-[#A8A29E] hover:text-[#78716C] transition-colors cursor-pointer text-left pt-1"
          >
            ↺ Reset this square to original
          </button>
        )}

      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 mb-3">
      <h3 className="text-xs font-bold text-[#1C1917] uppercase tracking-widest">{children}</h3>
    </div>
  );
}

function TooltipIcon({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-flex">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="text-[#D6D3D1] hover:text-[#78716C] transition-colors cursor-pointer"
      >
        <Info size={12} />
      </button>
      {show && (
        <div className="absolute left-5 top-0 z-20 w-56 bg-[#1C1917] text-white text-[11px] leading-relaxed rounded-lg p-3 shadow-xl">
          {text}
          <div className="absolute left-[-5px] top-2 w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-[#1C1917]" />
        </div>
      )}
    </div>
  );
}

function Toggle({ label, description, checked, onChange }: {
  label: string; description: string; checked: boolean; onChange: (val: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between p-3 rounded-xl bg-[#F5F5F4] hover:bg-[#EDEBE9] cursor-pointer transition-colors">
      <div>
        <div className="text-sm font-semibold text-[#1C1917]">{label}</div>
        <div className="text-[11px] text-[#A8A29E] mt-0.5">{description}</div>
      </div>
      <div
        className={`relative rounded-full transition-colors shrink-0 ml-3 ${checked ? "bg-[#C2683A]" : "bg-[#D6D3D1]"}`}
        style={{ width: 40, height: 22 }}
      >
        <div className={`absolute top-0.5 left-0.5 w-[18px] h-[18px] bg-white rounded-full shadow transition-transform ${checked ? "translate-x-[18px]" : "translate-x-0"}`} />
        <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      </div>
    </label>
  );
}

function Stepper({ value, min, max, onChange, dark }: {
  value: number; min: number; max: number; onChange: (v: number) => void; dark: boolean;
}) {
  const btn = `w-6 h-6 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
    dark ? "bg-white/10 hover:bg-white/20 text-white" : "bg-[#E7E5E4] hover:bg-[#D6D3D1] text-[#78716C]"
  }`;
  return (
    <div className="flex items-center gap-1">
      <button className={btn} onClick={() => onChange(Math.max(min, value - 1))} aria-label="decrease"><Minus size={10} /></button>
      <span className={`text-sm font-mono font-bold w-6 text-center tabular-nums ${dark ? "text-white" : "text-[#1C1917]"}`}>{value}</span>
      <button className={btn} onClick={() => onChange(Math.min(max, value + 1))} aria-label="increase"><Plus size={10} /></button>
    </div>
  );
}
