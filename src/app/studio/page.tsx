"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Shuffle, Download, Heart, ChevronRight,
  RotateCcw, Sparkles, Info, Plus, Minus,
} from "lucide-react";
import Link from "next/link";

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

const NEUTRAL = "#F5F0E8";

type ColorRule =
  | { type: "NEUTRAL" }
  | { type: "FREE" }
  | { type: "CONTRAST"; of: string }
  | { type: "SHADE_DARK"; of: string; amount?: number }
  | { type: "SHADE_LIGHT"; of: string; amount?: number };

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

/** Swap the roles of FREE and NEUTRAL — used for the Inverted secondary mode */
function resolveInverted(rules: Record<string, ColorRule>, freeColors: Record<string, string>): Record<string, string> {
  const primaryFree = Object.values(freeColors)[0] ?? "#888888";
  const out: Record<string, string> = {};
  for (const [slot, rule] of Object.entries(rules)) {
    if (rule.type === "NEUTRAL") out[slot] = primaryFree; // was cream → now the color
    if (rule.type === "FREE")    out[slot] = NEUTRAL;     // was color  → now cream
  }
  for (const [slot, rule] of Object.entries(rules)) {
    if (rule.type === "CONTRAST")    out[slot] = contrastColor(out[rule.of] ?? "#888888");
    if (rule.type === "SHADE_DARK")  out[slot] = shadeDark(out[rule.of] ?? "#888888", rule.amount);
    if (rule.type === "SHADE_LIGHT") out[slot] = shadeLight(out[rule.of] ?? "#888888", rule.amount);
  }
  return out;
}

// ─── Secondary block mode ─────────────────────────────────────────────────────

type SecondaryMode =
  | { type: "none" }
  | { type: "neutral" }
  | { type: "contrast" }
  | { type: "inverted" }
  | { type: "block"; defIdx: number };

// ─── Block type ───────────────────────────────────────────────────────────────

interface BlockDef {
  key: string; label: string; description: string;
  tileW: number; tileH: number; grid: string[];
  colorRules: Record<string, ColorRule>;
  freeSlots: string[];
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
  cols: number, rows: number,
  freeColors: Record<string, string>,
  scrappy: boolean, lowVolume: boolean,
  blockDefs: BlockDef[]   // passed in to avoid circular reference
): string[] {
  const primaryResolved  = resolveSlots(primary.colorRules, freeColors);
  const primaryFree      = freeColors[primary.freeSlots[0]] ?? "#888888";
  const contrastFill     = contrastColor(primaryFree);
  const invertedResolved = secondary.type === "inverted" ? resolveInverted(primary.colorRules, freeColors) : null;
  const secondaryDef     = secondary.type === "block" ? blockDefs[secondary.defIdx] : null;
  const secondaryRes     = secondaryDef ? resolveSlots(secondaryDef.colorRules, freeColors) : null;

  return Array.from({ length: cols * rows }, (_, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;

    // Is this square in a primary or secondary block position?
    const blockCol = Math.floor(col / primary.tileW);
    const blockRow = Math.floor(row / primary.tileH);
    const isPrimary = secondary.type === "none" || (blockCol + blockRow) % 2 === 0;

    if (isPrimary) {
      const pos = (row % primary.tileH) * primary.tileW + (col % primary.tileW);
      const slot = primary.grid[pos];
      const base = primaryResolved[slot] ?? "#CCCCCC";
      const rule = primary.colorRules[slot];
      if (scrappy   && rule?.type === "FREE")    return scrappyNudge(base, i*7+col*13+row*31);
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
        const pos = (row % primary.tileH) * primary.tileW + (col % primary.tileW);
        const slot = primary.grid[pos];
        const base = invertedResolved![slot] ?? "#CCCCCC";
        const origRule = primary.colorRules[slot];
        // Roles are swapped: scrappy applies to originally-NEUTRAL (now colored) slots,
        // lowVolume applies to originally-FREE (now cream) slots
        if (scrappy   && origRule?.type === "NEUTRAL") return scrappyNudge(base, i*7+col*13+row*31);
        if (lowVolume && origRule?.type === "FREE")    return lowVolumeNudge(base, i*11+col*17+row*23);
        return base;
      }
      case "block": {
        const sd = secondaryDef!;
        const pos = (row % sd.tileH) * sd.tileW + (col % sd.tileW);
        const slot = sd.grid[pos];
        const base = secondaryRes![slot] ?? "#CCCCCC";
        const rule = sd.colorRules[slot];
        if (scrappy   && rule?.type === "FREE")    return scrappyNudge(base, i*7+col*13+row*31);
        if (lowVolume && rule?.type === "NEUTRAL") return lowVolumeNudge(base, i*11+col*17+row*23);
        return base;
      }
      default: return primaryResolved[primary.grid[0]] ?? "#CCCCCC";
    }
  });
}

