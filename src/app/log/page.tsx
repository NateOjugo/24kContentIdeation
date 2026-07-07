import { AppNav } from "@/components/AppNav";
import { ScriptForm } from "@/components/ScriptForm";
import { createClient } from "@/lib/supabase/server";
import type { Script, ScriptInput } from "@/lib/scripts";

export const metadata = { title: "Log Script — 24K Script Vault" };

export default async function LogPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;

  // Feature 4 — Repeat Builder: pre-fill the framework combo from a proven script.
  let prefill: Partial<ScriptInput> | undefined;
  let sourceTitle: string | undefined;
  if (from) {
    const supabase = await createClient();
    const { data } = await supabase.from("scripts").select("*").eq("id", from).single();
    if (data) {
      const s = data as Script;
      sourceTitle = s.title;
      prefill = {
        platform: s.platform,
        content_series: s.content_series,
        pillar: s.pillar,
        pillar_secondary: s.pillar_secondary,
        target_emotion: s.target_emotion,
        hook_format: s.hook_format,
        story_structure: s.story_structure,
        cta_type: s.cta_type,
      };
    }
  }

  return (
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-6">
          <div className="micro-label mb-2">
            {prefill ? "Repeat Builder" : "Script Logger"}
          </div>
          <h1 className="font-display text-4xl tracking-wide text-cream">
            {prefill ? "Rebuild From a Winner" : "Log a Script"}
          </h1>
          <p className="mt-1 text-sm text-steel">
            {prefill
              ? `Framework combo pre-loaded from "${sourceTitle}". Change the title and write the new one.`
              : "Paste your finished script. The dashboard reads its structure and fills the tags — you just review and save."}
          </p>
        </div>
        <ScriptForm prefill={prefill} />
      </main>
    </>
  );
}
