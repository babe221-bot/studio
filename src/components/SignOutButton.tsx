'use client'

import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import { GUEST_COOKIE_NAME } from "@/lib/guest-session"

interface SignOutButtonProps {
    isGuest?: boolean | null;
}

export function SignOutButton(props: SignOutButtonProps) {
    const { isGuest } = props;
    const router = useRouter()
    const supabase = createClient()

    async function handleSignOut() {
        if (isGuest) {
            // Clear guest cookie
            document.cookie = `${GUEST_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        } else {
            await supabase.auth.signOut()
        }
        router.refresh()
        router.push('/login')
    }

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            aria-label={isGuest ? "Napusti gost mode" : "Odjava"}
            title={isGuest ? "Napusti gost mode" : "Odjava"}
        >
            <LogOut className="h-4 w-4" aria-hidden="true" />
        </Button>
    )
}
