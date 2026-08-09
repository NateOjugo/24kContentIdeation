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

/** Curated swipe-file template. Distinct from HookFormatTemplate (`hook_formats`),
 *  which is proven material with real performance data and always outranks these. */
export type HookTemplateLibraryRow = {
  id: string;
  template: string;
  example: string | null;
  hook_format: string;
  source_category: string | null;
  niche_relevant: boolean;
  has_placeholder: boolean;
  source: string;
  proven_in: string[];
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

/** Step 4b candidates from the curated library, niche-relevant rows first.
 *  Small per-format sets (9-83 rows), so fetch and split in memory rather than
 *  round-tripping twice to decide whether to broaden. */
export async function fetchHookTemplateLibrary(
  supabase: SupabaseClient,
  hookFormat: string,
  limit = 40
): Promise<HookTemplateLibraryRow[]> {
  const { data } = await supabase
    .from("hook_template_library")
    .select("*")
    .eq("hook_format", hookFormat)
    .order("niche_relevant", { ascending: false })
    .limit(limit);
  return (data as HookTemplateLibraryRow[]) ?? [];
}

const normalizeForCompare = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** The curated library is a subset of the raw `hooks` swipe file, so the same line
 *  can arrive from both sources in one prompt. Showing a curated template and its
 *  raw twin side by side undercuts the curation, so drop the raw duplicate. */
export function dedupeAgainstLibrary(
  hookExamples: string[],
  library: HookTemplateLibraryRow[]
): string[] {
  const templates = library
    .map((t) => normalizeForCompare(t.template))
    // very short templates would match too many unrelated lines by prefix
    .filter((t) => t.length > 12);
  if (!templates.length) return hookExamples;
  return hookExamples.filter((ex) => {
    const n = normalizeForCompare(ex);
    return !templates.some((t) => n.startsWith(t));
  });
}

/** Step 4b block. Proven material is listed first and explicitly ranked above the
 *  library, so a swipe-file row can never silently outrank something with real
 *  performance data behind it. `broaden` admits generic rows for niches that do
 *  not have much of their own seeded material yet. */
export function hookTemplateCandidatesBlock(opts: {
  proven: HookFormatTemplate[];
  library: HookTemplateLibraryRow[];
  broaden: boolean;
  hookFormat: string;
}): string {
  const { proven, library, broaden, hookFormat } = opts;

  const nicheRows = library.filter((t) => t.niche_relevant);
  const genericRows = library.filter((t) => !t.niche_relevant);
  // Prefer niche-relevant. Fall back to generic when broadening, or when there is
  // no niche-relevant material at all — an empty list helps nobody.
  const chosen = broaden || nicheRows.length === 0 ? [...nicheRows, ...genericRows] : nicheRows;
  const shown = chosen.slice(0, 12);

  if (!proven.length && !shown.length) return "";

  const parts: string[] = [
    `\n\n## STEP 4B — HOOK TEMPLATE CANDIDATES (${hookFormat})`,
    `RANKING RULE: proven templates outrank library templates, always. Use a library`,
    `template only when no proven template fits the topic. On a tie, proven wins.`,
  ];

  if (proven.length) {
    parts.push(
      `\nPROVEN — real performance data behind these, prefer them:\n` +
        proven
          .map((p) => {
            const posted = p.proven_in.length ? ` [proven in ${p.proven_in.length} posted script(s)]` : "";
            return `- ${p.name}: ${p.template}${posted}${p.notes ? `\n    Notes: ${p.notes}` : ""}`;
          })
          .join("\n")
    );
  } else {
    parts.push(`\nPROVEN: none recorded yet, so the library below is all that is available.`);
  }

  if (shown.length) {
    const label = broaden
      ? `LIBRARY — curated swipe file, broadened to generic templates because this niche has little seeded material yet`
      : `LIBRARY — curated swipe file, filtered to niche-relevant templates`;
    parts.push(
      `\n${label}:\n` +
        shown
          .map((t) => {
            const tag = t.niche_relevant ? "" : " (generic — swap the subject to fit the niche)";
            const eg = t.example ? `\n    e.g. ${t.example}` : "";
            return `- ${t.template}${tag}${eg}`;
          })
          .join("\n")
    );
    parts.push(
      `\nTemplates with [bracketed] or ___ slots are scaffolding, not copy. Fill them with`,
      `this creator's own material and rewrite in the 24K voice. Never ship a placeholder.`
    );
  }

  return parts.join("\n");
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
