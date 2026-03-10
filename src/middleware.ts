import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const isAdminRoute = req.nextUrl.pathname.startsWith('/admin');

  if (isAdminRoute) {
    if (!session) {
      // Redirect unauthenticated users to login
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // Placeholder for actual role check
    // In a real application, you would fetch the user's role from your database
    // and check if it's 'admin' or 'superadmin'.
    // For this example, we'll use a simple email check for demonstration.
    const userEmail = session.user.email;
    if (!userEmail || !userEmail.includes('admin')) {
      // Redirect non-admin users from admin routes
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  return res;
}

export const config = {
  matcher: [
    '/*', // Match all routes
    '/((?!_next/static|_next/image|favicon.ico|api/auth).*) ', // Exclude static files and API routes handled by Next.js
  ],
};