// ─── Block definitions ────────────────────────────────────────────────────────

const BLOCK_DEFS: BlockDef[] = [
  {
    key: "checkerboard", label: "Checkerboard",
    description: "Classic alternating squares on cream",
    tileW: 2, tileH: 2, grid: ["A","B","B","A"],
    colorRules: { A: { type: "NEUTRAL" }, B: { type: "FREE" } },
    freeSlots: ["B"],
  },
  {
    key: "check", label: "Check",
    description: "Two-tone check — color + auto contrast",
    tileW: 2, tileH: 2, grid: ["A","B","B","A"],
    colorRules: { A: { type: "FREE" }, B: { type: "CONTRAST", of: "A" } },
    freeSlots: ["A"],
  },
  {
    key: "gingham1", label: "Gingham Classic",
    description: "Three-value gingham on cream background",
    tileW: 2, tileH: 2, grid: ["A","B","B","C"],
    colorRules: { A: { type: "NEUTRAL" }, B: { type: "FREE" }, C: { type: "SHADE_DARK", of: "B", amount: 0.38 } },
    freeSlots: ["B"],
  },
  {
    key: "gingham2", label: "Gingham Rich",
    description: "Four-value gingham with light, mid & dark",
    tileW: 2, tileH: 2, grid: ["A","B","C","D"],
    colorRules: { A: { type: "NEUTRAL" }, B: { type: "FREE" }, C: { type: "SHADE_LIGHT", of: "B", amount: 0.45 }, D: { type: "SHADE_DARK", of: "B", amount: 0.38 } },
    freeSlots: ["B"],
  },
  {
    key: "ninepatch", label: "Nine-Patch",
    description: "3×3 classic quilt block — two alternating colors",
    tileW: 3, tileH: 3, grid: ["A","B","A","B","A","B","A","B","A"],
    colorRules: { A: { type: "FREE" }, B: { type: "CONTRAST", of: "A" } },
    freeSlots: ["A"],
  },
  {
    key: "grannysquare", label: "Granny Square",
    description: "Concentric squares radiating from center",
    tileW: 4, tileH: 4,
    grid: ["A","A","A","A","A","B","B","A","A","B","B","A","A","A","A","A"],
    colorRules: { A: { type: "FREE" }, B: { type: "CONTRAST", of: "A" } },
    freeSlots: ["A"],
  },
  {
    key: "stripe", label: "Stripe",
    description: "Vertical color stripes on cream",
    tileW: 4, tileH: 1, grid: ["B","A","B","A"],
    colorRules: { A: { type: "NEUTRAL" }, B: { type: "FREE" } },
    freeSlots: ["B"],
  },
  {
    key: "logcabin", label: "Log Cabin",
    description: "Light and dark halves radiating from center",
    tileW: 4, tileH: 4,
    grid: ["A","A","A","A","A","B","B","C","A","B","B","C","D","D","D","C"],
    colorRules: { A: { type: "NEUTRAL" }, B: { type: "FREE" }, C: { type: "SHADE_DARK", of: "B", amount: 0.42 }, D: { type: "SHADE_LIGHT", of: "B", amount: 0.50 } },
    freeSlots: ["B"],
  },
];

// ─── Curated palettes ─────────────────────────────────────────────────────────

interface Palette { label: string; emoji: string; colors: Record<string, string>; }

const PALETTES: Palette[] = [
  { label: "Navy",       emoji: "🌊", colors: { A: "#1C3A6B", B: "#1C3A6B" } },
  { label: "Terracotta", emoji: "🏺", colors: { A: "#C2683A", B: "#C2683A" } },
  { label: "Sage",       emoji: "🌿", colors: { A: "#4A6B4A", B: "#4A6B4A" } },
  { label: "Teal",       emoji: "🦚", colors: { A: "#1E5F6B", B: "#1E5F6B" } },
  { label: "Berry",      emoji: "🫐", colors: { A: "#6B2060", B: "#6B2060" } },
  { label: "Gold",       emoji: "✨", colors: { A: "#8B6400", B: "#8B6400" } },
  { label: "Crimson",    emoji: "❤️", colors: { A: "#C41E3A", B: "#C41E3A" } },
  { label: "Slate",      emoji: "🩶", colors: { A: "#4A5568", B: "#4A5568" } },
  { label: "Plum",       emoji: "🍇", colors: { A: "#7B2D8B", B: "#7B2D8B" } },
  { label: "Olive",      emoji: "🫒", colors: { A: "#5C6B1E", B: "#5C6B1E" } },
  { label: "Rose",       emoji: "🌸", colors: { A: "#B5467A", B: "#B5467A" } },
  { label: "Cocoa",      emoji: "☕", colors: { A: "#6B3A1E", B: "#6B3A1E" } },
];

