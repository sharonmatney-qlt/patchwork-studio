'use server'

import { auth } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'
import type { SavedPattern, Make, MakePhoto, MakeStepComment } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

// ── Types returned by community queries ────────────────────────────────────

export interface PublicPattern extends SavedPattern {
  display_name: string | null
  avatar_url: string | null
  like_count: number
}

export interface PublicMake extends Make {
  display_name: string | null
  avatar_url: string | null
  like_count: number
  cover_url: string | null   // first step photo, if any
}

export interface CommentWithProfile {
  id: string
  make_id: string
  step: string
  commenter_id: string
  text: string
  created_at: string
  display_name: string | null
  avatar_url: string | null
}

// ── Helpers ────────────────────────────────────────────────────────────────

async function likeCounts(targetIds: string[], targetType: 'pattern' | 'make'): Promise<Record<string, number>> {
  if (!targetIds.length) return {}
  const { data } = await supabase
    .from('likes')
    .select('target_id')
    .in('target_id', targetIds)
    .eq('target_type', targetType)
  const counts: Record<string, number> = {}
  for (const row of data ?? []) {
    counts[row.target_id] = (counts[row.target_id] ?? 0) + 1
  }
  return counts
}

// ── Public patterns feed ───────────────────────────────────────────────────

export async function getPublicPatterns(): Promise<PublicPattern[]> {
  const { data, error } = await supabase
    .from('patterns')
    .select('*, profile:profiles(display_name, avatar_url)')
    .eq('is_public', true)
    .order('updated_at', { ascending: false })
    .limit(60)

  if (error || !data) return []

  const ids = data.map((p: any) => p.id)
  const counts = await likeCounts(ids, 'pattern')

  return data.map((p: any) => ({
    ...p,
    display_name: p.profile?.display_name ?? null,
    avatar_url: p.profile?.avatar_url ?? null,
    like_count: counts[p.id] ?? 0,
    profile: undefined,
  }))
}

// ── Public makes feed ──────────────────────────────────────────────────────

export async function getPublicMakes(): Promise<PublicMake[]> {
  const { data, error } = await supabase
    .from('makes')
    .select('*, pattern:patterns(*), profile:profiles(display_name, avatar_url)')
    .eq('is_public', true)
    .order('updated_at', { ascending: false })
    .limit(60)

  if (error || !data) return []

  const ids = data.map((m: any) => m.id)
  const counts = await likeCounts(ids, 'make')

  // Get first photo for each make (for cover image)
  const { data: photos } = await supabase
    .from('make_photos')
    .select('make_id, storage_path')
    .in('make_id', ids)
    .order('created_at', { ascending: true })

  const firstPhoto: Record<string, string> = {}
  for (const p of photos ?? []) {
    if (!firstPhoto[p.make_id]) {
      firstPhoto[p.make_id] = supabase.storage
        .from('make-photos')
        .getPublicUrl(p.storage_path).data.publicUrl
    }
  }

  return data.map((m: any) => ({
    ...m,
    display_name: m.profile?.display_name ?? null,
    avatar_url: m.profile?.avatar_url ?? null,
    like_count: counts[m.id] ?? 0,
    cover_url: firstPhoto[m.id] ?? null,
    profile: undefined,
  }))
}

// ── Single public make (no auth required) ─────────────────────────────────

export async function getPublicMake(id: string): Promise<Make | null> {
  const { data, error } = await supabase
    .from('makes')
    .select('*, pattern:patterns(*)')
    .eq('id', id)
    .eq('is_public', true)
    .single()

  if (error || !data) return null
  return data as Make
}

export async function getPublicMakePhotos(makeId: string): Promise<MakePhoto[]> {
  const { data, error } = await supabase
    .from('make_photos')
    .select('*, make:makes(is_public)')
    .eq('make_id', makeId)
    .order('created_at', { ascending: true })

  if (error || !data) return []

  return data
    .filter((p: any) => p.make?.is_public === true)
    .map((p: any) => ({
      id: p.id,
      make_id: p.make_id,
      step: p.step,
      storage_path: p.storage_path,
      created_at: p.created_at,
      url: supabase.storage.from('make-photos').getPublicUrl(p.storage_path).data.publicUrl,
    }))
}

// ── Likes ──────────────────────────────────────────────────────────────────

