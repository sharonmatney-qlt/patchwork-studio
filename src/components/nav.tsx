'use client'

import Link from 'next/link'
import {
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from '@clerk/nextjs'

export default function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#FAFAF8]/90 backdrop-blur-md border-b border-[#E7E5E4]">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="grid grid-cols-3 gap-0.5 w-7 h-7">
            {["#C2683A","#E8C9B0","#C2683A","#E8C9B0","#C2683A","#E8C9B0","#C2683A","#E8C9B0","#C2683A"].map(
              (c, i) => (
                <div key={i} className="rounded-[1px]" style={{ backgroundColor: c }} />
              )
            )}
          </div>
          <span className="font-semibold text-[#1C1917] text-lg tracking-tight">Patchwork</span>
        </Link>

        {/* Center links */}
        <div className="hidden md:flex items-center gap-8">
          <a href="/#features" className="text-sm text-[#78716C] hover:text-[#1C1917] transition-colors">Features</a>
          <a href="/#pricing" className="text-sm text-[#78716C] hover:text-[#1C1917] transition-colors">Pricing</a>
          <a href="/#gallery" className="text-sm text-[#78716C] hover:text-[#1C1917] transition-colors">Gallery</a>
        </div>

        {/* Auth area */}
        <div className="flex items-center gap-3">
          <Show when="signed-out">
            <SignInButton mode="redirect">
              <button className="text-sm text-[#78716C] hover:text-[#1C1917] transition-colors px-3 py-1.5 cursor-pointer">
                Sign in
              </button>
            </SignInButton>
            <SignUpButton mode="redirect">
              <button className="bg-[#C2683A] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#9A4F28] transition-colors cursor-pointer">
                Get started free
              </button>
            </SignUpButton>
          </Show>

          <Show when="signed-in">
            <Link
              href="/studio"
              className="text-sm text-[#78716C] hover:text-[#1C1917] transition-colors px-3 py-1.5"
            >
              Studio
            </Link>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: 'w-8 h-8',
                },
              }}
            />
          </Show>
        </div>
      </div>
    </nav>
  )
}
