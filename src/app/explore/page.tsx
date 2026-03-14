import { auth } from '@clerk/nextjs/server'
import Link from 'next/link'
import Nav from '@/components/nav'
import PatternPreview from '@/components/pattern-preview'
import LikeButton from '@/components/like-button'
import { getPublicPatterns, getPublicMakes, getUserLikes } from '@/app/actions/community'
import type { PublicPattern, PublicMake } from '@/app/actions/community'
import { Scissors } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  planning: 'bg-[#F5F5F4] text-[#78716C]',
  making:   'bg-[#FDF0E8] text-[#C2683A]',
  made:     'bg-[#ECFDF5] text-[#059669]',
}
const STATUS_LABELS: Record<string, string> = {
  planning: 'Planning',
  making:   'Making',
  made:     'Made',
}

// ── Pattern card ───────────────────────────────────────────────────────────

function PatternCard({
  pattern,
  liked,
  isSignedIn,
}: {
  pattern: PublicPattern
  liked: boolean
  isSignedIn: boolean
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#E7E5E4] overflow-hidden hover:shadow-md hover:border-[#D6D3D1] transition-all group">
      <Link href={`/explore/patterns/${pattern.id}`} className="block">
        <div className="p-4 pb-3">
          <PatternPreview settings={pattern.settings} className="rounded-xl overflow-hidden" />
        </div>
      </Link>

      <div className="px-4 pb-4">
        <Link href={`/explore/patterns/${pattern.id}`} className="block mb-2">
          <h3 className="font-semibold text-[#1C1917] text-sm truncate group-hover:text-[#C2683A] transition-colors">
            {pattern.name}
          </h3>
          <p className="text-xs text-[#A8A29E] truncate mt-0.5">
            by {pattern.display_name ?? 'Quilter'}
          </p>
        </Link>

        <div className="flex items-center justify-between">
          <LikeButton
            targetId={pattern.id}
            targetType="pattern"
            initialCount={pattern.like_count}
            initialLiked={liked}
            isSignedIn={isSignedIn}
          />
          <div className="flex items-center gap-2">
            <Link
              href={`/makes/new?pattern=${pattern.id}&name=${encodeURIComponent(pattern.name)}`}
              className="flex items-center gap-1 text-xs text-[#78716C] hover:text-[#C2683A] transition-colors"
              title="Make This"
            >
              <Scissors size={12} />
              Make This
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Make card ──────────────────────────────────────────────────────────────

function MakeCard({
  make,
  liked,
  isSignedIn,
}: {
  make: PublicMake
  liked: boolean
  isSignedIn: boolean
}) {
  const stepCount = 5
  const doneCount = Object.values(make.steps).filter(s => s.done).length
  const progress  = Math.round((doneCount / stepCount) * 100)

  return (
    <Link
      href={`/makes/${make.id}`}
      className="bg-white rounded-2xl border border-[#E7E5E4] overflow-hidden hover:shadow-md hover:border-[#D6D3D1] transition-all group block"
    >
      {/* Cover photo or pattern preview */}
      <div className="h-40 overflow-hidden bg-[#F5F5F4]">
        {make.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={make.cover_url}
            alt={make.name}
            className="w-full h-full object-cover"
          />
        ) : make.pattern ? (
          <div className="p-3 h-full flex items-center justify-center">
            <PatternPreview settings={make.pattern.settings} className="rounded-lg overflow-hidden max-h-full" />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-[#A8A29E] text-xs">No preview</div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-[#1C1917] text-sm truncate group-hover:text-[#C2683A] transition-colors">
              {make.name}
            </h3>
            <p className="text-xs text-[#A8A29E] truncate mt-0.5">
              by {make.display_name ?? 'Quilter'}
              {make.pattern && ` · ${make.pattern.name}`}
            </p>
          </div>
          <span className={`flex-shrink-0 ml-2 text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[make.status]}`}>
            {STATUS_LABELS[make.status]}
          </span>
        </div>

        {/* Progress */}
        <div className="mb-3">
          <div className="h-1.5 bg-[#F5F5F4] rounded-full overflow-hidden">
            <div className="h-full bg-[#C2683A] rounded-full" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <LikeButton
          targetId={make.id}
          targetType="make"
          initialCount={make.like_count}
          initialLiked={liked}
          isSignedIn={isSignedIn}
        />
      </div>
    </Link>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { userId }      = await auth()
  const { tab = 'patterns' } = await searchParams
  const isSignedIn      = !!userId
  const showMakes       = tab === 'makes'

  // Fetch the appropriate feed
  const [patterns, makes] = await Promise.all([
    showMakes ? Promise.resolve([]) : getPublicPatterns(),
    showMakes ? getPublicMakes()    : Promise.resolve([]),
  ])

  // Fetch which items the user has liked
  const patternIds = patterns.map(p => p.id)
  const makeIds    = makes.map(m => m.id)

  const [patternLikes, makeLikes] = await Promise.all([
    isSignedIn && patternIds.length ? getUserLikes(patternIds, 'pattern') : Promise.resolve(new Set<string>()),
    isSignedIn && makeIds.length    ? getUserLikes(makeIds, 'make')       : Promise.resolve(new Set<string>()),
  ])

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <Nav />

      <div className="pt-24 pb-16 max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-[#1C1917]">Explore</h1>
          <p className="text-sm text-[#78716C] mt-1">Patterns and makes from the community</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-[#F5F5F4] rounded-xl p-1 w-fit mb-8">
          <Link
            href="/explore?tab=patterns"
            className={`px-5 py-2 text-sm font-medium rounded-lg transition-all ${
              !showMakes
                ? 'bg-white text-[#1C1917] shadow-sm'
                : 'text-[#78716C] hover:text-[#1C1917]'
            }`}
          >
            Patterns
          </Link>
          <Link
            href="/explore?tab=makes"
            className={`px-5 py-2 text-sm font-medium rounded-lg transition-all ${
              showMakes
                ? 'bg-white text-[#1C1917] shadow-sm'
                : 'text-[#78716C] hover:text-[#1C1917]'
            }`}
          >
            Makes
          </Link>
        </div>

        {/* Patterns tab */}
        {!showMakes && (
          patterns.length === 0 ? (
            <div className="text-center py-20 text-[#A8A29E]">
              <p className="text-lg font-medium text-[#78716C] mb-2">No public patterns yet</p>
              <p className="text-sm">Be the first to share a pattern with the community!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {patterns.map(p => (
                <PatternCard
                  key={p.id}
                  pattern={p}
                  liked={patternLikes.has(p.id)}
                  isSignedIn={isSignedIn}
                />
              ))}
            </div>
          )
        )}

        {/* Makes tab */}
        {showMakes && (
          makes.length === 0 ? (
            <div className="text-center py-20 text-[#A8A29E]">
              <p className="text-lg font-medium text-[#78716C] mb-2">No public makes yet</p>
              <p className="text-sm">Start a make and share it with the community!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {makes.map(m => (
                <MakeCard
                  key={m.id}
                  make={m}
                  liked={makeLikes.has(m.id)}
                  isSignedIn={isSignedIn}
                />
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}
