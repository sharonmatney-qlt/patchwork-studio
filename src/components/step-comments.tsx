'use client'

import { useState, useTransition } from 'react'
import { Send } from 'lucide-react'
import { addComment } from '@/app/actions/community'
import type { CommentWithProfile } from '@/app/actions/community'

interface StepCommentsProps {
  makeId: string
  step: string
  initialComments: CommentWithProfile[]
  isSignedIn: boolean
}

export default function StepComments({ makeId, step, initialComments, isSignedIn }: StepCommentsProps) {
  const [comments, setComments] = useState<CommentWithProfile[]>(initialComments)
  const [text, setText]         = useState('')
  const [isPending, startTransition] = useTransition()

  const handleSubmit = () => {
    const trimmed = text.trim()
    if (!trimmed || isPending) return

    // Optimistic add
    const optimistic: CommentWithProfile = {
      id: `opt-${Date.now()}`,
      make_id: makeId,
      step,
      commenter_id: '',
      text: trimmed,
      created_at: new Date().toISOString(),
      display_name: 'You',
      avatar_url: null,
    }
    setComments(prev => [...prev, optimistic])
    setText('')

    startTransition(async () => {
      const { comment, error } = await addComment(makeId, step, trimmed)
      if (error) {
        // Revert
        setComments(prev => prev.filter(c => c.id !== optimistic.id))
        setText(trimmed)
      } else if (comment) {
        // Replace optimistic with real
        setComments(prev => prev.map(c => c.id === optimistic.id ? comment : c))
      }
    })
  }

  if (!comments.length && !isSignedIn) return null

  return (
    <div className="mt-4 pt-4 border-t border-[#F5F5F4]">
      <p className="text-[10px] font-medium text-[#A8A29E] uppercase tracking-wide mb-3">Community Notes</p>

      {/* Comment list */}
      {comments.length > 0 && (
        <div className="space-y-3 mb-3">
          {comments.map(c => (
            <div key={c.id} className="flex gap-2.5">
              {/* Avatar */}
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#E7E5E4] overflow-hidden flex items-center justify-center">
                {c.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.avatar_url} alt={c.display_name ?? ''} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[10px] font-semibold text-[#78716C]">
                    {(c.display_name ?? '?').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              {/* Body */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-medium text-[#1C1917]">
                    {c.display_name ?? 'Quilter'}
                  </span>
                  <span className="text-[10px] text-[#A8A29E]">
                    {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <p className="text-xs text-[#78716C] leading-relaxed mt-0.5">{c.text}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      {isSignedIn ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
            placeholder="Leave a note for this step…"
            maxLength={1000}
            className="flex-1 text-xs border border-[#E7E5E4] rounded-xl px-3 py-2 focus:outline-none focus:border-[#C2683A] transition-colors placeholder:text-[#C4BFB9]"
          />
          <button
            onClick={handleSubmit}
            disabled={!text.trim() || isPending}
            className="p-2 rounded-xl bg-[#C2683A] text-white hover:bg-[#9A4F28] transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            <Send size={12} />
          </button>
        </div>
      ) : (
        <p className="text-xs text-[#A8A29E]">
          <a href="/sign-in" className="text-[#C2683A] hover:underline">Sign in</a> to leave a note
        </p>
      )}
    </div>
  )
}
