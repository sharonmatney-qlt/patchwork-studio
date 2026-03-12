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
