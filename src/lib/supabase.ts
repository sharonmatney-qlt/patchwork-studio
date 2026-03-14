import { createClient } from '@supabase/supabase-js'

// Server-only Supabase client using the service role key.
// Never import this in client components — the service role key must stay server-side.
// All auth checks are handled by Clerk's auth() before any DB operation.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// ── Types ─────────────────────────────────────────────────────────────────

export interface PatternSettings {
  activeBlockIdx: number
  activePaletteIdx: number
  secondaryMode: {
    type: 'none' | 'neutral' | 'contrast' | 'inverted' | 'block'
    defIdx?: number
  }
  sashing: {
    layout: 'none' | 'columns' | 'rows' | 'both'
    color: 'neutral' | 'contrast'
  }
  isCustomGrid: boolean
  activeGridIdx?: number
  customCols?: number
  customRows?: number
  isCustomSquare: boolean
  squarePresetIdx?: number
  customSquareStr?: string
  scrappy: boolean
  lowVolume: boolean
  primaryMode: 'solid' | 'ombre' | 'rainbow'
  squareOverrides: Record<string, string>
}

export interface SavedPattern {
  id: string
  user_id: string
  name: string
  settings: PatternSettings
  is_public: boolean
  remix_of: string | null
  created_at: string
  updated_at: string
}

// ── Makes ──────────────────────────────────────────────────────────────────

export type MakeStatus = 'planning' | 'making' | 'made'

export interface MakeStep {
  done: boolean
  notes: string
}

export interface MakeSteps {
  cut:   MakeStep
  piece: MakeStep
  layer: MakeStep
  quilt: MakeStep
  bind:  MakeStep
}

export const MAKE_STEP_LABELS: Record<keyof MakeSteps, string> = {
  cut:   'Cut',
  piece: 'Piece',
  layer: 'Layer',
  quilt: 'Quilt',
  bind:  'Bind',
}

export const DEFAULT_MAKE_STEPS: MakeSteps = {
  cut:   { done: false, notes: '' },
  piece: { done: false, notes: '' },
  layer: { done: false, notes: '' },
  quilt: { done: false, notes: '' },
  bind:  { done: false, notes: '' },
}

// ── Profiles (synced from Clerk via webhook) ───────────────────────────────

export interface Profile {
  user_id: string
  display_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

// ── Likes ──────────────────────────────────────────────────────────────────

export interface Like {
  id: string
  user_id: string
  target_id: string
  target_type: 'pattern' | 'make'
  created_at: string
}

// ── Make Step Comments ──────────────────────────────────────────────────────

export interface MakeStepComment {
  id: string
  make_id: string
  step: string
  commenter_id: string
  text: string
  created_at: string
  // joined from profiles when fetched
  profile?: Pick<Profile, 'display_name' | 'avatar_url'>
}

// ── Make Photos ────────────────────────────────────────────────────────────

export interface MakePhoto {
  id: string
  make_id: string
  step: string
  storage_path: string
  url: string           // public URL, computed server-side
  created_at: string
}

export interface Make {
  id: string
  user_id: string
  pattern_id: string | null
  name: string
  status: MakeStatus
  steps: MakeSteps
  progress_photos: string[]
  finished_photo_url: string | null
  is_public: boolean
  created_at: string
  updated_at: string
  // joined from patterns table when fetched
  pattern?: SavedPattern
}
