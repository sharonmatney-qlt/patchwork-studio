'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Scissors } from 'lucide-react'
import Nav from '@/components/nav'
import { createMake } from '@/app/actions/makes'

function NewMakeForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const patternId = searchParams.get('pattern')
  const patternName = searchParams.get('name') ?? 'My Quilt'

  const [name, setName] = useState(patternName)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!name.trim()) return
    setIsCreating(true)
    setError(null)
    const result = await createMake(patternId, name.trim())
    if (result.error) {
      setError(result.error)
      setIsCreating(false)
    } else {
      router.push(`/makes/${result.id}`)
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <Nav />
    <div className="flex items-center justify-center px-4" style={{ minHeight: 'calc(100vh - 64px)', marginTop: '64px' }}>
      <div className="bg-white rounded-2xl shadow-sm border border-[#E7E5E4] p-8 w-full max-w-sm">
        <div className="flex items-center justify-center w-12 h-12 bg-[#FDF0E8] rounded-2xl mb-5 mx-auto">
          <Scissors size={22} className="text-[#C2683A]" />
        </div>

        <h1 className="text-xl font-semibold text-[#1C1917] text-center mb-1">Start a Make</h1>
        <p className="text-sm text-[#78716C] text-center mb-6">Give your quilt a name to get started.</p>

        <label className="block text-sm text-[#78716C] mb-1.5">Quilt name</label>
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
          className="w-full border border-[#E7E5E4] rounded-xl px-3 py-2.5 text-sm text-[#1C1917] focus:outline-none focus:border-[#C2683A] transition-colors mb-4"
          placeholder="e.g. Grandma's Birthday Quilt"
        />

        {error && (
          <p className="text-xs text-red-500 mb-3">{error}</p>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => router.back()}
            className="flex-1 border border-[#E7E5E4] text-sm text-[#78716C] py-2.5 rounded-xl hover:bg-[#F5F5F4] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={isCreating || !name.trim()}
            className="flex-1 bg-[#C2683A] text-white text-sm font-medium py-2.5 rounded-xl hover:bg-[#9A4F28] transition-colors cursor-pointer disabled:opacity-60"
          >
            {isCreating ? 'Creating…' : 'Start Making'}
          </button>
        </div>
      </div>
    </div>
    </div>
  )
}

export default function NewMakePage() {
  return (
    <Suspense>
      <NewMakeForm />
    </Suspense>
  )
}
