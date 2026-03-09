// ─── blocks.ts ────────────────────────────────────────────────────────────────
//
// Single source of truth for all block definitions, palettes, and the Kona
// color library. Edit here to update the studio — no rendering logic lives in
// this file. A future admin UI will read/write these same structures.

// ─── Core constants ───────────────────────────────────────────────────────────

export const NEUTRAL = "#F5F0E8";

// ─── Color rule system ────────────────────────────────────────────────────────

export type ColorRule =
  | { type: "NEUTRAL" }
  | { type: "FREE" }
  | { type: "CONTRAST"; of: string }
  | { type: "SHADE_DARK";  of: string; amount?: number }
  | { type: "SHADE_LIGHT"; of: string; amount?: number };

// ─── Secondary block mode ─────────────────────────────────────────────────────

export type SecondaryMode =
  | { type: "none" }
  | { type: "neutral" }
  | { type: "contrast" }
  | { type: "inverted" }
  | { type: "block"; defIdx: number };

// ─── Sashing ──────────────────────────────────────────────────────────────────

export interface SashingConfig {
  layout: "none" | "columns" | "rows" | "both";
  color:  "neutral" | "contrast";
}

// ─── Block definition ─────────────────────────────────────────────────────────
//
// Fields:
//   key            — stable identifier, used as React key and future DB id
//   label          — display name shown in the block picker
//   description    — short description (no color language)
//   tileW / tileH  — dimensions of one repeating block unit in squares
//   grid           — slot letter for each position in the tileW×tileH tile
//   colorRules     — maps each slot letter to its color rule
//   freeSlots      — which slots are FREE (draw from the active palette)
//   defaultSecondary — secondary block mode applied automatically on selection
//   defaultCols    — grid width applied on selection (multiple of tileW)
//   defaultRows    — grid height applied on selection (multiple of tileH)

export interface BlockDef {
  key:              string;
  label:            string;
  description:      string;
  tileW:            number;
  tileH:            number;
  grid:             string[];
  colorRules:       Record<string, ColorRule>;
  freeSlots:        string[];
  defaultSecondary: SecondaryMode;
  defaultCols:      number;
  defaultRows:      number;
}

// ─── Block definitions ────────────────────────────────────────────────────────

