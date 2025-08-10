import Link from "next/link";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
  return (
    <header className="w-full border-b border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/40 backdrop-blur">
      <div className="container flex items-center justify-between py-3 px-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-semibold tracking-tight">vibeResearch</Link>
          <nav className="hidden sm:flex items-center gap-3 text-sm text-foreground/80">
            <Link href="/" className="hover:underline">Home</Link>
            <Link href="/theme" className="hover:underline">Theme</Link>
            <Link href="/plan" className="hover:underline">Plan</Link>
            <Link href="/export" className="hover:underline">Export</Link>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

