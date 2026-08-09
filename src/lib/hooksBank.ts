// Power-words / metaphors / hook-format template bank. Feeds the generation
// pipeline as optional material — never a requirement (see REFERENCE_FRAMEWORK
// in generation/systemPrompt.ts, which carries the same framing).
import type { SupabaseClient } from "@supabase/supabase-js";

export const POWER_WORD_FUNCTIONS = [
  "accusation",
  "reframe",
  "closing-punch",
  "reveal",
  "bridge",
] as const;
export type PowerWordFn = (typeof POWER_WORD_FUNCTIONS)[number];

export type HookFormatTemplate = {
  id: string;
  name: string;
  template: string;
  proven_in: string[];
  notes: string | null;
  created_at: string;
};

export type PowerWord = {
  id: string;
  phrase: string;
  fn: PowerWordFn;
  niches: string[];
  proven_in: string[];
  derivatives: string[];
  source: string;
  created_at: string;
};

export type Metaphor = {
  id: string;
  niche: string;
  concrete_anchor: string;
  meaning_layer: string;
  proven_in: string[];
  created_at: string;
};

export type SandcastleImport = {
  id: string;
  raw_hook: string;
  outlier_score: number | null;
  extracted_power_words: string[] | null;
  channel_source: string | null;
  reviewed: boolean;
  promoted: boolean;
  created_at: string;
};

/** Canonical niche form for both write and read paths — Postgres array
 *  containment and text equality are exact-match, so pick one casing. */
export function normalizeNiche(niche: string): string {
  return niche.trim().toLowerCase();
}

export async function fetchPowerWordsForNiche(
  supabase: SupabaseClient,
  niche: string,
  limit = 60
): Promise<PowerWord[]> {
  const { data } = await supabase
    .from("power_words")
    .select("*")
    .contains("niches", [normalizeNiche(niche)])
    .limit(limit);
  return (data as PowerWord[]) ?? [];
}

export function groupPowerWordsByFn(words: PowerWord[]): Record<PowerWordFn, PowerWord[]> {
  const grouped = Object.fromEntries(
    POWER_WORD_FUNCTIONS.map((f) => [f, [] as PowerWord[]])
  ) as Record<PowerWordFn, PowerWord[]>;
  for (const w of words) grouped[w.fn]?.push(w);
  return grouped;
}

export async function fetchMetaphorsForNiche(
  supabase: SupabaseClient,
  niche: string,
  limit = 20
): Promise<Metaphor[]> {
  const { data } = await supabase
    .from("metaphors")
    .select("*")
    .eq("niche", normalizeNiche(niche))
    .limit(limit);
  return (data as Metaphor[]) ?? [];
}

export async function fetchHookFormatTemplates(
  supabase: SupabaseClient,
  limit = 60
): Promise<HookFormatTemplate[]> {
  const { data } = await supabase
    .from("hook_formats")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as HookFormatTemplate[]) ?? [];
}

export async function fetchUnreviewedSandcastleImports(
  supabase: SupabaseClient,
  limit = 50
): Promise<SandcastleImport[]> {
  const { data } = await supabase
    .from("sandcastles_imports")
    .select("*")
    .eq("reviewed", false)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as SandcastleImport[]) ?? [];
}

/** Optional-material block for the generation system prompt. Explicitly framed
 *  as inspiration, never mandatory. Returns "" when nothing was selected. */
export function bankMaterialBlock(opts: {
  powerWords: Pick<PowerWord, "phrase" | "fn">[];
  metaphor: Pick<Metaphor, "concrete_anchor" | "meaning_layer"> | null;
  hookFormatTemplate: Pick<HookFormatTemplate, "name" | "template" | "notes"> | null;
}): string {
  const parts: string[] = [];
  if (opts.powerWords.length) {
    parts.push(
      `Power words selected as optional raw material (use if they fit naturally, do not force them):\n` +
        opts.powerWords.map((w) => `- "${w.phrase}" (${w.fn})`).join("\n")
    );
  }
  if (opts.metaphor) {
    parts.push(
      `Metaphor selected as optional structural material (concrete anchor -> meaning layer, physical first / meaning last per Voice DNA):\n` +
        `- Anchor: ${opts.metaphor.concrete_anchor}\n- Meaning: ${opts.metaphor.meaning_layer}`
    );
  }
  if (opts.hookFormatTemplate) {
    parts.push(
      `Hook format template selected as optional structural inspiration (adapt, do not copy):\n` +
        `- ${opts.hookFormatTemplate.name}: ${opts.hookFormatTemplate.template}` +
        (opts.hookFormatTemplate.notes ? `\n  Notes: ${opts.hookFormatTemplate.notes}` : "")
    );
  }
  if (!parts.length) return "";
  return `\n\n## OPTIONAL BANK MATERIAL — inspiration only, not requirements\n${parts.join("\n\n")}`;
}
