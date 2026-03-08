"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Shuffle,
  Download,
  Heart,
  ChevronRight,
  RotateCcw,
  Sparkles,
  Info,
} from "lucide-react";
import Link from "next/link";

// ─── Color utilities ────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0"))
      .join("")
  );
}

function shadeDark(hex: string, amount = 0.35): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}

function shadeLight(hex: string, amount = 0.45): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(
    r + (255 - r) * amount,
    g + (255 - g) * amount,
    b + (255 - b) * amount
  );
}

function contrastColor(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.45 ? shadeDark(hex, 0.72) : shadeLight(hex, 0.78);
}

// Nudge a color slightly for scrappy variation
function scrappyNudge(hex: string, seed: number): string {
  const [r, g, b] = hexToRgb(hex);
  // Deterministic pseudo-random offset based on position seed
  const rng = (s: number) => ((Math.sin(s * 127.1 + 311.7) * 43758.5453) % 1 + 1) % 1;
  const amount = 0.08 + rng(seed) * 0.14; // 8–22% variation
  const darken = rng(seed + 1) > 0.5;
  if (darken) {
    return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
  }
  return rgbToHex(
    r + (255 - r) * amount,
    g + (255 - g) * amount,
    b + (255 - b) * amount
  );
}

// Low-volume: shift toward light creamy neutrals
function lowVolumeNudge(hex: string, seed: number): string {
  const lowVolPalette = [
    "#F5F0E8", "#EDE8DF", "#E8E0D4", "#F0EAE0",
    "#EBE5DA", "#F2ECE4", "#E5DDD0", "#EFE8DC",
  ];
  const rng = (s: number) => ((Math.sin(s * 311.7 + 127.1) * 43758.5453) % 1 + 1) % 1;
  return lowVolPalette[Math.floor(rng(seed) * lowVolPalette.length)];
}

// ─── Color rule system ──────────────────────────────────────────────────────

const NEUTRAL = "#F5F0E8";

type ColorRule =
  | { type: "NEUTRAL" }
  | { type: "FREE" }
  | { type: "CONTRAST"; of: string }
  | { type: "SHADE_DARK"; of: string; amount?: number }
  | { type: "SHADE_LIGHT"; of: string; amount?: number };

function resolveSlots(
  rules: Record<string, ColorRule>,
  freeColors: Record<string, string>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [slot, rule] of Object.entries(rules)) {
    if (rule.type === "NEUTRAL") out[slot] = NEUTRAL;
    if (rule.type === "FREE") out[slot] = freeColors[slot] ?? "#888888";
  }
  for (const [slot, rule] of Object.entries(rules)) {
    if (rule.type === "CONTRAST")
      out[slot] = contrastColor(out[rule.of] ?? "#888888");
    if (rule.type === "SHADE_DARK")
      out[slot] = shadeDark(out[rule.of] ?? "#888888", rule.amount);
    if (rule.type === "SHADE_LIGHT")
      out[slot] = shadeLight(out[rule.of] ?? "#888888", rule.amount);
  }
  return out;
}

// ─── Tile engine ─────────────────────────────────────────────────────────────

interface TileStyleDef {
  key: string;
  label: string;
  description: string;
  tileW: number;
  tileH: number;
  grid: string[];
  colorRules: Record<string, ColorRule>;
  freeSlots: string[]; // which slots the user controls
}

function generateTile(
  def: TileStyleDef,
  cols: number,
  rows: number,
  freeColors: Record<string, string>,
  scrappy: boolean,
  lowVolume: boolean
): string[] {
  const resolved = resolveSlots(def.colorRules, freeColors);

  return Array.from({ length: cols * rows }, (_, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const pos = (row % def.tileH) * def.tileW + (col % def.tileW);
    const slot = def.grid[pos];
    const baseColor = resolved[slot] ?? "#CCCCCC";
    const rule = def.colorRules[slot];

    // Apply scrappy variation to FREE slots
    if (scrappy && rule?.type === "FREE") {
      return scrappyNudge(baseColor, i * 7 + col * 13 + row * 31);
    }
    // Apply low-volume variation to NEUTRAL slots
    if (lowVolume && rule?.type === "NEUTRAL") {
      return lowVolumeNudge(baseColor, i * 11 + col * 17 + row * 23);
    }

    return baseColor;
  });
}

