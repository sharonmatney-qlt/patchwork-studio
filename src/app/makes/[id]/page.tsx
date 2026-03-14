import { auth } from '@clerk/nextjs/server'
import { notFound } from 'next/navigation'
import { getMake, getMakePhotos } from '@/app/actions/makes'
import { getPublicMake, getPublicMakePhotos, getComments, getUserLikes } from '@/app/actions/community'
import MakeDetailClient from './make-detail-client'

export default async function MakeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()   // null if signed out — no throw, no redirect
  const { id }     = await params

  // ── Owner view ────────────────────────────────────────────────────────────
  if (userId) {
    const [make, photos] = await Promise.all([getMake(id), getMakePhotos(id)])

    if (make) {
      // Current user owns this make — full editable view
      const comments = make.is_public ? await getComments(id) : []
      return (
        <MakeDetailClient
          make={make}
          initialPhotos={photos}
          isReadOnly={false}
          initialComments={comments}
          isSignedIn={true}
        />
      )
    }
  }

  // ── Public view ───────────────────────────────────────────────────────────
  const [make, photos, comments] = await Promise.all([
    getPublicMake(id),
    getPublicMakePhotos(id),
    getComments(id),
  ])

  if (!make) notFound()

  // Get like count + whether this user has liked it
  const likedSet = userId ? await getUserLikes([id], 'make') : new Set<string>()
  const { data: likeRows } = await import('@/lib/supabase').then(m =>
    m.supabase.from('likes').select('id').eq('target_id', id).eq('target_type', 'make')
  )
  const likeCount = likeRows?.length ?? 0

  // Fetch maker profile
  const { data: profile } = await import('@/lib/supabase').then(m =>
    m.supabase.from('profiles').select('display_name, avatar_url').eq('user_id', make.user_id).maybeSingle()
  )

  return (
    <MakeDetailClient
      make={make}
      initialPhotos={photos}
      isReadOnly={true}
      initialComments={comments}
      isSignedIn={!!userId}
      likeCount={likeCount}
      userLiked={likedSet.has(id)}
      makerName={profile?.display_name ?? null}
      makerAvatar={profile?.avatar_url ?? null}
    />
  )
}
