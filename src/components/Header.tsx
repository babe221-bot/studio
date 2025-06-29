import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  return (
    <header className="border-b bg-card shadow-sm">
      <div className="container mx-auto flex h-20 items-center justify-between px-4 md:px-6">
        <div>
          <h1 className="text-2xl font-bold text-primary">
            Laboratorij za kamen v6
          </h1>
          <p className="text-sm text-muted-foreground">
            Sustav s naprednom vizualizacijom i PDF izvozom
          </p>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
