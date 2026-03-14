'use server'

import { auth } from '@clerk/nextjs/server'
import { supabase, Make, MakeStatus, MakeSteps, MakePhoto, DEFAULT_MAKE_STEPS } from '@/lib/supabase'
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

// ── Make Photos ────────────────────────────────────────────────────────────

function photoUrl(storagePath: string): string {
  return supabase.storage.from('make-photos').getPublicUrl(storagePath).data.publicUrl
}

export async function getMakePhotos(makeId: string): Promise<MakePhoto[]> {
  const { userId } = await auth()
  if (!userId) return []

  // Join to makes to verify ownership
  const { data, error } = await supabase
    .from('make_photos')
    .select('*, make:makes(user_id)')
    .eq('make_id', makeId)
    .order('created_at', { ascending: true })

  if (error || !data) return []

  return data
    .filter((p: any) => p.make?.user_id === userId)
    .map((p: any) => ({
      id: p.id,
      make_id: p.make_id,
      step: p.step,
      storage_path: p.storage_path,
      created_at: p.created_at,
      url: photoUrl(p.storage_path),
    }))
}

export async function uploadMakePhoto(
  makeId: string,
  step: string,
  formData: FormData,
): Promise<{ photo?: MakePhoto; error?: string }> {
  const { userId } = await auth()
  if (!userId) return { error: 'Not signed in' }

  const file = formData.get('file') as File
  if (!file) return { error: 'No file provided' }

  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${userId}/${makeId}/${step}/${Date.now()}.${ext}`

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const { error: uploadError } = await supabase.storage
    .from('make-photos')
    .upload(path, buffer, { contentType: file.type, upsert: false })

  if (uploadError) return { error: uploadError.message }

  const { data: row, error: dbError } = await supabase
    .from('make_photos')
    .insert({ make_id: makeId, step, storage_path: path })
    .select()
    .single()

  if (dbError) return { error: dbError.message }

  return {
    photo: {
      id: row.id,
      make_id: row.make_id,
      step: row.step,
      storage_path: row.storage_path,
      created_at: row.created_at,
      url: photoUrl(path),
    },
  }
}

export async function deleteMakePhoto(
  id: string,
  storagePath: string,
): Promise<{ error?: string }> {
  const { userId } = await auth()
  if (!userId) return { error: 'Not signed in' }

  await supabase.storage.from('make-photos').remove([storagePath])

  const { error } = await supabase
    .from('make_photos')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }
  return {}
}