// ─── Style definitions ───────────────────────────────────────────────────────

const STYLE_DEFS: TileStyleDef[] = [
  {
    key: "checkerboard",
    label: "Checkerboard",
    description: "Classic alternating squares on cream",
    tileW: 2, tileH: 2,
    grid: ["A", "B", "B", "A"],
    colorRules: {
      A: { type: "NEUTRAL" },
      B: { type: "FREE" },
    },
    freeSlots: ["B"],
  },
  {
    key: "check",
    label: "Check",
    description: "Two-tone check — color + auto contrast",
    tileW: 2, tileH: 2,
    grid: ["A", "B", "B", "A"],
    colorRules: {
      A: { type: "FREE" },
      B: { type: "CONTRAST", of: "A" },
    },
    freeSlots: ["A"],
  },
  {
    key: "gingham1",
    label: "Gingham Classic",
    description: "Three-value gingham on cream background",
    tileW: 2, tileH: 2,
    grid: ["A", "B", "B", "C"],
    colorRules: {
      A: { type: "NEUTRAL" },
      B: { type: "FREE" },
      C: { type: "SHADE_DARK", of: "B", amount: 0.38 },
    },
    freeSlots: ["B"],
  },
  {
    key: "gingham2",
    label: "Gingham Rich",
    description: "Four-value gingham with light, mid & dark",
    tileW: 2, tileH: 2,
    grid: ["A", "B", "C", "D"],
    colorRules: {
      A: { type: "NEUTRAL" },
      B: { type: "FREE" },
      C: { type: "SHADE_LIGHT", of: "B", amount: 0.45 },
      D: { type: "SHADE_DARK", of: "B", amount: 0.38 },
    },
    freeSlots: ["B"],
  },
  {
    key: "ninepatch",
    label: "Nine-Patch",
    description: "3×3 classic quilt block — two alternating colors",
    tileW: 3, tileH: 3,
    grid: ["A", "B", "A", "B", "A", "B", "A", "B", "A"],
    colorRules: {
      A: { type: "FREE" },
      B: { type: "CONTRAST", of: "A" },
    },
    freeSlots: ["A"],
  },
  {
    key: "grannysquare",
    label: "Granny Square",
    description: "Concentric squares radiating from center",
    tileW: 4, tileH: 4,
    grid: [
      "A", "A", "A", "A",
      "A", "B", "B", "A",
      "A", "B", "B", "A",
      "A", "A", "A", "A",
    ],
    colorRules: {
      A: { type: "FREE" },
      B: { type: "CONTRAST", of: "A" },
    },
    freeSlots: ["A"],
  },
  {
    key: "stripe",
    label: "Stripe",
    description: "Vertical color stripes on cream",
    tileW: 4, tileH: 1,
    grid: ["B", "A", "B", "A"],
    colorRules: {
      A: { type: "NEUTRAL" },
      B: { type: "FREE" },
    },
    freeSlots: ["B"],
  },
  {
    key: "logcabin",
    label: "Log Cabin",
    description: "Light and dark halves radiating from center",
    tileW: 4, tileH: 4,
    grid: [
      "A", "A", "A", "A",
      "A", "B", "B", "C",
      "A", "B", "B", "C",
      "D", "D", "D", "C",
    ],
    colorRules: {
      A: { type: "NEUTRAL" },
      B: { type: "FREE" },
      C: { type: "SHADE_DARK", of: "B", amount: 0.42 },
      D: { type: "SHADE_LIGHT", of: "B", amount: 0.50 },
    },
    freeSlots: ["B"],
  },
];

// ─── Curated palettes ────────────────────────────────────────────────────────

interface Palette {
  label: string;
  emoji: string;
  colors: Record<string, string>; // maps free slots (A, B …) → hex
}

