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

// --- Kallaway pipeline (Step 2 shock value, Step 4a six power words) ---

/** Subject/Action/Objective/Contrast are required in every hook. Proof/Time are intensifiers. */
export const CORE_SLOTS = ["subject", "action", "objective", "contrast"] as const;
export const INTENSIFIER_SLOTS = ["proof", "time"] as const;
export const POWER_WORD_SLOTS = [...CORE_SLOTS, ...INTENSIFIER_SLOTS] as const;
export type PowerWordSlot = (typeof POWER_WORD_SLOTS)[number];

/** Kallaway's gate: a fact scoring below this is common knowledge and causes drop-off. */
export const SHOCK_VALUE_GATE = 80;

export type SixPowerWord = {
  id: string;
  slot: PowerWordSlot;
  example: string;
  niche: string[];
  proven_in: string[];
  is_core: boolean;
  created_at: string;
};

export type ShockValueFact = {
  id: string;
  fact: string;
  topic: string;
  niche: string;
  shock_score: number;
  expectation: string | null;
  reality: string | null;
  used_in: string[];
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

export async function fetchSixPowerWordsForNiche(
  supabase: SupabaseClient,
  niche: string,
  limit = 60
): Promise<SixPowerWord[]> {
  const { data } = await supabase
    .from("six_power_words")
    .select("*")
    .contains("niche", [normalizeNiche(niche)])
    .limit(limit);
  return (data as SixPowerWord[]) ?? [];
}

/** Step 2 retrieval: only facts that already clear the 80 gate, strongest first.
 *  Sub-80 rows are never surfaced — the pipeline would discard them anyway. */
export async function fetchShockValueFacts(
  supabase: SupabaseClient,
  niche: string,
  limit = 10
): Promise<ShockValueFact[]> {
  const { data } = await supabase
    .from("shock_value_facts")
    .select("*")
    .eq("niche", normalizeNiche(niche))
    .gte("shock_score", SHOCK_VALUE_GATE)
    .order("shock_score", { ascending: false })
    .limit(limit);
  return (data as ShockValueFact[]) ?? [];
}

/** Step 4a material, grouped so the model sees which slots it must fill vs may add. */
export function sixPowerWordsBlock(words: SixPowerWord[]): string {
  if (!words.length) return "";
  const bySlot = (slot: PowerWordSlot) =>
    words.filter((w) => w.slot === slot).map((w) => `"${w.example}"`).join(", ");
  const line = (slot: PowerWordSlot) => {
    const examples = bySlot(slot);
    return examples ? `- ${slot}: ${examples}` : "";
  };
  const core = CORE_SLOTS.map(line).filter(Boolean).join("\n");
  const intensifiers = INTENSIFIER_SLOTS.map(line).filter(Boolean).join("\n");
  return [
    `\n\n## SIX POWER WORDS BANK — proven slot fillers for this niche (raw material, adapt freely)`,
    core ? `CORE (all four required in the hook):\n${core}` : "",
    intensifiers ? `INTENSIFIERS (add only when they strengthen it):\n${intensifiers}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Step 2 material. Every fact here already passed the gate, so say so explicitly —
 *  otherwise the model re-litigates scores it cannot improve on. */
export function shockValueFactsBlock(facts: ShockValueFact[]): string {
  if (!facts.length) return "";
  const rows = facts
    .map((f) => {
      const parts = [`- [${f.shock_score}] ${f.fact}`];
      if (f.expectation) parts.push(`    Expectation: ${f.expectation}`);
      if (f.reality) parts.push(`    Reality: ${f.reality}`);
      return parts.join("\n");
    })
    .join("\n");
  return `\n\n## SHOCK VALUE BANK — proven facts for this niche, all already scoring ${SHOCK_VALUE_GATE}+\nReuse these before inventing new ones. Scores shown in brackets.\n${rows}`;
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
