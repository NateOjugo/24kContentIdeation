import { AppNav } from "@/components/AppNav";
import { HooksGenerateForm } from "@/components/HooksGenerateForm";
import { HooksBankManager } from "@/components/HooksBankManager";
import { HooksSandcastlesImport } from "@/components/HooksSandcastlesImport";
import { HooksPerformanceTable, type HooksLinkedScript } from "@/components/HooksPerformanceTable";
import { createClient } from "@/lib/supabase/server";
import { fetchHookFormatTemplates, fetchUnreviewedSandcastleImports } from "@/lib/hooksBank";
import type { PowerWord, Metaphor, SixPowerWord, ShockValueFact } from "@/lib/hooksBank";

export const metadata = { title: "Hooks Bank — 24K Script Vault" };
export const dynamic = "force-dynamic";

export default async function HooksPage() {
  const supabase = await createClient();

  const [
    templates,
    imports,
    powerWordsRes,
    metaphorsRes,
    sixPowerWordsRes,
    shockFactsRes,
    linkedScriptsRes,
  ] = await Promise.all([
    fetchHookFormatTemplates(supabase),
    fetchUnreviewedSandcastleImports(supabase),
    supabase.from("power_words").select("*").order("created_at", { ascending: false }),
    supabase.from("metaphors").select("*").order("created_at", { ascending: false }),
    supabase.from("six_power_words").select("*").order("created_at", { ascending: false }),
    // management view shows every fact, including sub-80 ones retrieval skips
    supabase.from("shock_value_facts").select("*").order("shock_score", { ascending: false }),
    supabase
      .from("scripts")
      .select("id,title,platform,views,retention_rate,save_rate,share_rate,hook_format_id,metaphor_id")
      .or("hook_format_id.not.is.null,metaphor_id.not.is.null")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  return (
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-5 px-4 py-8 sm:px-6">
        <div className="mb-1">
          <div className="micro-label mb-2">Hooks Bank</div>
          <h1 className="font-display text-4xl tracking-wide text-cream">
            Power Words, Metaphors, Formats.
          </h1>
          <p className="mt-1 text-sm text-steel">
            A growing library that feeds the generation pipeline — same Vault, same Pattern Engine, just informed by more material.
          </p>
        </div>

        <HooksGenerateForm hookFormatTemplates={templates} />

        <HooksPerformanceTable scripts={(linkedScriptsRes.data as HooksLinkedScript[]) ?? []} />

        <HooksBankManager
          initialPowerWords={(powerWordsRes.data as PowerWord[]) ?? []}
          initialMetaphors={(metaphorsRes.data as Metaphor[]) ?? []}
          initialHookFormatTemplates={templates}
          initialSixPowerWords={(sixPowerWordsRes.data as SixPowerWord[]) ?? []}
          initialShockValueFacts={(shockFactsRes.data as ShockValueFact[]) ?? []}
        />

        <HooksSandcastlesImport initialImports={imports} />
      </main>
    </>
  );
}
