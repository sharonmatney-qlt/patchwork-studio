import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Routes that always require a signed-in user.
// /makes/[id] is intentionally omitted so public makes are viewable without auth.
// /explore/* is public (community feed).
// /api/webhooks/* is public (called by external services like Clerk).
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/makes/new(.*)',
  '/profile(.*)',
  '/studio(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  // Protect the /makes list page (exact path) separately, since we can't
  // use a wildcard without also catching /makes/[id].
  const pathname = req.nextUrl.pathname
  const isMakesList = pathname === '/makes' || pathname === '/makes/'

  if (isProtectedRoute(req) || isMakesList) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
