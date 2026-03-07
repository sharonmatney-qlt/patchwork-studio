"use client";

import { useEffect, useState, useCallback } from "react";

// ─── Color utilities ───────────────────────────────────────────────────────

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

/**
 * Compute a high-contrast companion to a given color.
 * Light colors → strongly darkened; dark colors → strongly lightened.
 */
function contrastColor(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  // Perceived luminance (ITU-R BT.601)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.45 ? shadeDark(hex, 0.72) : shadeLight(hex, 0.78);
}

// ─── Color rule system ─────────────────────────────────────────────────────

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

  // Pass 1 — absolute values: NEUTRAL + FREE
  for (const [slot, rule] of Object.entries(rules)) {
    if (rule.type === "NEUTRAL") out[slot] = NEUTRAL;
    if (rule.type === "FREE")    out[slot] = freeColors[slot] ?? "#888888";
  }

  // Pass 2 — derived: CONTRAST, SHADE_DARK, SHADE_LIGHT (all need pass-1 results)
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

// ─── Tile engine ───────────────────────────────────────────────────────────

interface TileStyleDef {
  key: string;
  label: string;
  tileW: number;
  tileH: number;
  grid: string[];
  colorRules: Record<string, ColorRule>;
}

function generateTile(
  def: TileStyleDef,
  cols: number,
  rows: number,
  freeColors: Record<string, string>
): string[] {
  const resolved = resolveSlots(def.colorRules, freeColors);
  return Array.from({ length: cols * rows }, (_, i) => {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const pos = (r % def.tileH) * def.tileW + (c % def.tileW);
    return resolved[def.grid[pos]] ?? "#CCCCCC";
  });
}

// ─── Style definitions ─────────────────────────────────────────────────────
//
//  Checkerboard  A B / B A   A=NEUTRAL   B=FREE
//  Check         A B / B A   A=FREE      B=CONTRAST(A)
//  Gingham 1     A B / B C   A=NEUTRAL   B=FREE        C=SHADE_DARK(B)
//  Gingham 2     A B / C D   A=NEUTRAL   B=FREE        C=SHADE_LIGHT(B)  D=SHADE_DARK(B)

const STYLE_DEFS: TileStyleDef[] = [
  {
    key: "checkerboard",
    label: "Checkerboard",
    tileW: 2, tileH: 2,
    grid: ["A", "B", "B", "A"],
    colorRules: {
      A: { type: "NEUTRAL" },
      B: { type: "FREE" },
    },
  },
  {
    key: "check",
    label: "Check",
    tileW: 2, tileH: 2,
    grid: ["A", "B", "B", "A"],
    colorRules: {
      A: { type: "FREE" },
      B: { type: "CONTRAST", of: "A" },   // ← fixed: was FREE, now CONTRAST(A)
    },
  },
  {
    key: "gingham1",
    label: "Gingham (Classic)",
    tileW: 2, tileH: 2,
    grid: ["A", "B", "B", "C"],
    colorRules: {
      A: { type: "NEUTRAL" },
      B: { type: "FREE" },
      C: { type: "SHADE_DARK", of: "B", amount: 0.38 },
    },
  },
  {
    key: "gingham2",
    label: "Gingham (Rich)",
    tileW: 2, tileH: 2,
    grid: ["A", "B", "C", "D"],
    colorRules: {
      A: { type: "NEUTRAL" },
      B: { type: "FREE" },
      C: { type: "SHADE_LIGHT", of: "B", amount: 0.45 },
      D: { type: "SHADE_DARK",  of: "B", amount: 0.38 },
    },
  },
];

// ─── Demo rotations ────────────────────────────────────────────────────────
// Only FREE slots need values here — CONTRAST/SHADE_* are auto-derived.

const DEMO_ROTATIONS: { label: string; colors: Record<string, string> }[] = [
  { label: "Navy",   colors: { A: "#1C3A6B", B: "#1C3A6B" } },
  { label: "Red",    colors: { A: "#C41E3A", B: "#C41E3A" } },
  { label: "Sage",   colors: { A: "#4A6B4A", B: "#4A6B4A" } },
  { label: "Teal",   colors: { A: "#1E5F6B", B: "#1E5F6B" } },
  { label: "Berry",  colors: { A: "#6B2060", B: "#6B2060" } },
  { label: "Gold",   colors: { A: "#8B6400", B: "#8B6400" } },
];

