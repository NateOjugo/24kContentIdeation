import { NextResponse } from "next/server";
import { requireUser } from "@/lib/generation/routeAuth";
import { anthropicConfigured, generateText } from "@/lib/generation/anthropic";
import { SCRIPT_SKILL_SYSTEM_PROMPT, voiceCorrectionsBlock } from "@/lib/generation/systemPrompt";
import { fetchVoiceCorrections } from "@/lib/generation/retrieval";
import type { Script } from "@/lib/scripts";

export const maxDuration = 300;

// "Clip This Down": on-demand Reels cut from a finished YouTube script (Feature 8).
export async function POST(req: Request) {
  const { supabase, error } = await requireUser();
  if (error) return error;
  if (!anthropicConfigured()) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured yet — set it in the environment." },
      { status: 503 }
    );
  }

  const { scriptId } = await req.json();
  const { data } = await supabase.from("scripts").select("*").eq("id", scriptId).single();
  if (!data) return NextResponse.json({ error: "Script not found" }, { status: 404 });
  const source = data as Script;

  if (source.platform !== "YouTube") {
    return NextResponse.json({ error: "Clip This Down only applies to YouTube scripts" }, { status: 400 });
  }
  const sourceText = source.full_script_text || source.original_draft_text;
  if (!sourceText) {
    return NextResponse.json({ error: "This script has no text to clip from" }, { status: 400 });
  }

  const corrections = await fetchVoiceCorrections(supabase);
  const system = SCRIPT_SKILL_SYSTEM_PROMPT + voiceCorrectionsBlock(corrections);

  const prompt = [
    `Below is a finished 24K YouTube script. Pull a Reels-format cut from it.`,
    `Find the single strongest self-contained moment (the most atomic-shareable point), rebuild it as a 30-60 second Reel with its own single loop, and deliver it in the exact REELS OUTPUT FORMAT.`,
    `Keep the Packaging Gate: Lane ${source.pillar}${source.pillar_secondary ? ` + ${source.pillar_secondary}` : ""}, Target Emotion ${source.target_emotion}. Choose the Hook Format that best fits the extracted moment.`,
    ``,
    `SOURCE SCRIPT ("${source.title}"):`,
    sourceText,
  ].join("\n");

  let cut: string;
  try {
    cut = await generateText({ system, prompt, effort: "high" });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }

  const hookFormatMatch = cut.match(/HOOK FORMAT:\s*(.+)/i)?.[1]?.trim();
  const validFormats = ["Secret Reveal", "Case Study", "Comparison", "Question", "Education", "Problem", "Contrarian", "Personal Experience", "Fortune Teller"];

  const { data: created, error: insertError } = await supabase
    .from("scripts")
    .insert({
      title: `${source.title} — Reels cut`,
      platform: "Reels",
      pillar: source.pillar,
      pillar_secondary: source.pillar_secondary,
      target_emotion: source.target_emotion,
      hook_format: validFormats.includes(hookFormatMatch ?? "") ? hookFormatMatch : source.hook_format,
      content_series: source.content_series,
      original_draft_text: cut,
    })
    .select("id")
    .single();

  if (insertError) {
    return NextResponse.json({ error: `Cut generated but save failed: ${insertError.message}`, draft: cut }, { status: 500 });
  }
  return NextResponse.json({ id: created.id });
}
