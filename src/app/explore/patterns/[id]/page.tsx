'use server'

import { auth } from '@clerk/nextjs/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Scissors } from 'lucide-react'
import Nav from '@/components/nav'
import PatternPreview from '@/components/pattern-preview'
import LikeButton from '@/components/like-button'
import RemixButton from '@/components/remix-button'
import { supabase } from '@/lib/supabase'
import { getUserLikes } from '@/app/actions/community'

export default async function PublicPatternPage({ params }: { params: Promise<{ id: string }> }) {
  const { userId }  = await auth()
  const { id }      = await params
  const isSignedIn  = !!userId

  // Fetch the pattern (must be public)
  const { data: pattern, error } = await supabase
    .from('patterns')
    .select('*')
    .eq('id', id)
    .eq('is_public', true)
    .single()

  if (error || !pattern) notFound()

  // Fetch maker profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, avatar_url')
    .eq('user_id', pattern.user_id)
    .maybeSingle()

  // Like count + user's like status
  const { data: likeRows } = await supabase
    .from('likes')
    .select('id')
    .eq('target_id', id)
    .eq('target_type', 'pattern')

  const likeCount = likeRows?.length ?? 0
  const likedSet  = isSignedIn ? await getUserLikes([id], 'pattern') : new Set<string>()

  const makerName   = profile?.display_name ?? null
  const makerAvatar = profile?.avatar_url ?? null

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <Nav />

      <div className="pt-24 pb-16 max-w-5xl mx-auto px-6">
        {/* Back */}
        <Link
          href="/explore?tab=patterns"
          className="inline-flex items-center gap-1 text-sm text-[#78716C] hover:text-[#1C1917] transition-colors mb-8"
        >
          <ChevronLeft size={14} />
          Explore Patterns
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          {/* Pattern preview */}
          <div className="bg-white rounded-2xl border border-[#E7E5E4] p-6">
            <PatternPreview settings={pattern.settings} />
          </div>

          {/* Details */}
          <div>
            <h1 className="text-2xl font-semibold text-[#1C1917] mb-2">{pattern.name}</h1>

            {/* Maker */}
            <div className="flex items-center gap-2.5 mb-6">
              <div className="w-7 h-7 rounded-full bg-[#E7E5E4] overflow-hidden flex items-center justify-center flex-shrink-0">
                {makerAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={makerAvatar} alt={makerName ?? ''} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-semibold text-[#78716C]">
                    {(makerName ?? '?').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <span className="text-sm text-[#78716C]">by {makerName ?? 'Quilter'}</span>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 mb-6">
              <Link
                href={`/makes/new?pattern=${id}&name=${encodeURIComponent(pattern.name)}`}
                className="flex items-center justify-center gap-2 bg-[#C2683A] text-white font-medium py-3 rounded-xl hover:bg-[#9A4F28] transition-colors"
              >
                <Scissors size={16} />
                🧵 Make This
              </Link>

              <RemixButton patternId={id} isSignedIn={isSignedIn} />
            </div>

            {/* Like */}
            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-[#F5F5F4]">
              <LikeButton
                targetId={id}
                targetType="pattern"
                initialCount={likeCount}
                initialLiked={likedSet.has(id)}
                isSignedIn={isSignedIn}
              />
              <span className="text-sm text-[#A8A29E]">
                {likeCount === 1 ? '1 quilter loves this' : `${likeCount} quilters love this`}
              </span>
            </div>

            {/* Meta */}
            <div className="text-xs text-[#A8A29E]">
              Shared {new Date(pattern.updated_at).toLocaleDateString('en-US', {
                month: 'long', day: 'numeric', year: 'numeric',
              })}
              {pattern.remix_of && (
                <> · <Link href={`/explore/patterns/${pattern.remix_of}`} className="text-[#C2683A] hover:underline">View original</Link></>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
