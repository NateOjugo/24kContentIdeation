import { NextResponse } from "next/server";
import { requireUser } from "@/lib/generation/routeAuth";
import { anthropicConfigured, generateText } from "@/lib/generation/anthropic";
import { SCRIPT_SKILL_SYSTEM_PROMPT, voiceCorrectionsBlock } from "@/lib/generation/systemPrompt";
import {
  fetchHookExamples,
  fetchKnowledgeChunks,
  fetchVoiceCorrections,
} from "@/lib/generation/retrieval";
import { winningFormula } from "@/lib/patterns";
import { computeOutliers } from "@/lib/outlier";
import { EMOTIONS, HOOK_FORMATS, PILLARS, PLATFORMS, STORY_STRUCTURES, type Script } from "@/lib/scripts";

export const maxDuration = 300;

// Feature 9 step 3: [structure map] + [your take] -> new script, structurally
// proven but entirely Nate's material. Reuses the Phase 3 generation pipeline.
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
  const { take, title, platform, pillar, pillarSecondary, emotion, hookFormat, storyStructure, structureMap } = body;
  // "Blend with My Winning Patterns" — OFF by default. The source transcript is
  // typically already a proven outlier on its own channel, carrying real signal on
  // its own. Blending it with separate Vault pattern data by default risks the
  // model reconciling two different "proven structures" in one generation and
  // producing something that follows neither cleanly. Keep it an explicit choice.
  const blendPatterns = body.blendPatterns === true;

  if (
    !take?.trim() ||
    !structureMap?.trim() ||
    !PLATFORMS.includes(platform) ||
    !PILLARS.includes(pillar) ||
    !EMOTIONS.includes(emotion) ||
    !HOOK_FORMATS.includes(hookFormat) ||
    (platform === "YouTube" && !STORY_STRUCTURES.includes(storyStructure))
  ) {
    return NextResponse.json({ error: "Missing take, structure map, or Packaging Gate fields" }, { status: 400 });
  }

  const [corrections, hookExamples, chunks] = await Promise.all([
    fetchVoiceCorrections(supabase),
    fetchHookExamples(supabase, hookFormat, emotion),
    accessToken
      ? fetchKnowledgeChunks(supabase, process.env.NEXT_PUBLIC_SUPABASE_URL!, accessToken, take, emotion)
      : Promise.resolve([]),
  ]);

  const system = SCRIPT_SKILL_SYSTEM_PROMPT + voiceCorrectionsBlock(corrections);

  // Only when explicitly toggled on: pull a short summary of the Vault's Winning
  // Formula as supplementary grounding alongside the source structure.
  let winningBlock = "";
  if (blendPatterns) {
    const { data: allScripts } = await supabase.from("scripts").select("*");
    const all = (allScripts ?? []) as Script[];
    const amazingIds = new Set(
      [...computeOutliers(all).entries()]
        .filter(([, o]) => o.established && o.tier === "Amazing")
        .map(([id]) => id)
    );
    const formula = winningFormula(all, amazingIds);
    if (formula) {
      winningBlock =
        `\nMY WINNING FORMULA (supplementary — my own top performers share this combo; lean toward it only where it doesn't fight the source structure):\n` +
        formula.shared.map((s) => `- ${s.field}: ${s.value}`).join("\n");
    }
  }

  const prompt = [
    `This is a Transcript-to-Remix job. You are given a STRUCTURAL SKELETON pulled from a proven video, plus Nate's OWN take on a topic. Build a new ${platform} script that follows the proven structure but carries entirely Nate's material — never the source creator's content.`,
    ``,
    `STRUCTURAL SKELETON (scaffolding only — reuse the shape, not the subject):`,
    structureMap.trim(),
    ``,
    `NATE'S TAKE (this is the actual content of the new script):`,
    take.trim(),
    ``,
    `PACKAGING GATE (confirmed):`,
    `- Platform: ${platform}`,
    `- Lane: ${pillar}${pillarSecondary ? ` + ${pillarSecondary} (secondary)` : ""}`,
    `- Target Emotion: ${emotion}`,
    `- Hook Format: ${hookFormat}`,
    ...(platform === "YouTube" ? [`- Story Structure: ${storyStructure}`] : []),
    ``,
    hookExamples.length
      ? `REFERENCE HOOKS (matching this format and emotion — raw material, don't copy verbatim):\n${hookExamples.map((h) => `- ${h}`).join("\n")}`
      : ``,
    chunks.length
      ? `\nRELEVANT STRATEGY NOTES:\n${chunks.map((c) => `[${c.source}]\n${c.content}`).join("\n\n")}`
      : ``,
    winningBlock,
    ``,
    `Write the ${platform} script now, in the exact ${platform} output format.`,
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
      title: (title?.trim() || take.trim().slice(0, 80)) as string,
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
    return NextResponse.json({ error: `Draft generated but save failed: ${insertError.message}`, draft }, { status: 500 });
  }
  return NextResponse.json({ id: data.id });
}
