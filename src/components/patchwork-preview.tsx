"use client";

import { useEffect, useState, useCallback } from "react";

// ─── Color utilities ──────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
}
function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r,g,b].map((v) => Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,"0")).join("");
}
function shadeDark(hex: string, amount = 0.35): string {
  const [r,g,b] = hexToRgb(hex);
  return rgbToHex(r*(1-amount), g*(1-amount), b*(1-amount));
}
function shadeLight(hex: string, amount = 0.45): string {
  const [r,g,b] = hexToRgb(hex);
  return rgbToHex(r+(255-r)*amount, g+(255-g)*amount, b+(255-b)*amount);
}

// ─── Ombré & Rainbow wash utilities ──────────────────────────────────────────

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
  h = ((h%360)+360)%360;
  const c = (1-Math.abs(2*l-1))*s;
  const x = c*(1-Math.abs((h/60)%2-1));
  const m = l-c/2;
  let r=0,g=0,b=0;
  if      (h<60)  {r=c;g=x;b=0;}
  else if (h<120) {r=x;g=c;b=0;}
  else if (h<180) {r=0;g=c;b=x;}
  else if (h<240) {r=0;g=x;b=c;}
  else if (h<300) {r=x;g=0;b=c;}
  else            {r=c;g=0;b=x;}
  const toHex = (n: number) => Math.round((n+m)*255).toString(16).padStart(2,"0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
function lerpColor(a: string, b: string, t: number): string {
  const ar=parseInt(a.slice(1,3),16),ag=parseInt(a.slice(3,5),16),ab=parseInt(a.slice(5,7),16);
  const br=parseInt(b.slice(1,3),16),bg=parseInt(b.slice(3,5),16),bb=parseInt(b.slice(5,7),16);
  const h = (n: number) => Math.round(n).toString(16).padStart(2,"0");
  return `#${h(ar+(br-ar)*t)}${h(ag+(bg-ag)*t)}${h(ab+(bb-ab)*t)}`;
}
function scrappyNudge(hex: string, seed: number): string {
  const [r,g,b] = hexToRgb(hex);
  const rng = (s: number) => ((Math.sin(s*127.3+311.7)*43758.5453)%1+1)%1;
  const amount = 0.08 + rng(seed)*0.14;
  return rng(seed+1) > 0.5
    ? rgbToHex(r*(1-amount), g*(1-amount), b*(1-amount))
    : rgbToHex(r+(255-r)*amount, g+(255-g)*amount, b+(255-b)*amount);
}

function applyWash(
  base: string,
  col: number, row: number,
  cols: number, rows: number,
  wash: "solid" | "ombre" | "rainbow"
): string {
  if (wash === "solid") return base;
  const t = (cols > 1 && rows > 1) ? (col/(cols-1) + row/(rows-1)) / 2 : 0;
  if (wash === "ombre") return lerpColor(base, "#FFFFFF", t * 0.42);
  const { h, s, l } = hexToHsl(base);
  return hslToHex((h + t*300) % 360, Math.max(s, 0.60), Math.min(Math.max(l, 0.42), 0.65));
}

// ─── Color rule system ────────────────────────────────────────────────────────

const NEUTRAL = "#F5F0E8";

type ColorRule =
  | { type: "NEUTRAL" }
  | { type: "FREE" }
  | { type: "SHADE_DARK";  of: string; amount?: number }
  | { type: "SHADE_LIGHT"; of: string; amount?: number };

function resolveSlots(
  rules: Record<string, ColorRule>,
  freeColors: Record<string, string>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [slot, rule] of Object.entries(rules)) {
    if (rule.type === "NEUTRAL") out[slot] = NEUTRAL;
    if (rule.type === "FREE")    out[slot] = freeColors[slot] ?? "#888888";
  }
  for (const [slot, rule] of Object.entries(rules)) {
    if (rule.type === "SHADE_DARK")  out[slot] = shadeDark(out[rule.of]  ?? "#888888", rule.amount);
    if (rule.type === "SHADE_LIGHT") out[slot] = shadeLight(out[rule.of] ?? "#888888", rule.amount);
  }
  return out;
}

