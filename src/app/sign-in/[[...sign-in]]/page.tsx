import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center px-6 py-24">
      <div className="w-full flex flex-col items-center gap-8">
        {/* Brand mark */}
        <div className="flex items-center gap-2">
          <div className="grid grid-cols-3 gap-0.5 w-8 h-8">
            {["#C2683A","#E8C9B0","#C2683A","#E8C9B0","#C2683A","#E8C9B0","#C2683A","#E8C9B0","#C2683A"].map(
              (c, i) => <div key={i} className="rounded-[1px]" style={{ backgroundColor: c }} />
            )}
          </div>
          <span className="font-semibold text-[#1C1917] text-xl tracking-tight">Patchwork</span>
        </div>

        <SignIn
          appearance={{
            variables: {
              colorPrimary: '#C2683A',
              colorBackground: '#FFFFFF',
              colorInputBackground: '#FAFAF8',
              borderRadius: '0.75rem',
              fontFamily: 'var(--font-geist-sans)',
            },
            elements: {
              card: 'shadow-none border border-[#E7E5E4]',
              headerTitle: 'text-[#1C1917]',
              headerSubtitle: 'text-[#78716C]',
              formButtonPrimary: 'bg-[#C2683A] hover:bg-[#9A4F28]',
              footerActionLink: 'text-[#C2683A] hover:text-[#9A4F28]',
            },
          }}
        />
      </div>
    </div>
  )
}