export const BLOCK_DEFS: BlockDef[] = [
  {
    key: "fourpatch", label: "4-Patch",
    description: "Two alternating squares — the essential quilting building block",
    tileW: 2, tileH: 2, grid: ["A","B","B","A"],
    colorRules: { A: { type: "FREE" }, B: { type: "NEUTRAL" } },
    freeSlots: ["A"],
    defaultSecondary: { type: "none" },
    defaultCols: 12, defaultRows: 10,
  },
  {
    key: "ninepatch-x", label: "9-Patch X",
    description: "Nine squares where the diagonal positions form an X",
    tileW: 3, tileH: 3, grid: ["A","B","A","B","A","B","A","B","A"],
    colorRules: { A: { type: "FREE" }, B: { type: "NEUTRAL" } },
    freeSlots: ["A"],
    defaultSecondary: { type: "neutral" },
    defaultCols: 12, defaultRows: 9,
  },
  {
    key: "ninepatch-o", label: "9-Patch O",
    description: "Nine squares where the edge positions form an O",
    tileW: 3, tileH: 3, grid: ["A","B","A","B","A","B","A","B","A"],
    colorRules: { A: { type: "NEUTRAL" }, B: { type: "FREE" } },
    freeSlots: ["B"],
    defaultSecondary: { type: "neutral" },
    defaultCols: 12, defaultRows: 9,
  },
  {
    key: "ninepatch-plus", label: "9-Patch +",
    description: "Nine squares where the cross positions form a +",
    tileW: 3, tileH: 3, grid: ["A","B","A","B","B","B","A","B","A"],
    colorRules: { A: { type: "NEUTRAL" }, B: { type: "FREE" } },
    freeSlots: ["B"],
    defaultSecondary: { type: "neutral" },
    defaultCols: 12, defaultRows: 9,
  },
  {
    key: "sixteenpatch", label: "16-Patch",
    description: "Sixteen alternating squares in two tonal values",
    tileW: 4, tileH: 4,
    grid: ["A","B","A","B","B","A","B","A","A","B","A","B","B","A","B","A"],
    colorRules: { A: { type: "FREE" }, B: { type: "SHADE_LIGHT", of: "A", amount: 0.45 } },
    freeSlots: ["A"],
    defaultSecondary: { type: "none" },
    defaultCols: 12, defaultRows: 8,
  },
  {
    key: "twentyfivepatch", label: "25-Patch",
    description: "Twenty-five alternating squares in two tonal values",
    tileW: 5, tileH: 5,
    grid: [
      "A","B","A","B","A",
      "B","A","B","A","B",
      "A","B","A","B","A",
      "B","A","B","A","B",
      "A","B","A","B","A",
    ],
    colorRules: { A: { type: "FREE" }, B: { type: "SHADE_LIGHT", of: "A", amount: 0.45 } },
    freeSlots: ["A"],
    defaultSecondary: { type: "neutral" },
    defaultCols: 10, defaultRows: 10,
  },
  {
    key: "grannysquare", label: "Granny Square",
    description: "Four concentric rings radiating outward from center",
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
    freeSlots: ["A"],
    defaultSecondary: { type: "neutral" },
    defaultCols: 10, defaultRows: 10,
  },
  {
    key: "gingham1", label: "Gingham Classic",
    description: "Woven-look check built from three tonal values",
    tileW: 2, tileH: 2, grid: ["A","B","B","C"],
    colorRules: { A: { type: "NEUTRAL" }, B: { type: "FREE" }, C: { type: "SHADE_DARK", of: "B", amount: 0.38 } },
    freeSlots: ["B"],
    defaultSecondary: { type: "none" },
    defaultCols: 12, defaultRows: 10,
  },
  {
    key: "gingham2", label: "Gingham Rich",
    description: "Four-value woven check with added tonal depth",
    tileW: 2, tileH: 2, grid: ["A","B","C","D"],
    colorRules: { A: { type: "NEUTRAL" }, B: { type: "FREE" }, C: { type: "SHADE_LIGHT", of: "B", amount: 0.45 }, D: { type: "SHADE_DARK", of: "B", amount: 0.38 } },
    freeSlots: ["B"],
    defaultSecondary: { type: "none" },
    defaultCols: 12, defaultRows: 10,
  },
];

// ─── Curated palettes ─────────────────────────────────────────────────────────

export interface Palette {
  label:  string;
  emoji:  string;
  colors: Record<string, string>;
}

