import { NextResponse } from "next/server";
import { requireUser } from "@/lib/generation/routeAuth";
import { anthropicConfigured, generateText } from "@/lib/generation/anthropic";
import { SCRIPT_SKILL_SYSTEM_PROMPT, voiceCorrectionsBlock } from "@/lib/generation/systemPrompt";
import {
  fetchHookExamples,
  fetchKnowledgeChunks,
  fetchVoiceCorrections,
} from "@/lib/generation/retrieval";
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
  const { idea, title, platform, pillar, pillarSecondary, emotion, hookFormat, storyStructure } = body;

  if (
    !idea?.trim() ||
    !PLATFORMS.includes(platform) ||
    !PILLARS.includes(pillar) ||
    !EMOTIONS.includes(emotion) ||
    !HOOK_FORMATS.includes(hookFormat) ||
    (platform === "YouTube" && !STORY_STRUCTURES.includes(storyStructure))
  ) {
    return NextResponse.json({ error: "Packaging Gate incomplete or invalid" }, { status: 400 });
  }

  // Tier 1 (voice corrections) + Tier 2 (hooks) + Tier 3 (knowledge) in parallel
  const [corrections, hookExamples, chunks] = await Promise.all([
    fetchVoiceCorrections(supabase),
    fetchHookExamples(supabase, hookFormat, emotion),
    accessToken
      ? fetchKnowledgeChunks(
          supabase,
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          accessToken,
          idea,
          emotion
        )
      : Promise.resolve([]),
  ]);

  const system = SCRIPT_SKILL_SYSTEM_PROMPT + voiceCorrectionsBlock(corrections);

  const prompt = [
    `PACKAGING GATE (confirmed):`,
    `- Platform: ${platform}`,
    `- Topic: ${idea.trim()}`,
    `- Lane: ${pillar}${pillarSecondary ? ` + ${pillarSecondary} (secondary)` : ""}`,
    `- Target Emotion: ${emotion}`,
    `- Hook Format: ${hookFormat}`,
    ...(platform === "YouTube" ? [`- Story Structure: ${storyStructure}`] : []),
    ``,
    hookExamples.length
      ? `REFERENCE HOOKS from the hooks database (matching this format and emotion — use as raw material for hook style, not to copy verbatim):\n${hookExamples.map((h) => `- ${h}`).join("\n")}`
      : ``,
    ``,
    chunks.length
      ? `RELEVANT STRATEGY NOTES retrieved from the knowledge base:\n${chunks.map((c) => `[${c.source}]\n${c.content}`).join("\n\n")}`
      : ``,
    ``,
    `Write the ${platform} script now, in the exact ${platform} output format from the system instructions.`,
  ]
    .filter((l) => l !== "")
    .join("\n");

  let draft: string;
  try {
    draft = await generateText({ system, prompt, effort: "high" });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }

  // Auto-save to the Vault as a new entry: draft in original_draft_text, tags pre-filled
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
    })
    .select("id")
    .single();

  if (insertError) {
    // don't lose the draft if the save fails
    return NextResponse.json({ error: `Draft generated but save failed: ${insertError.message}`, draft }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}
