'use server'

import { redirect } from 'next/navigation'
import { createGuestUser, serializeGuestUser, type GuestUser } from '@/lib/guest-session'
import { cookies } from 'next/headers'

export async function joinAsGuestAction() {
    'use server'

    // Create a guest user
    const guestUser = createGuestUser();

    // Set the cookie using the cookies API (this works in server actions)
    const cookieStore = await cookies()
    cookieStore.set({
        name: 'studio_guest_session',
        value: serializeGuestUser(guestUser),
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24, // 24 hours
        path: '/',
    })

    // Redirect to home
    redirect('/')
}
