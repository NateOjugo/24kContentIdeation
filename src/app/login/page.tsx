"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <div className="micro-label mb-3">24K.0JAY</div>
          <h1 className="font-display text-5xl tracking-wide text-cream">
            SCRIPT VAULT
          </h1>
          <p className="mt-2 text-sm text-steel">
            Log it. Pattern it. Repeat what wins.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="accent-card p-6">
          <div className="mb-4">
            <label htmlFor="email" className="micro-label-steel mb-2 block">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              className="field-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="mb-6">
            <label htmlFor="password" className="micro-label-steel mb-2 block">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              className="field-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <p className="mb-4 text-sm text-gold" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-[3px] bg-gold px-4 py-2.5 text-sm font-semibold text-navy-deep transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Enter the Vault"}
          </button>
        </form>
      </div>
    </main>
  );
}
