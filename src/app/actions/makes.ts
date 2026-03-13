'use server'

import { auth } from '@clerk/nextjs/server'
import { supabase, Make, MakeStatus, MakeSteps, DEFAULT_MAKE_STEPS } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

// ── Create a new make ──────────────────────────────────────────────────────

export async function createMake(
  patternId: string | null,
  name: string,
): Promise<{ id: string; error?: string }> {
  const { userId } = await auth()
  if (!userId) return { id: '', error: 'Not signed in' }

  const { data, error } = await supabase
    .from('makes')
    .insert({
      user_id: userId,
      pattern_id: patternId,
      name,
      status: 'planning',
      steps: DEFAULT_MAKE_STEPS,
      progress_photos: [],
    })
    .select('id')
    .single()

  if (error) return { id: '', error: error.message }
  revalidatePath('/makes')
  return { id: data.id }
}

// ── Get all makes for current user ─────────────────────────────────────────

export async function getUserMakes(): Promise<Make[]> {
  const { userId } = await auth()
  if (!userId) return []

  const { data, error } = await supabase
    .from('makes')
    .select('*, pattern:patterns(*)')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('getUserMakes error:', error)
    return []
  }

  return (data ?? []) as Make[]
}

// ── Get a single make ──────────────────────────────────────────────────────

export async function getMake(id: string): Promise<Make | null> {
  const { userId } = await auth()
  if (!userId) return null

  const { data, error } = await supabase
    .from('makes')
    .select('*, pattern:patterns(*)')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (error || !data) return null
  return data as Make
}

// ── Update make status ─────────────────────────────────────────────────────

export async function updateMakeStatus(
  id: string,
  status: MakeStatus,
): Promise<{ error?: string }> {
  const { userId } = await auth()
  if (!userId) return { error: 'Not signed in' }

  const { error } = await supabase
    .from('makes')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)

  if (error) return { error: error.message }
  revalidatePath('/makes')
  revalidatePath(`/makes/${id}`)
  return {}
}

// ── Update all steps at once ───────────────────────────────────────────────

export async function updateMakeSteps(
  id: string,
  steps: MakeSteps,
): Promise<{ error?: string }> {
  const { userId } = await auth()
  if (!userId) return { error: 'Not signed in' }

  const { error } = await supabase
    .from('makes')
    .update({ steps, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)

  if (error) return { error: error.message }
  revalidatePath(`/makes/${id}`)
  return {}
}

// ── Update make name ───────────────────────────────────────────────────────

export async function updateMakeName(
  id: string,
  name: string,
): Promise<{ error?: string }> {
  const { userId } = await auth()
  if (!userId) return { error: 'Not signed in' }

  const { error } = await supabase
    .from('makes')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)

  if (error) return { error: error.message }
  revalidatePath('/makes')
  revalidatePath(`/makes/${id}`)
  return {}
}

// ── Delete a make ──────────────────────────────────────────────────────────

export async function deleteMake(id: string): Promise<{ error?: string }> {
  const { userId } = await auth()
  if (!userId) return { error: 'Not signed in' }

  const { error } = await supabase
    .from('makes')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) return { error: error.message }
  revalidatePath('/makes')
  return {}
}