// Check only needs A — B is derived via CONTRAST(A)
const CHECK_ROTATIONS: { label: string; colors: Record<string, string> }[] = [
  { label: "Navy",   colors: { A: "#1C3A6B" } },
  { label: "Red",    colors: { A: "#C41E3A" } },
  { label: "Sage",   colors: { A: "#4A6B4A" } },
  { label: "Berry",  colors: { A: "#6B2060" } },
  { label: "Gold",   colors: { A: "#8B6400" } },
  { label: "Teal",   colors: { A: "#1E5F6B" } },
];

// 13 × 11 — both odd, so every 2×2 and 3×3 tile starts and ends on the
// same color slot, giving the pattern a symmetrically framed appearance.
// 13 cols also satisfies Nine-Patch (12 % 3 === 0, lands back at slot A).
// Landscape ratio (≈ 1.18 : 1) sits better beside hero text.
const COLS = 13;
const ROWS = 11;

export default function PatchworkPreview() {
  const [activeStyleIdx, setActiveStyleIdx] = useState(0);
  const [rotationIdx, setRotationIdx]       = useState(0);
  const [grid, setGrid]                     = useState<string[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const getRotations = useCallback((styleIdx: number) =>
    STYLE_DEFS[styleIdx].key === "check" ? CHECK_ROTATIONS : DEMO_ROTATIONS,
  []);

  const buildGrid = useCallback(
    (styleIdx: number, rotIdx: number, animate = true) => {
      if (animate) setIsTransitioning(true);
      setTimeout(() => {
        const def = STYLE_DEFS[styleIdx];
        const rotations = STYLE_DEFS[styleIdx].key === "check"
          ? CHECK_ROTATIONS
          : DEMO_ROTATIONS;
        const { colors } = rotations[rotIdx % rotations.length];
        setGrid(generateTile(def, COLS, ROWS, colors));
        setIsTransitioning(false);
      }, animate ? 220 : 0);
    },
    []
  );

  useEffect(() => { buildGrid(0, 0, false); }, [buildGrid]);

  useEffect(() => {
    let sIdx = 0, rIdx = 0, ticks = 0;
    const interval = setInterval(() => {
      ticks++;
      rIdx++;
      if (ticks % 6 === 0) {           // new style every 15 s
        sIdx = (sIdx + 1) % STYLE_DEFS.length;
        setActiveStyleIdx(sIdx);
        rIdx = 0;
      }
      setRotationIdx(rIdx);
      buildGrid(sIdx, rIdx);
    }, 2500);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStyleClick = (idx: number) => {
    setActiveStyleIdx(idx);
    setRotationIdx(0);
    buildGrid(idx, 0);
  };

  const rotations    = getRotations(activeStyleIdx);
  const currentLabel = rotations[rotationIdx % rotations.length]?.label ?? "";

  return (
    <div className="flex flex-col gap-4">
      {/* Active label row */}
      <div className="flex items-center justify-center gap-3">
        <span className="text-xs font-bold text-[#C2683A] uppercase tracking-widest">
          {STYLE_DEFS[activeStyleIdx].label}
        </span>
        <span className="text-xs text-[#D6D3D1]">·</span>
        <span className="text-xs text-[#78716C]">{currentLabel}</span>
      </div>

      {/* 13 × 11 — odd dims for symmetric framing, landscape ratio */}
      <div
        className="rounded-2xl overflow-hidden shadow-2xl border border-black/5"
        style={{ aspectRatio: `${COLS} / ${ROWS}` }}
      >
        <div
          className="w-full h-full"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${COLS}, 1fr)`,
            gridTemplateRows:    `repeat(${ROWS}, 1fr)`,
            // ← gap and padding removed; squares touch directly
          }}
        >
          {grid.map((color, i) => (
            <div
              key={i}
              style={{
                backgroundColor: color,
                transition: isTransitioning
                  ? `background-color ${0.05 + (i % 16) * 0.008}s ease`
                  : "background-color 0.3s ease",
              }}
            />
          ))}
        </div>
      </div>

      {/* Style selector chips */}
      <div className="flex flex-wrap gap-2 justify-center">
        {STYLE_DEFS.map((s, idx) => (
          <button
            key={s.key}
            onClick={() => handleStyleClick(idx)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
              activeStyleIdx === idx
                ? "bg-[#1C1917] text-white"
                : "bg-white text-[#78716C] border border-[#E7E5E4] hover:border-[#C2683A] hover:text-[#C2683A]"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <p className="text-center text-xs text-[#A8A29E] italic">
        More styles coming soon
      </p>
    </div>
  );
}
