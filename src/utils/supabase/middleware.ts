import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { GUEST_COOKIE_NAME, deserializeGuestUser } from '@/lib/guest-session'

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const {
        data: { user },
    } = await supabase.auth.getUser()

    // Check for guest session
    const guestCookie = request.cookies.get(GUEST_COOKIE_NAME);
    const isGuest = guestCookie ? !!deserializeGuestUser(guestCookie.value) : false;

    // Check for guest parameter in URL (used during guest login flow)
    const hasGuestParam = request.nextUrl.searchParams.has('guest');

    // Allow access if:
    // 1. User is authenticated, OR
    // 2. User has a valid guest session cookie, OR
    // 3. Path starts with /login or /auth, OR
    // 4. Has guest parameter in URL (for guest login flow)
    const isAuthPage = request.nextUrl.pathname.startsWith('/login') ||
        request.nextUrl.pathname.startsWith('/auth');

    if (!user && !isGuest && !isAuthPage && !hasGuestParam) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    return supabaseResponse
}
