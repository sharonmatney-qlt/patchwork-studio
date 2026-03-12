import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Routes that require a signed-in user.
// Studio and landing page are intentionally public — free to try.
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/makes(.*)',
  '/profile(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) await auth.protect()
})

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
