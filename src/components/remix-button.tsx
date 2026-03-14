'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Shuffle, Loader2 } from 'lucide-react'
import { remixPattern } from '@/app/actions/community'

export default function RemixButton({
  patternId,
  isSignedIn,
}: {
  patternId: string
  isSignedIn: boolean
}) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleRemix = async () => {
    if (!isSignedIn) { router.push('/sign-in'); return }
    setLoading(true)
    const { id, error } = await remixPattern(patternId)
    if (id) {
      router.push(`/studio?pattern=${id}`)
    } else {
      console.error('Remix failed:', error)
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleRemix}
      disabled={loading}
      className="flex items-center justify-center gap-2 border border-[#E7E5E4] text-[#78716C] font-medium py-3 rounded-xl hover:bg-[#F5F5F4] hover:border-[#D6D3D1] transition-colors disabled:opacity-50 cursor-pointer"
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : <Shuffle size={16} />}
      🔀 Remix in Studio
    </button>
  )
}
