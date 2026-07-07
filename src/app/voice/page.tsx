import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { ConsolidateVoiceButton } from "@/components/ConsolidateVoiceButton";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Voice Correction Log — 24K Script Vault" };
export const dynamic = "force-dynamic";

const CAP = 30;

type Correction = {
  id: number;
  rule: string;
  reinforced_count: number;
  source_script_id: string | null;
  created_at: string;
};

export default async function VoicePage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("voice_corrections")
    .select("id, rule, reinforced_count, source_script_id, created_at")
    .eq("active", true)
    .order("reinforced_count", { ascending: false })
    .order("created_at", { ascending: false });

  const corrections = (data ?? []) as Correction[];
  const overCap = corrections.length > CAP;

  return (
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-6">
          <div className="micro-label mb-2">Voice Learning Loop</div>
          <h1 className="font-display text-4xl tracking-wide text-cream">
            Voice Correction Log
          </h1>
          <p className="mt-1 text-sm text-steel">
            Rules learned from your actual edits. The top {CAP} feed every generation on top of the Voice Bible.
          </p>
        </div>

        <div className="accent-card mb-5 flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <div className="font-display text-4xl text-gold">{corrections.length}</div>
            <div className="micro-label-steel mt-0.5">
              Active Rules {overCap && <span className="text-gold">· over the {CAP} cap</span>}
            </div>
          </div>
          {corrections.length >= 2 && <ConsolidateVoiceButton overCap={overCap} />}
        </div>

        {overCap && (
          <p className="mb-4 text-xs text-steel">
            You’re past the {CAP}-rule cap. Only the {CAP} most-reinforced/recent rules
            are injected per call. Consolidate to merge duplicates into a tighter set.
          </p>
        )}

        {error && <p className="text-sm text-gold">Query error: {error.message}</p>}

        {corrections.length === 0 ? (
          <div className="accent-card p-10 text-center">
            <p className="text-sm text-steel">
              No voice rules yet. Generate a script, edit it in Docs, paste the final
              back into the entry, then hit “Learn from Edit” — the rules land here.
            </p>
          </div>
        ) : (
          <ol className="space-y-2">
            {corrections.map((c, i) => (
              <li
                key={c.id}
                className={`accent-card p-4 ${i >= CAP ? "opacity-50" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-cream">{c.rule}</p>
                  {c.reinforced_count > 1 && (
                    <span className="shrink-0 font-mono text-[10px] font-bold tracking-[0.08em] text-gold uppercase">
                      x{c.reinforced_count}
                    </span>
                  )}
                </div>
                {c.source_script_id && (
                  <Link
                    href={`/scripts/${c.source_script_id}`}
                    className="micro-label-steel mt-2 inline-block hover:text-cream"
                  >
                    from a logged edit →
                  </Link>
                )}
              </li>
            ))}
          </ol>
        )}
      </main>
    </>
  );
}
