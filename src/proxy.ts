import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import type { NextRequest } from 'next/server';

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)' // NUR dashboard schützen
]);

export default clerkMiddleware(async (auth, req: NextRequest) => {
  // alles außerhalb /dashboard ist public (case tracker + otp apis)
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

// wichtig: matcher muss middleware treffen (sonst greift's nicht überall sauber)
export const config = {
  matcher: [
    // Next recommended matcher
    '/((?!.*\\..*|_next).*)',
    '/',
    '/(api|trpc)(.*)'
  ]
};