export async function toggleLike(
  targetId: string,
  targetType: 'pattern' | 'make',
): Promise<{ liked: boolean; error?: string }> {
  const { userId } = await auth()
  if (!userId) return { liked: false, error: 'Not signed in' }

  // Check if already liked
  const { data: existing } = await supabase
    .from('likes')
    .select('id')
    .eq('user_id', userId)
    .eq('target_id', targetId)
    .eq('target_type', targetType)
    .maybeSingle()

  if (existing) {
    await supabase.from('likes').delete().eq('id', existing.id)
    revalidatePath('/explore')
    return { liked: false }
  } else {
    await supabase.from('likes').insert({ user_id: userId, target_id: targetId, target_type: targetType })
    revalidatePath('/explore')
    return { liked: true }
  }
}

export async function getUserLikes(
  targetIds: string[],
  targetType: 'pattern' | 'make',
): Promise<Set<string>> {
  const { userId } = await auth()
  if (!userId || !targetIds.length) return new Set()

  const { data } = await supabase
    .from('likes')
    .select('target_id')
    .eq('user_id', userId)
    .in('target_id', targetIds)
    .eq('target_type', targetType)

  return new Set((data ?? []).map((r: any) => r.target_id))
}

// ── Comments ───────────────────────────────────────────────────────────────

export async function getComments(makeId: string, step?: string): Promise<CommentWithProfile[]> {
  let query = supabase
    .from('make_step_comments')
    .select('*, profile:profiles(display_name, avatar_url)')
    .eq('make_id', makeId)
    .order('created_at', { ascending: true })

  if (step) query = query.eq('step', step)

  const { data, error } = await query
  if (error || !data) return []

  return data.map((c: any) => ({
    id: c.id,
    make_id: c.make_id,
    step: c.step,
    commenter_id: c.commenter_id,
    text: c.text,
    created_at: c.created_at,
    display_name: c.profile?.display_name ?? null,
    avatar_url: c.profile?.avatar_url ?? null,
  }))
}

export async function addComment(
  makeId: string,
  step: string,
  text: string,
): Promise<{ comment?: CommentWithProfile; error?: string }> {
  const { userId } = await auth()
  if (!userId) return { error: 'Not signed in' }
  if (!text.trim()) return { error: 'Comment cannot be empty' }

  // Verify the make is public
  const { data: make } = await supabase
    .from('makes')
    .select('is_public')
    .eq('id', makeId)
    .single()

  if (!make?.is_public) return { error: 'Cannot comment on private make' }

  const { data, error } = await supabase
    .from('make_step_comments')
    .insert({ make_id: makeId, step, commenter_id: userId, text: text.trim() })
    .select('*, profile:profiles(display_name, avatar_url)')
    .single()

  if (error || !data) return { error: error?.message ?? 'Failed to add comment' }

  revalidatePath(`/makes/${makeId}`)
  return {
    comment: {
      id: data.id,
      make_id: data.make_id,
      step: data.step,
      commenter_id: data.commenter_id,
      text: data.text,
      created_at: data.created_at,
      display_name: data.profile?.display_name ?? null,
      avatar_url: data.profile?.avatar_url ?? null,
    },
  }
}

// ── Remix a pattern ────────────────────────────────────────────────────────

export async function remixPattern(
  sourcePatternId: string,
): Promise<{ id?: string; error?: string }> {
  const { userId } = await auth()
  if (!userId) return { error: 'Not signed in' }

  // Fetch the source pattern (must be public)
  const { data: source, error: fetchError } = await supabase
    .from('patterns')
    .select('*')
    .eq('id', sourcePatternId)
    .eq('is_public', true)
    .single()

  if (fetchError || !source) return { error: 'Pattern not found or not public' }

  // Insert a copy owned by the current user
  const { data, error } = await supabase
    .from('patterns')
    .insert({
      user_id: userId,
      name: `Remix of ${source.name}`,
      settings: source.settings,
      is_public: false,
      remix_of: sourcePatternId,
    })
    .select('id')
    .single()

  if (error || !data) return { error: error?.message ?? 'Failed to remix pattern' }

  revalidatePath('/dashboard')
  return { id: data.id }
}

// ── Ensure profile exists (lazy creation from Clerk data) ──────────────────

export async function upsertProfile(
  userId: string,
  displayName: string | null,
  avatarUrl: string | null,
): Promise<void> {
  await supabase.from('profiles').upsert(
    { user_id: userId, display_name: displayName, avatar_url: avatarUrl, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' },
  )
}