const PALETTES: Palette[] = [
  { label: "Navy",     emoji: "🌊", colors: { A: "#1C3A6B", B: "#1C3A6B" } },
  { label: "Terracotta", emoji: "🏺", colors: { A: "#C2683A", B: "#C2683A" } },
  { label: "Sage",     emoji: "🌿", colors: { A: "#4A6B4A", B: "#4A6B4A" } },
  { label: "Teal",     emoji: "🦚", colors: { A: "#1E5F6B", B: "#1E5F6B" } },
  { label: "Berry",    emoji: "🫐", colors: { A: "#6B2060", B: "#6B2060" } },
  { label: "Gold",     emoji: "✨", colors: { A: "#8B6400", B: "#8B6400" } },
  { label: "Crimson",  emoji: "❤️", colors: { A: "#C41E3A", B: "#C41E3A" } },
  { label: "Slate",    emoji: "🩶", colors: { A: "#4A5568", B: "#4A5568" } },
  { label: "Plum",     emoji: "🍇", colors: { A: "#7B2D8B", B: "#7B2D8B" } },
  { label: "Olive",    emoji: "🫒", colors: { A: "#5C6B1E", B: "#5C6B1E" } },
  { label: "Rose",     emoji: "🌸", colors: { A: "#B5467A", B: "#B5467A" } },
  { label: "Cocoa",    emoji: "☕", colors: { A: "#6B3A1E", B: "#6B3A1E" } },
];

// ─── Grid size options ───────────────────────────────────────────────────────

interface GridOption {
  label: string;
  cols: number;
  rows: number;
  note?: string;
}

const GRID_OPTIONS: GridOption[] = [
  { label: "9×7",   cols: 9,  rows: 7,  note: "Baby / wall" },
  { label: "13×11", cols: 13, rows: 11, note: "Throw" },
  { label: "17×13", cols: 17, rows: 13, note: "Lap" },
  { label: "21×17", cols: 21, rows: 17, note: "Twin" },
];

// ─── Studio nav ──────────────────────────────────────────────────────────────

function StudioNav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#FAFAF8]/95 backdrop-blur-md border-b border-[#E7E5E4]">
      <div className="max-w-screen-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="grid grid-cols-3 gap-0.5 w-6 h-6">
              {["#C2683A","#E8C9B0","#C2683A","#E8C9B0","#C2683A","#E8C9B0","#C2683A","#E8C9B0","#C2683A"].map(
                (c, i) => (
                  <div key={i} className="rounded-[1px]" style={{ backgroundColor: c }} />
                )
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
            <Heart size={14} />
            <span className="hidden sm:inline">Save</span>
          </button>
          <button className="flex items-center gap-1.5 text-sm text-[#78716C] px-3 py-1.5 rounded-lg hover:bg-[#F5F5F4] transition-colors cursor-pointer">
            <Download size={14} />
            <span className="hidden sm:inline">Export PDF</span>
          </button>
          <button className="bg-[#C2683A] text-white text-sm font-medium px-4 py-1.5 rounded-lg hover:bg-[#9A4F28] transition-colors cursor-pointer flex items-center gap-1.5">
            <Sparkles size={13} />
            <span>Upgrade</span>
          </button>
        </div>
      </div>
    </nav>
  );
}

// ─── Main studio component ───────────────────────────────────────────────────