// ─── Showcase definitions ─────────────────────────────────────────────────────

interface ShowcaseDef {
  key:        string;
  label:      string;   // shown in header
  sublabel:   string;   // shown in header (wash + color)
  chipLabel:  string;   // shown in selector chip (shorter)
  tileW:      number;
  tileH:      number;
  grid:       string[];
  colorRules: Record<string, ColorRule>;
  freeSlot:   string;
  baseColor:  string;
  wash:       "solid" | "ombre" | "rainbow";
  scrappy?:   boolean;
}

const COLS = 15;
const ROWS = 15;

const SHOWCASES: ShowcaseDef[] = [
  // 1 — Granny Square · Ombré · Teal
  {
    key: "granny-ombre",
    label: "Granny Square", sublabel: "Ombré · Teal", chipLabel: "Granny Ombré",
    tileW: 5, tileH: 5,
    grid: [
      "D","D","C","D","D",
      "D","C","B","C","D",
      "C","B","A","B","C",
      "D","C","B","C","D",
      "D","D","C","D","D",
    ],
    colorRules: {
      A: { type: "FREE" },
      B: { type: "SHADE_LIGHT", of: "A", amount: 0.45 },
      C: { type: "SHADE_DARK",  of: "A", amount: 0.38 },
      D: { type: "NEUTRAL" },
    },
    freeSlot: "A", baseColor: "#1B6B8A", wash: "ombre",
  },

  // 2 — 9-Patch X · Rainbow · Coral
  {
    key: "ninepatch-x-rainbow",
    label: "9-Patch X", sublabel: "Rainbow · Coral", chipLabel: "9-Patch X",
    tileW: 3, tileH: 3,
    grid: ["A","B","A","B","A","B","A","B","A"],
    colorRules: { A: { type: "FREE" }, B: { type: "NEUTRAL" } },
    freeSlot: "A", baseColor: "#C2683A", wash: "rainbow",
  },

  // 3 — Gingham Classic · Solid · Navy
  {
    key: "gingham-classic",
    label: "Gingham Classic", sublabel: "Solid · Navy", chipLabel: "Gingham",
    tileW: 2, tileH: 2,
    grid: ["A","B","B","C"],
    colorRules: {
      A: { type: "NEUTRAL" },
      B: { type: "FREE" },
      C: { type: "SHADE_DARK", of: "B", amount: 0.38 },
    },
    freeSlot: "B", baseColor: "#1C3A6B", wash: "solid",
  },

  // 4 — 25-Patch · Ombré · Berry
  {
    key: "twentyfive-ombre",
    label: "25-Patch", sublabel: "Ombré · Berry", chipLabel: "25-Patch",
    tileW: 5, tileH: 5,
    grid: [
      "A","B","A","B","A",
      "B","A","B","A","B",
      "A","B","A","B","A",
      "B","A","B","A","B",
      "A","B","A","B","A",
    ],
    colorRules: {
      A: { type: "FREE" },
      B: { type: "SHADE_LIGHT", of: "A", amount: 0.45 },
    },
    freeSlot: "A", baseColor: "#6B2060", wash: "ombre",
  },

  // 5 — Granny Square · Rainbow · Indigo
  {
    key: "granny-rainbow",
    label: "Granny Square", sublabel: "Rainbow · Indigo", chipLabel: "Granny Rainbow",
    tileW: 5, tileH: 5,
    grid: [
      "D","D","C","D","D",
      "D","C","B","C","D",
      "C","B","A","B","C",
      "D","C","B","C","D",
      "D","D","C","D","D",
    ],
    colorRules: {
      A: { type: "FREE" },
      B: { type: "SHADE_LIGHT", of: "A", amount: 0.45 },
      C: { type: "SHADE_DARK",  of: "A", amount: 0.38 },
      D: { type: "NEUTRAL" },
    },
    freeSlot: "A", baseColor: "#3B2E8C", wash: "rainbow",
  },

  // 6 — 9-Patch + · Solid · Sage
  {
    key: "ninepatch-plus",
    label: "9-Patch +", sublabel: "Solid · Sage", chipLabel: "9-Patch +",
    tileW: 3, tileH: 3,
    grid: ["A","B","A","B","B","B","A","B","A"],
    colorRules: { A: { type: "NEUTRAL" }, B: { type: "FREE" } },
    freeSlot: "B", baseColor: "#4A6B4A", wash: "solid",
  },

  // 7 — 25-Patch · Scrappy · Navy
  {
    key: "twentyfive-scrappy",
    label: "25-Patch", sublabel: "Scrappy · Navy", chipLabel: "Scrappy",
    tileW: 5, tileH: 5,
    grid: [
      "A","B","A","B","A",
      "B","A","B","A","B",
      "A","B","A","B","A",
      "B","A","B","A","B",
      "A","B","A","B","A",
    ],
    colorRules: {
      A: { type: "FREE" },
      B: { type: "SHADE_LIGHT", of: "A", amount: 0.45 },
    },
    freeSlot: "A", baseColor: "#1C3A6B", wash: "solid", scrappy: true,
  },
];

