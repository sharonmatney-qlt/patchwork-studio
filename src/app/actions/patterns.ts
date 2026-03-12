'use server'

import { auth } from '@clerk/nextjs/server'
import { supabase, PatternSettings, SavedPattern } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

// ── Save (insert or update) ────────────────────────────────────────────────

export async function savePattern(
  settings: PatternSettings,
  name: string,
  existingId?: string,
): Promise<{ id: string; error?: string }> {
  const { userId } = await auth()
  if (!userId) return { id: '', error: 'Not signed in' }

  if (existingId) {
    // Update existing pattern (user must own it)
    const { data, error } = await supabase
      .from('patterns')
      .update({ settings, name, updated_at: new Date().toISOString() })
      .eq('id', existingId)
      .eq('user_id', userId)
      .select('id')
      .single()

    if (error) return { id: '', error: error.message }
    revalidatePath('/dashboard')
    return { id: data.id }
  }

  // Insert new pattern
  const { data, error } = await supabase
    .from('patterns')
    .insert({ user_id: userId, settings, name })
    .select('id')
    .single()

  if (error) return { id: '', error: error.message }
  revalidatePath('/dashboard')
  return { id: data.id }
}

// ── Get all patterns for current user ─────────────────────────────────────

export async function getUserPatterns(): Promise<SavedPattern[]> {
  const { userId } = await auth()
  if (!userId) return []

  const { data, error } = await supabase
    .from('patterns')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('getUserPatterns error:', error)
    return []
  }

  return data ?? []
}

// ── Get a single pattern (must be owned by user or public) ─────────────────

export async function getPattern(id: string): Promise<SavedPattern | null> {
  const { userId } = await auth()

  const { data, error } = await supabase
    .from('patterns')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return null

  // Allow access if owned by user or is public
  if (data.user_id !== userId && !data.is_public) return null

  return data
}

// ── Rename a pattern ───────────────────────────────────────────────────────

export async function updatePatternName(
  id: string,
  name: string,
): Promise<{ error?: string }> {
  const { userId } = await auth()
  if (!userId) return { error: 'Not signed in' }

  const { error } = await supabase
    .from('patterns')
    .update({ name })
    .eq('id', id)
    .eq('user_id', userId)

  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return {}
}

// ── Delete a pattern ───────────────────────────────────────────────────────

export async function deletePattern(id: string): Promise<{ error?: string }> {
  const { userId } = await auth()
  if (!userId) return { error: 'Not signed in' }

  const { error } = await supabase
    .from('patterns')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return {}
}