export const PALETTES: Palette[] = [
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

// ─── Kona color library ───────────────────────────────────────────────────────

export interface KonaColor {
  name:   string;
  hex:    string;
  family: string;
}

export const KONA_FAMILIES = [
  "Neutral", "Blue", "Green", "Yellow", "Orange", "Pink/Red", "Purple", "Brown",
];

export const KONA_COLORS: KonaColor[] = [
  // Neutrals
  { name: "White",       hex: "#FFFFFF", family: "Neutral" },
  { name: "Snow",        hex: "#F8F4F0", family: "Neutral" },
  { name: "Parchment",   hex: "#F2E8D8", family: "Neutral" },
  { name: "Bone",        hex: "#E8DFD0", family: "Neutral" },
  { name: "Sand",        hex: "#D4C4A8", family: "Neutral" },
  { name: "Stone",       hex: "#A89880", family: "Neutral" },
  { name: "Ash",         hex: "#C0B8B0", family: "Neutral" },
  { name: "Charcoal",    hex: "#4A4540", family: "Neutral" },
  { name: "Coal",        hex: "#2A2420", family: "Neutral" },
  { name: "Black",       hex: "#1A1410", family: "Neutral" },
  // Blues
  { name: "Powder",      hex: "#B8D4E8", family: "Blue" },
  { name: "Sky",         hex: "#87B8D4", family: "Blue" },
  { name: "Periwinkle",  hex: "#7890C8", family: "Blue" },
  { name: "Cornflower",  hex: "#5878B8", family: "Blue" },
  { name: "Bluebell",    hex: "#4060A8", family: "Blue" },
  { name: "Denim",       hex: "#2A4878", family: "Blue" },
  { name: "Navy",        hex: "#1C3060", family: "Blue" },
  { name: "Midnight",    hex: "#101830", family: "Blue" },
  { name: "Teal",        hex: "#1E5F6B", family: "Blue" },
  { name: "Peacock",     hex: "#2A7890", family: "Blue" },
  // Greens
  { name: "Mint",        hex: "#A8D8B8", family: "Green" },
  { name: "Sage",        hex: "#7A9870", family: "Green" },
  { name: "Fern",        hex: "#4A7848", family: "Green" },
  { name: "Moss",        hex: "#4A6040", family: "Green" },
  { name: "Leaf",        hex: "#3A6830", family: "Green" },
  { name: "Forest",      hex: "#284820", family: "Green" },
  { name: "Olive",       hex: "#5C6B1E", family: "Green" },
  { name: "Artichoke",   hex: "#788048", family: "Green" },
  { name: "Avocado",     hex: "#506030", family: "Green" },
  // Yellows & Golds
  { name: "Butter",      hex: "#F8E890", family: "Yellow" },
  { name: "Sunshine",    hex: "#F0C830", family: "Yellow" },
  { name: "Gold",        hex: "#C89810", family: "Yellow" },
  { name: "Amber",       hex: "#B07808", family: "Yellow" },
  { name: "Honey",       hex: "#D08820", family: "Yellow" },
  { name: "Maize",       hex: "#E0A828", family: "Yellow" },
  // Oranges
  { name: "Melon",       hex: "#F0A878", family: "Orange" },
  { name: "Peach",       hex: "#F0C0A0", family: "Orange" },
  { name: "Tangerine",   hex: "#E87830", family: "Orange" },
  { name: "Terra Cotta", hex: "#C2683A", family: "Orange" },
  { name: "Rust",        hex: "#A04820", family: "Orange" },
  { name: "Sienna",      hex: "#8B4513", family: "Orange" },
  { name: "Cayenne",     hex: "#A03018", family: "Orange" },
  // Reds & Pinks
  { name: "Blush",       hex: "#F0B8C0", family: "Pink/Red" },
  { name: "Flamingo",    hex: "#F08898", family: "Pink/Red" },
  { name: "Rose",        hex: "#D85878", family: "Pink/Red" },
  { name: "Cerise",      hex: "#C03060", family: "Pink/Red" },
  { name: "Crimson",     hex: "#B81838", family: "Pink/Red" },
  { name: "Scarlet",     hex: "#C82020", family: "Pink/Red" },
  { name: "Red",         hex: "#B01818", family: "Pink/Red" },
  { name: "Watermelon",  hex: "#D84860", family: "Pink/Red" },
  { name: "Coral",       hex: "#E87060", family: "Pink/Red" },
  { name: "Candy Pink",  hex: "#E87898", family: "Pink/Red" },
  // Purples
  { name: "Lavender",    hex: "#C8B8E0", family: "Purple" },
  { name: "Wisteria",    hex: "#A890C8", family: "Purple" },
  { name: "Lilac",       hex: "#9878B8", family: "Purple" },
  { name: "Grape",       hex: "#7850A0", family: "Purple" },
  { name: "Plum",        hex: "#602880", family: "Purple" },
  { name: "Eggplant",    hex: "#401858", family: "Purple" },
  { name: "Berry",       hex: "#6B2060", family: "Purple" },
  { name: "Magenta",     hex: "#A02878", family: "Purple" },
  { name: "Orchid",      hex: "#C058A0", family: "Purple" },
  // Browns
  { name: "Linen",       hex: "#E8D8C0", family: "Brown" },
  { name: "Wheat",       hex: "#D8C098", family: "Brown" },
  { name: "Tan",         hex: "#C09868", family: "Brown" },
  { name: "Camel",       hex: "#A87840", family: "Brown" },
  { name: "Brown",       hex: "#785030", family: "Brown" },
  { name: "Chocolate",   hex: "#503018", family: "Brown" },
  { name: "Cocoa",       hex: "#6B3A1E", family: "Brown" },
  { name: "Espresso",    hex: "#301808", family: "Brown" },
];