// ─── Grid generator ───────────────────────────────────────────────────────────

function generateShowcase(def: ShowcaseDef): string[] {
  const colors = { [def.freeSlot]: def.baseColor };
  const resolved = resolveSlots(def.colorRules, colors);
  return Array.from({ length: COLS * ROWS }, (_, i) => {
    const row = Math.floor(i / COLS);
    const col = i % COLS;
    const tileRow = row % def.tileH;
    const tileCol = col % def.tileW;
    const pos  = tileRow * def.tileW + tileCol;
    const slot = def.grid[pos];
    const rule = def.colorRules[slot];
    const base = resolved[slot] ?? "#CCCCCC";
    if (rule?.type === "FREE") {
      const washed = applyWash(base, col, row, COLS, ROWS, def.wash);
      return def.scrappy ? scrappyNudge(washed, i*7 + col*13 + row*31) : washed;
    }
    return base;
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PatchworkPreview() {
  const [activeIdx, setActiveIdx]             = useState(0);
  const [grid, setGrid]                       = useState<string[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const buildGrid = useCallback((idx: number, animate = true) => {
    if (animate) setIsTransitioning(true);
    setTimeout(() => {
      setGrid(generateShowcase(SHOWCASES[idx]));
      setIsTransitioning(false);
    }, animate ? 220 : 0);
  }, []);

  // Initial render (no animation)
  useEffect(() => { buildGrid(0, false); }, [buildGrid]);

  // Auto-cycle every 5 s
  useEffect(() => {
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % SHOWCASES.length;
      setActiveIdx(idx);
      buildGrid(idx);
    }, 5000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChipClick = (idx: number) => {
    setActiveIdx(idx);
    buildGrid(idx);
  };

  const showcase = SHOWCASES[activeIdx];

  return (
    <div className="flex flex-col gap-4">

      {/* Header label */}
      <div className="flex items-center justify-center gap-3">
        <span className="text-xs font-bold text-[#C2683A] uppercase tracking-widest">
          {showcase.label}
        </span>
        <span className="text-xs text-[#D6D3D1]">·</span>
        <span className="text-xs text-[#78716C]">{showcase.sublabel}</span>
      </div>

      {/* Pattern grid — fixed 15×15 square aspect ratio */}
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

      {/* Showcase selector chips */}
      <div className="flex flex-wrap gap-2 justify-center">
        {SHOWCASES.map((s, idx) => (
          <button
            key={s.key}
            onClick={() => handleChipClick(idx)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
              activeIdx === idx
                ? "bg-[#1C1917] text-white"
                : "bg-white text-[#78716C] border border-[#E7E5E4] hover:border-[#C2683A] hover:text-[#C2683A]"
            }`}
          >
            {s.chipLabel}
          </button>
        ))}
      </div>

      <p className="text-center text-xs text-[#A8A29E]">
        Try it yourself →{" "}
        <a
          href="/studio"
          className="text-[#C2683A] underline underline-offset-2 hover:text-[#9A4F28] transition-colors"
        >
          Open the studio
        </a>
      </p>
    </div>
  );
}
