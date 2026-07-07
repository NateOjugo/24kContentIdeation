import { AppNav } from "@/components/AppNav";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("scripts")
    .select("*", { count: "exact", head: true });

  return (
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <div className="mb-8">
          <div className="micro-label mb-2">The Vault</div>
          <h1 className="font-display text-4xl tracking-wide text-cream sm:text-5xl">
            Every Script. Every Win. On Record.
          </h1>
        </div>

        <div className="accent-card p-8 text-center">
          {error ? (
            <p className="text-sm text-gold">
              Database connection error: {error.message}
            </p>
          ) : (
            <>
              <div className="font-display text-6xl text-gold">{count ?? 0}</div>
              <div className="micro-label-steel mt-2">Scripts Logged</div>
              <p className="mx-auto mt-4 max-w-md text-sm text-steel">
                Foundation is live. The Script Logger arrives in Phase 1 — this
                counter reads straight from the scripts table.
              </p>
            </>
          )}
        </div>
      </main>
    </>
  );
}
