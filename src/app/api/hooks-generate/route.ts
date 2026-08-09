import { NextResponse } from "next/server";
import { requireUser } from "@/lib/generation/routeAuth";
import { anthropicConfigured, generateText } from "@/lib/generation/anthropic";
import {
  SCRIPT_SKILL_SYSTEM_PROMPT,
  KALLAWAY_PIPELINE,
  REFERENCE_FRAMEWORK,
  voiceCorrectionsBlock,
} from "@/lib/generation/systemPrompt";
import {
  fetchHookExamples,
  fetchKnowledgeChunks,
  fetchVoiceCorrections,
} from "@/lib/generation/retrieval";
import {
  bankMaterialBlock,
  fetchSixPowerWordsForNiche,
  fetchShockValueFacts,
  fetchHookTemplateLibrary,
  fetchHookFormatTemplates,
  sixPowerWordsBlock,
  shockValueFactsBlock,
  hookTemplateCandidatesBlock,
  dedupeAgainstLibrary,
  type PowerWord,
  type Metaphor,
  type HookFormatTemplate,
} from "@/lib/hooksBank";
import { EMOTIONS, HOOK_FORMATS, PILLARS, PLATFORMS, STORY_STRUCTURES } from "@/lib/scripts";

export const maxDuration = 300;

export async function POST(req: Request) {
  const { supabase, error, accessToken } = await requireUser();
  if (error) return error;
  if (!anthropicConfigured()) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured yet — set it in the environment." },
      { status: 503 }
    );
  }

  const body = await req.json();
  const {
    idea,
    title,
    niche,
    platform,
    pillar,
    pillarSecondary,
    emotion,
    hookFormat,
    storyStructure,
    hookFormatId,
    metaphorId,
    powerWordIds,
    broadenTemplates,
  } = body;

  if (
    !idea?.trim() ||
    !niche?.trim() ||
    !PLATFORMS.includes(platform) ||
    !PILLARS.includes(pillar) ||
    !EMOTIONS.includes(emotion) ||
    !HOOK_FORMATS.includes(hookFormat) ||
    (platform === "YouTube" && !STORY_STRUCTURES.includes(storyStructure))
  ) {
    return NextResponse.json({ error: "Packaging Gate incomplete or invalid" }, { status: 400 });
  }

  const powerWordIdsArr: string[] = Array.isArray(powerWordIds) ? powerWordIds : [];

  const [
    corrections,
    hookExamples,
    chunks,
    powerWordRows,
    metaphorRow,
    templateRow,
    sixPowerWords,
    shockFacts,
    templateLibrary,
    provenTemplates,
  ] = await Promise.all([
    fetchVoiceCorrections(supabase),
    fetchHookExamples(supabase, hookFormat, emotion),
    accessToken
      ? fetchKnowledgeChunks(supabase, process.env.NEXT_PUBLIC_SUPABASE_URL!, accessToken, idea, emotion)
      : Promise.resolve([]),
    powerWordIdsArr.length
      ? supabase
          .from("power_words")
          .select("phrase, fn")
          .in("id", powerWordIdsArr)
          .then((r) => (r.data as Pick<PowerWord, "phrase" | "fn">[]) ?? [])
      : Promise.resolve([]),
    metaphorId
      ? supabase
          .from("metaphors")
          .select("concrete_anchor, meaning_layer")
          .eq("id", metaphorId)
          .single()
          .then((r) => (r.data as Pick<Metaphor, "concrete_anchor" | "meaning_layer"> | null) ?? null)
      : Promise.resolve(null),
    hookFormatId
      ? supabase
          .from("hook_formats")
          .select("name, template, notes")
          .eq("id", hookFormatId)
          .single()
          .then((r) => (r.data as Pick<HookFormatTemplate, "name" | "template" | "notes"> | null) ?? null)
      : Promise.resolve(null),
    fetchSixPowerWordsForNiche(supabase, niche),
    fetchShockValueFacts(supabase, niche),
    fetchHookTemplateLibrary(supabase, hookFormat),
    fetchHookFormatTemplates(supabase),
  ]);

  // Broaden to generic templates when this niche has no seeded material of its own
  // (today: business, mindset). Derived from what was just fetched rather than a
  // hardcoded niche list, so it stops broadening on its own once a niche fills in.
  // `broadenTemplates` in the request overrides the automatic call either way.
  const nicheIsThinlySeeded = sixPowerWords.length === 0 && shockFacts.length === 0;
  const broaden = typeof broadenTemplates === "boolean" ? broadenTemplates : nicheIsThinlySeeded;

  // The curated library is a subset of the raw swipe file, so drop raw examples that
  // restate a template already shown above under Step 4B.
  const dedupedHookExamples = dedupeAgainstLibrary(hookExamples, templateLibrary);

  // Order matters: voice first (Script Skill owns how it sounds), then the process
  // pipeline, then the Three Laws it defers to at Step 4c, then the retrieved material.
  const system =
    SCRIPT_SKILL_SYSTEM_PROMPT +
    voiceCorrectionsBlock(corrections) +
    KALLAWAY_PIPELINE +
    "\n\n" +
    REFERENCE_FRAMEWORK +
    shockValueFactsBlock(shockFacts) +
    sixPowerWordsBlock(sixPowerWords) +
    hookTemplateCandidatesBlock({
      proven: provenTemplates,
      library: templateLibrary,
      broaden,
      hookFormat,
    }) +
    bankMaterialBlock({ powerWords: powerWordRows, metaphor: metaphorRow, hookFormatTemplate: templateRow });

  const prompt = [
    `PACKAGING GATE (confirmed):`,
    `- Platform: ${platform}`,
    `- Topic: ${idea.trim()} (niche: ${niche.trim()})`,
    `- Lane: ${pillar}${pillarSecondary ? ` + ${pillarSecondary} (secondary)` : ""}`,
    `- Target Emotion: ${emotion}`,
    `- Hook Format: ${hookFormat}`,
    ...(platform === "YouTube" ? [`- Story Structure: ${storyStructure}`] : []),
    ``,
    dedupedHookExamples.length
      ? `REFERENCE HOOKS from the hooks database (matching this format and emotion — use as raw material for hook style, not to copy verbatim):\n${dedupedHookExamples.map((h) => `- ${h}`).join("\n")}`
      : ``,
    ``,
    chunks.length
      ? `RELEVANT STRATEGY NOTES retrieved from the knowledge base:\n${chunks.map((c) => `[${c.source}]\n${c.content}`).join("\n\n")}`
      : ``,
    ``,
    `Run the full generation pipeline now, Steps 1 through 5 in order. Return the PROCESS block, then the ${platform} script in the exact ${platform} output format from the system instructions.`,
  ]
    .filter((l) => l !== "")
    .join("\n");

  let draft: string;
  try {
    draft = await generateText({ system, prompt, effort: "high" });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }

  const { data, error: insertError } = await supabase
    .from("scripts")
    .insert({
      title: (title?.trim() || idea.trim().slice(0, 80)) as string,
      platform,
      pillar,
      pillar_secondary: pillarSecondary || null,
      target_emotion: emotion,
      hook_format: hookFormat,
      story_structure: platform === "YouTube" ? storyStructure : null,
      original_draft_text: draft,
      hook_format_id: hookFormatId || null,
      metaphor_id: metaphorId || null,
      power_words_used: powerWordIdsArr,
    })
    .select("id")
    .single();

  if (insertError) {
    return NextResponse.json({ error: `Draft generated but save failed: ${insertError.message}`, draft }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}
