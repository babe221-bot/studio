import { ThemeToggle } from "./ThemeToggle";
import { createClient } from "@/utils/supabase/server";
import { SignOutButton } from "./SignOutButton";

export async function Header() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

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
          {user && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground hidden md:inline-block">
                {user.email}
              </span>
              <SignOutButton />
            </div>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
