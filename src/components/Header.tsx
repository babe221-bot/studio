import { ThemeToggle } from "./ThemeToggle";
import { createClient } from "@/utils/supabase/server";
import { SignOutButton } from "./SignOutButton";
import type { GuestUser } from "@/lib/guest-session";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { UserCircle, LogIn, LayoutDashboard } from "lucide-react";

interface HeaderProps {
  guestUser?: GuestUser | null;
}

export async function Header(props: HeaderProps) {
  const { guestUser } = props;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Determine if we have any user (authenticated or guest)
  const isGuest = guestUser && guestUser.isGuest && !user;
  const displayUser = user || (isGuest ? { email: 'Gost' } : null);

  return (
    <header className="border-b bg-card shadow-sm sticky top-0 z-50">
      <div className="container mx-auto flex h-20 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-8">
          <Link href="/">
            <h1 className="text-2xl font-bold text-primary">
              Upravljač Radova s Kamenom v3.0
            </h1>
            <p className="text-sm text-muted-foreground hidden sm:block">
              Aplikacija za radne naloge s 3D vizualizacijom i PDF izvozom
            </p>
          </Link>
          
          {displayUser && (
            <nav className="hidden lg:flex items-center gap-4">
              <Button variant="ghost" asChild className="flex items-center gap-2">
                <Link href="/dashboard">
                  <LayoutDashboard className="h-4 w-4" />
                  Upravljačka ploča
                </Link>
              </Button>
            </nav>
          )}
        </div>
        <div className="flex items-center gap-4">
          {displayUser ? (
            <div className="flex items-center gap-3 bg-muted/30 px-3 py-1.5 rounded-full border border-border/50">
              <div className="flex items-center gap-2">
                {isGuest ? (
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                    </span>
                    <span className="text-sm font-medium text-muted-foreground hidden md:inline-block">Gost</span>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs ml-1" asChild>
                      <Link href="/login">
                        <LogIn className="h-3 w-3 mr-1" />
                        Prijava
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <UserCircle className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium hidden md:inline-block truncate max-w-[150px]">
                      {displayUser.email}
                    </span>
                  </div>
                )}
              </div>
              <div className="h-4 w-[1px] bg-border mx-1"></div>
              <SignOutButton isGuest={isGuest} />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/login">Prijava</Link>
              </Button>
            </div>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
