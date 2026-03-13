import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getUserMakes } from '@/app/actions/makes'
import { Make, MakeStatus } from '@/lib/supabase'
import { Clock, Scissors, ChevronRight } from 'lucide-react'

const STATUS_LABELS: Record<MakeStatus, string> = {
  planning: 'Planning',
  making: 'Making',
  made: 'Made',
}

const STATUS_COLORS: Record<MakeStatus, string> = {
  planning: 'bg-[#F5F5F4] text-[#78716C]',
  making: 'bg-[#FDF0E8] text-[#C2683A]',
  made: 'bg-[#ECFDF5] text-[#059669]',
}

function progressFromSteps(steps: Make['steps']): number {
  const keys = Object.keys(steps) as Array<keyof typeof steps>
  const done = keys.filter((k) => steps[k].done).length
  return Math.round((done / keys.length) * 100)
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 bg-[#FDF0E8] rounded-2xl flex items-center justify-center mb-4">
        <Scissors size={28} className="text-[#C2683A]" />
      </div>
      <h2 className="font-semibold text-[#1C1917] text-lg mb-2">No makes yet</h2>
      <p className="text-sm text-[#78716C] mb-6 max-w-xs">
        Save a pattern and start a make to track your quilting journey from Planning to Made.
      </p>
      <Link
        href="/dashboard"
        className="bg-[#C2683A] text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-[#9A4F28] transition-colors"
      >
        Go to My Patterns
      </Link>
    </div>
  )
}

function MakeCard({ make }: { make: Make }) {
  const progress = progressFromSteps(make.steps)
  const updatedAt = new Date(make.updated_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <Link
      href={`/makes/${make.id}`}
      className="bg-white rounded-2xl border border-[#E7E5E4] p-5 hover:shadow-md hover:border-[#D6D3D1] transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-[#1C1917] text-sm truncate">{make.name}</h3>
          {make.pattern && (
            <p className="text-xs text-[#A8A29E] truncate mt-0.5">{make.pattern.name}</p>
          )}
        </div>
        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[make.status]}`}>
            {STATUS_LABELS[make.status]}
          </span>
          <ChevronRight size={14} className="text-[#A8A29E] group-hover:text-[#78716C] transition-colors" />
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-[#A8A29E]">Progress</span>
          <span className="text-xs font-medium text-[#78716C]">{progress}%</span>
        </div>
        <div className="h-1.5 bg-[#F5F5F4] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#C2683A] rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-[#A8A29E]">
        <Clock size={11} />
        <span>{updatedAt}</span>
      </div>
    </Link>
  )
}

export default async function MakesPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const makes = await getUserMakes()

  return (
    <div className="min-h-screen bg-[#FAFAF8] pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-[#1C1917]">My Makes</h1>
            <p className="text-sm text-[#78716C] mt-1">Track your quilts from Planning to Made</p>
          </div>
          <Link
            href="/dashboard"
            className="text-sm text-[#78716C] border border-[#E7E5E4] px-4 py-2 rounded-xl hover:bg-[#F5F5F4] transition-colors"
          >
            My Patterns
          </Link>
        </div>

        {makes.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {makes.map((make) => (
              <MakeCard key={make.id} make={make} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
