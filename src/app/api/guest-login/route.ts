import { NextResponse, type NextRequest } from 'next/server'
import { createGuestUser, serializeGuestUser } from '@/lib/guest-session'

export async function GET(request: NextRequest) {
    // Create a guest user
    const guestUser = createGuestUser();

    // Create response and set cookie
    const response = NextResponse.redirect(new URL('/', request.url))

    response.cookies.set({
        name: 'studio_guest_session',
        value: serializeGuestUser(guestUser),
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24, // 24 hours
        path: '/',
    })

    return response
}