// ─── Studio nav ───────────────────────────────────────────────────────────────

function StudioNav() {
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
          <span className="text-sm text-[#78716C] hidden sm:block">Pattern Studio</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 text-sm text-[#78716C] px-3 py-1.5 rounded-lg hover:bg-[#F5F5F4] transition-colors cursor-pointer">
            <Heart size={14} /><span className="hidden sm:inline">Save</span>
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

export default function StudioPage() {
  // ── Primary block + palette ──────────────────────────────────────────────
  const [activeBlockIdx, setActiveBlockIdx]   = useState(0);
  const [activePaletteIdx, setActivePaletteIdx] = useState(0);

  // ── Secondary block ──────────────────────────────────────────────────────
  const [secondaryMode, setSecondaryMode] = useState<SecondaryMode>({ type: "none" });

  // ── Grid ─────────────────────────────────────────────────────────────────
  const [activeGridIdx, setActiveGridIdx]   = useState(1);
  const [isCustomGrid, setIsCustomGrid]     = useState(false);
  const [customCols, setCustomCols]         = useState(15);
  const [customRows, setCustomRows]         = useState(12);

  // ── Square size ───────────────────────────────────────────────────────────
  const [squarePresetIdx, setSquarePresetIdx] = useState(1);
  const [isCustomSquare, setIsCustomSquare]   = useState(false);
  const [customSquareStr, setCustomSquareStr] = useState("3.5");

  // ── Variations + UI ──────────────────────────────────────────────────────
  const [scrappy, setScrappy]             = useState(false);
  const [lowVolume, setLowVolume]         = useState(false);
  const [grid, setGrid]                   = useState<string[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [savedCount, setSavedCount]       = useState(0);
  const [justSaved, setJustSaved]         = useState(false);
  const generationSeed = useRef(0);

  // ── Derived values ────────────────────────────────────────────────────────
  const activeCols = isCustomGrid ? customCols : GRID_PRESETS[activeGridIdx].cols;
  const activeRows = isCustomGrid ? customRows : GRID_PRESETS[activeGridIdx].rows;
  const activeSquareSize = isCustomSquare
    ? Math.max(0.5, parseFloat(customSquareStr) || 5)
    : SQUARE_PRESETS[squarePresetIdx].value;
  const { w: finW, h: finH } = quiltFinishedDims(activeCols, activeRows, activeSquareSize);
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
      isScrappy: boolean,
      isLowVolume: boolean,
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
        setGrid(generatePattern(def, secMode, cols, rows, colors, isScrappy, isLowVolume, BLOCK_DEFS));
        setIsTransitioning(false);
      }, animate ? 180 : 0);
    },
    []
  );

  useEffect(() => {
    const { cols, rows } = GRID_PRESETS[1];
    buildGrid(0, 0, cols, rows, { type: "none" }, false, false, false);
  }, [buildGrid]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleGenerate = () => {
    const nextPalette = (activePaletteIdx + 1) % PALETTES.length;
    setActivePaletteIdx(nextPalette);
    buildGrid(activeBlockIdx, nextPalette, activeCols, activeRows, secondaryMode, scrappy, lowVolume);
  };

  const handleBlockChange = (idx: number) => {
    setActiveBlockIdx(idx);
    // If secondary "block" mode is no longer compatible with the new primary, reset it
    let newSec = secondaryMode;
    if (secondaryMode.type === "block") {
      const newPrimary = BLOCK_DEFS[idx];
      const secDef = BLOCK_DEFS[secondaryMode.defIdx];
      if (
        secDef.tileW !== newPrimary.tileW ||
        secDef.tileH !== newPrimary.tileH ||
        secondaryMode.defIdx === idx
      ) {
        newSec = { type: "none" };
        setSecondaryMode(newSec);
      }
    }
    buildGrid(idx, activePaletteIdx, activeCols, activeRows, newSec, scrappy, lowVolume);
  };

  const handlePaletteChange = (idx: number) => {
    setActivePaletteIdx(idx);
    buildGrid(activeBlockIdx, idx, activeCols, activeRows, secondaryMode, scrappy, lowVolume);
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
    buildGrid(activeBlockIdx, activePaletteIdx, activeCols, activeRows, newSec, scrappy, lowVolume);
  };

  const handleSecondaryBlockSelect = (defIdx: number) => {
    const newSec: SecondaryMode = { type: "block", defIdx };
    setSecondaryMode(newSec);
    buildGrid(activeBlockIdx, activePaletteIdx, activeCols, activeRows, newSec, scrappy, lowVolume);
  };

  const handleGridPreset = (idx: number) => {
    setActiveGridIdx(idx);
    setIsCustomGrid(false);
    const { cols, rows } = GRID_PRESETS[idx];
    buildGrid(activeBlockIdx, activePaletteIdx, cols, rows, secondaryMode, scrappy, lowVolume);
  };

  const handleCustomGridSelect = () => {
    if (!isCustomGrid) {
      setIsCustomGrid(true);
      buildGrid(activeBlockIdx, activePaletteIdx, customCols, customRows, secondaryMode, scrappy, lowVolume);
    }
  };

  const handleCustomCols = (val: number) => {
    const v = Math.max(3, Math.min(30, val));
    setCustomCols(v);
    setIsCustomGrid(true);
    buildGrid(activeBlockIdx, activePaletteIdx, v, customRows, secondaryMode, scrappy, lowVolume);
  };

  const handleCustomRows = (val: number) => {
    const v = Math.max(3, Math.min(25, val));
    setCustomRows(v);
    setIsCustomGrid(true);
    buildGrid(activeBlockIdx, activePaletteIdx, customCols, v, secondaryMode, scrappy, lowVolume);
  };

  const handleSquarePreset = (idx: number) => {
    setSquarePresetIdx(idx);
    setIsCustomSquare(false);
  };

  const handleScrappyChange = (val: boolean) => {
    setScrappy(val);
    buildGrid(activeBlockIdx, activePaletteIdx, activeCols, activeRows, secondaryMode, val, lowVolume);
  };

  const handleLowVolumeChange = (val: boolean) => {
    setLowVolume(val);
    buildGrid(activeBlockIdx, activePaletteIdx, activeCols, activeRows, secondaryMode, scrappy, val);
  };

  const handleSave = () => {
    setSavedCount((c) => c + 1);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1500);
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

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <StudioNav />

      <div className="pt-14 flex flex-col lg:flex-row min-h-screen">

        {/* ── Left panel ─────────────────────────────────────────────────── */}
        <aside className="w-full lg:w-80 xl:w-[340px] lg:min-h-[calc(100vh-56px)] bg-white border-r border-[#E7E5E4] flex-shrink-0 overflow-y-auto">
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
                onClick={() => buildGrid(activeBlockIdx, activePaletteIdx, activeCols, activeRows, secondaryMode, scrappy, lowVolume)}
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
                <Heart size={14} className={justSaved ? "fill-[#C2683A]" : ""} />
                {justSaved ? "Saved!" : savedCount > 0 ? `Save pattern (${savedCount} saved)` : "Save pattern"}
              </button>
              {savedCount >= 20 && (
                <p className="text-[10px] text-[#A8A29E] text-center mt-2">
                  Free plan: 20 saved patterns max.{" "}
                  <button className="text-[#C2683A] underline cursor-pointer">Upgrade to Maker</button>
                </p>
              )}
            </div>

          </div>
        </aside>

        {/* ── Right panel ────────────────────────────────────────────────── */}
        <main className="flex-1 flex flex-col items-center justify-center p-6 lg:p-10 gap-5">

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
            {scrappy   && <><span className="text-[#D6D3D1]">·</span><span className="text-[#78716C] text-xs">Scrappy</span></>}
            {lowVolume && <><span className="text-[#D6D3D1]">·</span><span className="text-[#78716C] text-xs">Low Volume</span></>}
          </div>

          {/* Pattern grid */}
          <div
            className="w-full rounded-2xl overflow-hidden shadow-2xl border border-black/5"
            style={{ aspectRatio: `${activeCols} / ${activeRows}`, maxWidth: "min(100%, 800px)" }}
          >
            <div
              className="w-full h-full"
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${activeCols}, 1fr)`,
                gridTemplateRows: `repeat(${activeRows}, 1fr)`,
              }}
            >
              {grid.map((color, i) => (
                <div
                  key={i}
                  style={{
                    backgroundColor: color,
                    transition: isTransitioning
                      ? `background-color ${0.05 + (i % 16) * 0.008}s ease`
                      : "background-color 0.25s ease",
                  }}
                />
              ))}
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
              {activeCols} × {activeRows} grid &nbsp;·&nbsp; {activeCols * activeRows} squares &nbsp;·&nbsp; {fmtIn(activeSquareSize)} squares &nbsp;·&nbsp; {fmtIn(finishedSq(activeSquareSize))} finished
            </p>
          </div>

          {/* Coming soon hint */}
          <div className="flex items-center gap-2 bg-white border border-[#E7E5E4] rounded-xl px-4 py-3 max-w-sm">
            <Sparkles size={14} className="text-[#C2683A] shrink-0" />
            <p className="text-xs text-[#78716C] leading-snug">
              <strong className="text-[#1C1917]">Fabric editor coming soon —</strong>{" "}
              swap in your Kona colors or photograph your stash to design with your real fabrics.
            </p>
            <ChevronRight size={14} className="text-[#D6D3D1] shrink-0" />
          </div>
        </main>
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
