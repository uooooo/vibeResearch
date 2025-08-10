"use client";
import Link from "next/link";
import ThemeToggle from "./ThemeToggle";
import { useSession } from "@/lib/supabase/session";
import { supabaseClient } from "@/lib/supabase/client";

export default function Header() {
  const { user, loading } = useSession();
  async function handleSignOut() {
    await supabaseClient.auth.signOut();
  }
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
          {!loading && user ? (
            <>
              <span className="text-xs text-foreground/70 hidden sm:inline">{user.email}</span>
              <button onClick={handleSignOut} className="rounded-md border border-black/10 dark:border-white/20 px-3 py-1 text-sm hover:bg-black/5 dark:hover:bg-white/10">Sign out</button>
            </>
          ) : (
            <Link href="/auth" className="rounded-md border border-black/10 dark:border-white/20 px-3 py-1 text-sm hover:bg-black/5 dark:hover:bg-white/10">Sign in</Link>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
