'use client'

import { useState, useTransition } from 'react'
import { Heart } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toggleLike } from '@/app/actions/community'

interface LikeButtonProps {
  targetId: string
  targetType: 'pattern' | 'make'
  initialCount: number
  initialLiked: boolean
  isSignedIn: boolean
}

export default function LikeButton({
  targetId,
  targetType,
  initialCount,
  initialLiked,
  isSignedIn,
}: LikeButtonProps) {
  const [liked, setLiked]   = useState(initialLiked)
  const [count, setCount]   = useState(initialCount)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()   // don't trigger parent link clicks
    e.stopPropagation()

    if (!isSignedIn) {
      router.push('/sign-in')
      return
    }

    // Optimistic update
    const wasLiked = liked
    setLiked(!wasLiked)
    setCount(prev => wasLiked ? prev - 1 : prev + 1)

    startTransition(async () => {
      const result = await toggleLike(targetId, targetType)
      if (result.error) {
        // Revert on error
        setLiked(wasLiked)
        setCount(prev => wasLiked ? prev + 1 : prev - 1)
      }
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={`flex items-center gap-1.5 text-sm transition-colors cursor-pointer disabled:opacity-70 ${
        liked
          ? 'text-[#C2683A]'
          : 'text-[#A8A29E] hover:text-[#C2683A]'
      }`}
      title={liked ? 'Unlike' : 'Like'}
    >
      <Heart
        size={16}
        className={`transition-all ${liked ? 'fill-[#C2683A]' : ''}`}
      />
      <span className="font-medium">{count}</span>
    </button>
  )
}
