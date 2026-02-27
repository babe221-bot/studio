import { ThemeToggle } from "./ThemeToggle";
import { createClient } from "@/utils/supabase/server";
import { SignOutButton } from "./SignOutButton";
import type { GuestUser } from "@/lib/guest-session";

interface HeaderProps {
  guestUser?: GuestUser | null;
}

export async function Header(props: HeaderProps) {
  const { guestUser } = props;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Determine if we have any user (authenticated or guest)
  const isGuest = guestUser && guestUser.isGuest;
  const displayUser = user || (isGuest ? { email: 'Gost' } : null);

  return (
    <header className="border-b bg-card shadow-sm">
      <div className="container mx-auto flex h-20 items-center justify-between px-4 md:px-6">
        <div>
          <h1 className="text-2xl font-bold text-primary">
            Upravljač Radova s Kamenom v3.0
          </h1>
          <p className="text-sm text-muted-foreground">
            Aplikacija za radne naloge s 3D vizualizacijom i PDF izvozom
          </p>
        </div>
        <div className="flex items-center gap-4">
          {displayUser && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground hidden md:inline-block">
                {isGuest ? (
                  <span className="inline-flex items-center gap-1">
                    <span className="inline-block h-2 w-2 rounded-full bg-yellow-500" />
                    Gost
                  </span>
                ) : (
                  displayUser.email
                )}
              </span>
              <SignOutButton isGuest={isGuest} />
            </div>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
