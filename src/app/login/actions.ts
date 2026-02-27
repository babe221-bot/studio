'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { createGuestUser, serializeGuestUser, GUEST_COOKIE_NAME, type GuestUser } from '@/lib/guest-session'

export async function login(formData: FormData) {
    const supabase = await createClient()

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    const { error } = await supabase.auth.signInWithPassword(data)

    if (error) {
        redirect('/login?error=Could not authenticate user')
    }

    revalidatePath('/', 'layout')
    redirect('/')
}

export async function signup(formData: FormData) {
    const supabase = await createClient()

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    const { error } = await supabase.auth.signUp(data)

    if (error) {
        redirect('/login?error=Could not authenticate user')
    }

    revalidatePath('/', 'layout')
    redirect('/')
}

export async function joinAsGuest() {
    // Create a guest user
    const guestUser = createGuestUser();

    // Serialize and redirect with the guest session
    // We'll set the cookie via client-side after redirect
    revalidatePath('/', 'layout')
    redirect(`/?guest=${encodeURIComponent(serializeGuestUser(guestUser))}`)
}
