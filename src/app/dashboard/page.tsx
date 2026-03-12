import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getUserPatterns } from '@/app/actions/patterns'
import { SavedPattern } from '@/lib/supabase'
import { BLOCK_DEFS, PALETTES } from '@/config/blocks'
import DashboardClient from './dashboard-client'

export default async function DashboardPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const patterns = await getUserPatterns()

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#FAFAF8]/90 backdrop-blur-md border-b border-[#E7E5E4]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="grid grid-cols-3 gap-0.5 w-7 h-7">
              {["#C2683A","#E8C9B0","#C2683A","#E8C9B0","#C2683A","#E8C9B0","#C2683A","#E8C9B0","#C2683A"].map(
                (c, i) => <div key={i} className="rounded-[1px]" style={{ backgroundColor: c }} />
              )}
            </div>
            <span className="font-semibold text-[#1C1917] text-lg tracking-tight">Patchwork</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-[#1C1917]">My Patterns</span>
            <Link
              href="/studio"
              className="bg-[#C2683A] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#9A4F28] transition-colors"
            >
              + New Pattern
            </Link>
          </div>
        </div>
      </nav>

      <div className="pt-24 pb-16 px-6 max-w-6xl mx-auto">
        {patterns.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-2xl font-bold text-[#1C1917]">
                My Patterns
                <span className="ml-2 text-base font-normal text-[#78716C]">
                  {patterns.length} {patterns.length === 1 ? 'pattern' : 'patterns'}
                </span>
              </h1>
            </div>
            <DashboardClient patterns={patterns} />
          </>
        )}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="grid grid-cols-4 gap-1 w-16 h-16 mb-6 opacity-30">
        {["#C2683A","#E8C9B0","#C2683A","#E8C9B0","#E8C9B0","#C2683A","#E8C9B0","#C2683A",
          "#C2683A","#E8C9B0","#C2683A","#E8C9B0","#E8C9B0","#C2683A","#E8C9B0","#C2683A"].map(
          (c, i) => <div key={i} className="rounded-[1px]" style={{ backgroundColor: c }} />
        )}
      </div>
      <h2 className="text-xl font-semibold text-[#1C1917] mb-2">No patterns saved yet</h2>
      <p className="text-[#78716C] mb-6 max-w-xs">
        Head to the studio, design something beautiful, and hit Save.
      </p>
      <Link
        href="/studio"
        className="bg-[#C2683A] text-white font-medium px-6 py-3 rounded-xl hover:bg-[#9A4F28] transition-colors"
      >
        Open the studio
      </Link>
    </div>
  )
}
