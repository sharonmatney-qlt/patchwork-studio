'use server'

import { auth } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'
import type { SavedPattern, Make, MakePhoto } from '@/lib/supabase'
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
  cover_url: string | null
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

async function likeCounts(
  targetIds: string[],
  targetType: 'pattern' | 'make',
): Promise<Record<string, number>> {
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

async function fetchProfileMap(
  userIds: string[],
): Promise<Record<string, { display_name: string | null; avatar_url: string | null }>> {
  if (!userIds.length) return {}
  const { data } = await supabase
    .from('profiles')
    .select('user_id, display_name, avatar_url')
    .in('user_id', userIds)
  const map: Record<string, any> = {}
  for (const p of data ?? []) map[p.user_id] = p
  return map
}

// ── Public patterns feed ───────────────────────────────────────────────────

export async function getPublicPatterns(): Promise<PublicPattern[]> {
  const { data, error } = await supabase
    .from('patterns')
    .select('*')
    .eq('is_public', true)
    .order('updated_at', { ascending: false })
    .limit(60)

  if (error || !data) return []

  const ids     = data.map((p: any) => p.id)
  const userIds = [...new Set(data.map((p: any) => p.user_id as string))]

  const [counts, profiles] = await Promise.all([
    likeCounts(ids, 'pattern'),
    fetchProfileMap(userIds),
  ])

  return data.map((p: any) => ({
    ...p,
    display_name: profiles[p.user_id]?.display_name ?? null,
    avatar_url:   profiles[p.user_id]?.avatar_url   ?? null,
    like_count:   counts[p.id] ?? 0,
  }))
}

// ── Public makes feed ──────────────────────────────────────────────────────

export async function getPublicMakes(): Promise<PublicMake[]> {
  const { data, error } = await supabase
    .from('makes')
    .select('*, pattern:patterns(*)')
    .eq('is_public', true)
    .order('updated_at', { ascending: false })
    .limit(60)

  if (error || !data) return []

  const ids     = data.map((m: any) => m.id)
  const userIds = [...new Set(data.map((m: any) => m.user_id as string))]

  // First photo per make for cover image
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

  const [counts, profiles] = await Promise.all([
    likeCounts(ids, 'make'),
    fetchProfileMap(userIds),
  ])

  return data.map((m: any) => ({
    ...m,
    display_name: profiles[m.user_id]?.display_name ?? null,
    avatar_url:   profiles[m.user_id]?.avatar_url   ?? null,
    like_count:   counts[m.id] ?? 0,
    cover_url:    firstPhoto[m.id] ?? null,
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
  const { data: make } = await supabase
    .from('makes')
    .select('is_public')
    .eq('id', makeId)
    .maybeSingle()

  if (!make?.is_public) return []

  const { data, error } = await supabase
    .from('make_photos')
    .select('*')
    .eq('make_id', makeId)
    .order('created_at', { ascending: true })

  if (error || !data) return []

  return data.map((p: any) => ({
    id:           p.id,
    make_id:      p.make_id,
    step:         p.step,
    storage_path: p.storage_path,
    created_at:   p.created_at,
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
    .select('*')
    .eq('make_id', makeId)
    .order('created_at', { ascending: true })

  if (step) query = query.eq('step', step)

  const { data, error } = await query
  if (error || !data) return []

  const commenterIds = [...new Set(data.map((c: any) => c.commenter_id as string))]
  const profiles     = await fetchProfileMap(commenterIds)

  return data.map((c: any) => ({
    id:           c.id,
    make_id:      c.make_id,
    step:         c.step,
    commenter_id: c.commenter_id,
    text:         c.text,
    created_at:   c.created_at,
    display_name: profiles[c.commenter_id]?.display_name ?? null,
    avatar_url:   profiles[c.commenter_id]?.avatar_url   ?? null,
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
    .maybeSingle()

  if (!make?.is_public) return { error: 'Cannot comment on private make' }

  const { data, error } = await supabase
    .from('make_step_comments')
    .insert({ make_id: makeId, step, commenter_id: userId, text: text.trim() })
    .select('*')
    .single()

  if (error || !data) return { error: error?.message ?? 'Failed to add comment' }

  // Fetch commenter's profile separately (no FK join needed)
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, avatar_url')
    .eq('user_id', userId)
    .maybeSingle()

  revalidatePath(`/makes/${makeId}`)
  return {
    comment: {
      id:           data.id,
      make_id:      data.make_id,
      step:         data.step,
      commenter_id: data.commenter_id,
      text:         data.text,
      created_at:   data.created_at,
      display_name: profile?.display_name ?? null,
      avatar_url:   profile?.avatar_url   ?? null,
    },
  }
}

// ── Remix a pattern ────────────────────────────────────────────────────────

export async function remixPattern(
  sourcePatternId: string,
): Promise<{ id?: string; error?: string }> {
  const { userId } = await auth()
  if (!userId) return { error: 'Not signed in' }

  const { data: source, error: fetchError } = await supabase
    .from('patterns')
    .select('*')
    .eq('id', sourcePatternId)
    .eq('is_public', true)
    .single()

  if (fetchError || !source) return { error: 'Pattern not found or not public' }

  const { data, error } = await supabase
    .from('patterns')
    .insert({
      user_id:   userId,
      name:      `Remix of ${source.name}`,
      settings:  source.settings,
      is_public: false,
      remix_of:  sourcePatternId,
    })
    .select('id')
    .single()

  if (error || !data) return { error: error?.message ?? 'Failed to remix pattern' }

  revalidatePath('/dashboard')
  return { id: data.id }
}

// ── Upsert profile ─────────────────────────────────────────────────────────

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
