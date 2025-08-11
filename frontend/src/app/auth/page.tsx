"use client";
import { FormEvent, useState } from "react";
import { supabaseClient } from "@/lib/supabase/client";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus("Sending magic link...");
    const { error } = await supabaseClient.auth.signInWithOtp({ email });
    if (error) {
      setError(error.message);
      setStatus(null);
    } else {
      setStatus("Check your email for a magic link.");
    }
  }

  return (
    <section className="grid gap-4 max-w-md">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <form onSubmit={onSubmit} className="grid gap-3">
        <label className="grid gap-1">
          <span className="text-sm">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="px-3 py-2 rounded-md border border-black/10 dark:border-white/15 bg-white/70 dark:bg-black/40"
            placeholder="you@example.com"
          />
        </label>
        <button
          type="submit"
          className="rounded-md border border-black/10 dark:border-white/20 px-3 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10"
        >
          Send magic link
        </button>
      </form>
      {status && <p className="text-foreground/70 text-sm">{status}</p>}
      {error && <p className="text-red-600 text-sm">{error}</p>}
    </section>
  );
}

