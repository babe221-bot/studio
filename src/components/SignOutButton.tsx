'use client'

import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"

export function SignOutButton() {
    const router = useRouter()
    const supabase = createClient()

    async function handleSignOut() {
        await supabase.auth.signOut()
        router.refresh()
    }

    return (
        <Button variant="ghost" size="icon" onClick={handleSignOut} title="Odjava">
            <LogOut className="h-4 w-4" />
        </Button>
    )
}