export default function StudioPage() {
  const [activeStyleIdx, setActiveStyleIdx] = useState(0);
  const [activePaletteIdx, setActivePaletteIdx] = useState(0);
  const [activeGridIdx, setActiveGridIdx] = useState(1); // default 13×11
  const [scrappy, setScrappy] = useState(false);
  const [lowVolume, setLowVolume] = useState(false);
  const [grid, setGrid] = useState<string[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [justSaved, setJustSaved] = useState(false);
  const generationSeed = useRef(0);

  const buildGrid = useCallback(
    (styleIdx: number, paletteIdx: number, gridIdx: number, isScrappy: boolean, isLowVolume: boolean, animate = true) => {
      if (animate) setIsTransitioning(true);
      generationSeed.current += 1;
      const thisSeed = generationSeed.current;

      setTimeout(() => {
        if (thisSeed !== generationSeed.current) return; // stale
        const def = STYLE_DEFS[styleIdx];
        const { cols, rows } = GRID_OPTIONS[gridIdx];
        const palette = PALETTES[paletteIdx];
        const colors: Record<string, string> = {};
        def.freeSlots.forEach((slot) => {
          // Map all free slots to the palette color (A or B both get same hue)
          colors[slot] = palette.colors[slot] ?? palette.colors.A ?? "#888888";
        });
        setGrid(generateTile(def, cols, rows, colors, isScrappy, isLowVolume));
        setIsTransitioning(false);
      }, animate ? 180 : 0);
    },
    []
  );

  // Initial build
  useEffect(() => {
    buildGrid(0, 0, 1, false, false, false);
  }, [buildGrid]);

  const handleGenerate = () => {
    // Rotate to a new palette on "Generate"
    const nextPalette = (activePaletteIdx + 1) % PALETTES.length;
    setActivePaletteIdx(nextPalette);
    buildGrid(activeStyleIdx, nextPalette, activeGridIdx, scrappy, lowVolume);
  };

  const handleStyleChange = (idx: number) => {
    setActiveStyleIdx(idx);
    buildGrid(idx, activePaletteIdx, activeGridIdx, scrappy, lowVolume);
  };

  const handlePaletteChange = (idx: number) => {
    setActivePaletteIdx(idx);
    buildGrid(activeStyleIdx, idx, activeGridIdx, scrappy, lowVolume);
  };

  const handleGridChange = (idx: number) => {
    setActiveGridIdx(idx);
    buildGrid(activeStyleIdx, activePaletteIdx, idx, scrappy, lowVolume);
  };

  const handleScrappyChange = (val: boolean) => {
    setScrappy(val);
    buildGrid(activeStyleIdx, activePaletteIdx, activeGridIdx, val, lowVolume);
  };

  const handleLowVolumeChange = (val: boolean) => {
    setLowVolume(val);
    buildGrid(activeStyleIdx, activePaletteIdx, activeGridIdx, scrappy, val);
  };

  const handleSave = () => {
    setSavedCount((c) => c + 1);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1500);
  };

  const { cols, rows } = GRID_OPTIONS[activeGridIdx];
  const activeDef = STYLE_DEFS[activeStyleIdx];
  const activePalette = PALETTES[activePaletteIdx];

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <StudioNav />

      {/* Two-column layout */}
      <div className="pt-14 flex flex-col lg:flex-row min-h-screen">

        {/* ── Left panel: controls ───────────────────────────────────────── */}
        <aside className="w-full lg:w-80 xl:w-88 lg:min-h-[calc(100vh-56px)] bg-white border-r border-[#E7E5E4] flex-shrink-0 overflow-y-auto">
          <div className="p-5 space-y-7">

            {/* Style picker */}
            <section>
              <SectionLabel>Pattern Style</SectionLabel>
              <div className="grid grid-cols-2 gap-2">
                {STYLE_DEFS.map((s, idx) => (
                  <button
                    key={s.key}
                    onClick={() => handleStyleChange(idx)}
                    className={`px-3 py-2.5 rounded-xl text-xs font-medium text-left transition-all cursor-pointer leading-tight ${
                      activeStyleIdx === idx
                        ? "bg-[#1C1917] text-white"
                        : "bg-[#F5F5F4] text-[#78716C] hover:bg-[#EDEBE9] hover:text-[#1C1917]"
                    }`}
                  >
                    <div className="font-semibold">{s.label}</div>
                    <div className={`text-[10px] mt-0.5 ${activeStyleIdx === idx ? "text-white/60" : "text-[#A8A29E]"}`}>
                      {s.description}
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* Palette picker */}
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
                    {/* Color swatch */}
                    <div
                      className="w-8 h-8 rounded-full border border-black/10 shadow-sm"
                      style={{ backgroundColor: p.colors.A ?? p.colors.B }}
                    />
                    <span className="text-[10px] text-[#78716C] font-medium">{p.label}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Grid size */}
            <section>
              <SectionLabel>Grid Size</SectionLabel>
              <div className="flex flex-col gap-1.5">
                {GRID_OPTIONS.map((g, idx) => (
                  <button
                    key={g.label}
                    onClick={() => handleGridChange(idx)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${
                      activeGridIdx === idx
                        ? "bg-[#1C1917] text-white"
                        : "bg-[#F5F5F4] text-[#78716C] hover:bg-[#EDEBE9] hover:text-[#1C1917]"
                    }`}
                  >
                    <span className="font-semibold font-mono tracking-wide">{g.label}</span>
                    <span className={`text-xs ${activeGridIdx === idx ? "text-white/60" : "text-[#A8A29E]"}`}>
                      {g.note}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            {/* Variation toggles */}
            <section>
              <SectionLabel>
                Variations
                <TooltipIcon text="Scrappy adds subtle tonal variety to colored squares — like using many fabrics in the same colorway. Low Volume swaps cream squares for a range of soft whites and naturals." />
              </SectionLabel>
              <div className="space-y-2.5">
                <Toggle
                  label="Scrappy"
                  description="Tonal variety in colored squares"
                  checked={scrappy}
                  onChange={handleScrappyChange}
                />
                <Toggle
                  label="Low Volume"
                  description="Varied creams instead of one neutral"
                  checked={lowVolume}
                  onChange={handleLowVolumeChange}
                />
              </div>
            </section>

            {/* Generate button */}
            <div className="space-y-2 pt-1">
              <button
                onClick={handleGenerate}
                className="w-full bg-[#C2683A] text-white font-semibold py-3.5 rounded-xl hover:bg-[#9A4F28] transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
              >
                <Shuffle size={16} />
                Generate new palette
              </button>
              <button
                onClick={() => buildGrid(activeStyleIdx, activePaletteIdx, activeGridIdx, scrappy, lowVolume)}
                className="w-full border border-[#E7E5E4] text-[#78716C] text-sm py-2.5 rounded-xl hover:border-[#C2683A] hover:text-[#C2683A] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw size={13} />
                Regenerate same style
              </button>
            </div>

            {/* Save / status */}
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

        {/* ── Right panel: pattern preview ──────────────────────────────── */}
        <main className="flex-1 flex flex-col items-center justify-center p-6 lg:p-10 gap-6">
          {/* Label bar */}
          <div className="flex items-center gap-3 text-sm">
            <span className="font-bold text-[#C2683A] uppercase tracking-widest text-xs">
              {activeDef.label}
            </span>
            <span className="text-[#D6D3D1]">·</span>
            <span className="text-[#78716C]">{activePalette.emoji} {activePalette.label}</span>
            {scrappy && (
              <>
                <span className="text-[#D6D3D1]">·</span>
                <span className="text-[#78716C] text-xs">Scrappy</span>
              </>
            )}
            {lowVolume && (
              <>
                <span className="text-[#D6D3D1]">·</span>
                <span className="text-[#78716C] text-xs">Low Volume</span>
              </>
            )}
          </div>

          {/* Pattern grid */}
          <div
            className="w-full rounded-2xl overflow-hidden shadow-2xl border border-black/5"
            style={{
              aspectRatio: `${cols} / ${rows}`,
              maxWidth: "min(100%, 800px)",
            }}
          >
            <div
              className="w-full h-full"
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${cols}, 1fr)`,
                gridTemplateRows: `repeat(${rows}, 1fr)`,
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

          {/* Quick stats */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-[#A8A29E]">
            <QuickStat label="Squares" value={(cols * rows).toString()} />
            <QuickStat label="Grid" value={`${cols} × ${rows}`} />
            <QuickStat label="Tile" value={`${activeDef.tileW}×${activeDef.tileH}`} />
            <QuickStat label="Colors" value={`${Object.keys(activeDef.colorRules).length} slots`} />
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

// ─── Sub-components ──────────────────────────────────────────────────────────

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
        <div className="absolute left-5 top-0 z-20 w-52 bg-[#1C1917] text-white text-[11px] leading-relaxed rounded-lg p-3 shadow-xl">
          {text}
          <div className="absolute left-[-5px] top-2 w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-[#1C1917]" />
        </div>
      )}
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between p-3 rounded-xl bg-[#F5F5F4] hover:bg-[#EDEBE9] cursor-pointer transition-colors group">
      <div>
        <div className="text-sm font-semibold text-[#1C1917]">{label}</div>
        <div className="text-[11px] text-[#A8A29E] mt-0.5">{description}</div>
      </div>
      <div
        className={`relative w-10 h-5.5 rounded-full transition-colors shrink-0 ml-3 ${
          checked ? "bg-[#C2683A]" : "bg-[#D6D3D1]"
        }`}
        style={{ height: "22px" }}
      >
        <div
          className={`absolute top-0.5 left-0.5 w-[18px] h-[18px] bg-white rounded-full shadow transition-transform ${
            checked ? "translate-x-[18px]" : "translate-x-0"
          }`}
        />
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
      </div>
    </label>
  );
}

function QuickStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="font-semibold text-[#78716C] text-sm">{value}</div>
      <div className="text-[10px] uppercase tracking-wider">{label}</div>
    </div>
  );
}
