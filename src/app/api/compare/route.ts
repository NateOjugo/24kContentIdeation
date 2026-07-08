import { NextResponse } from "next/server";
import { requireUser } from "@/lib/generation/routeAuth";
import { anthropicConfigured, getClient } from "@/lib/generation/anthropic";
import { ANALYSIS_MODEL } from "@/lib/models.config";
import { computeOutliers } from "@/lib/outlier";
import { performanceScore, type Script } from "@/lib/scripts";
import type Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 120;

// Compare Scripts diagnostic — plain-language explanation of the performance gap
// between 2+ logged, performance-tracked scripts. Analysis task -> ANALYSIS_MODEL.
export async function POST(req: Request) {
  const { supabase, error } = await requireUser();
  if (error) return error;
  if (!anthropicConfigured()) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured yet — set it in the environment." },
      { status: 503 }
    );
  }

  const { ids } = await req.json();
  if (!Array.isArray(ids) || ids.length < 2) {
    return NextResponse.json({ error: "Pick at least two scripts to compare." }, { status: 400 });
  }

  const { data } = await supabase.from("scripts").select("*").in("id", ids);
  const scripts = (data ?? []) as Script[];
  if (scripts.length < 2) {
    return NextResponse.json({ error: "Could not load the selected scripts." }, { status: 400 });
  }

  // Outlier tier is computed against the global median.
  const { data: baseline } = await supabase.from("scripts").select("id, views, save_rate, share_rate");
  const outliers = computeOutliers(baseline ?? []);

  const describe = (s: Script) => {
    const o = outliers.get(s.id);
    const gate = (b: boolean | null) => (b === true ? "pass" : b === false ? "fail" : "n/a");
    return [
      `### ${s.title}`,
      `Platform: ${s.platform} | Lane: ${s.pillar}${s.pillar_secondary ? ` + ${s.pillar_secondary}` : ""} | Emotion: ${s.target_emotion}`,
      `Hook Format: ${s.hook_format ?? "—"} | Story Structure: ${s.story_structure ?? "—"} | Series: ${s.content_series ?? "—"}`,
      `Shock Value: ${s.shock_value_score ?? "—"} | Loop opens: ${s.loop_open ?? "—"} | Loop closes: ${s.loop_close ?? "—"} | CTA: ${s.cta_type ?? "—"} | Re-hooks: ${s.re_hook_count ?? "—"}`,
      `Quality Gate — Click Confirmation: ${gate(s.click_confirmation_passed)}, Hook Commandments: ${gate(s.hook_commandments_passed)}, Atomic Shareability: ${gate(s.atomic_shareability_present)}, Dopamine Ladder: ${gate(s.dopamine_ladder_used)}, Album Strategy: ${gate(s.album_strategy_confirmed)}`,
      `Performance — Views: ${s.views ?? "—"}, Retention: ${s.retention_rate ?? "—"}%, Save rate: ${s.save_rate ?? "—"}%, Share rate: ${s.share_rate ?? "—"}%, Like rate: ${s.like_rate ?? "—"}%, Skip rate: ${s.skip_rate ?? "—"}%, Comments: ${s.comments ?? "—"}, Followers: ${s.followers_gained ?? "—"}`,
      `Outlier: ${o?.established ? o.label : "baseline not established"} | Composite perf score: ${performanceScore(s)?.toFixed(1) ?? "—"}`,
    ].join("\n");
  };

  const prompt = [
    `Below are ${scripts.length} of Nate's 24K scripts with their framework tags, quality gate results, and real performance metrics. Diagnose the likely cause of the performance gap between them.`,
    `Focus on which concrete differences most plausibly drove the gap — hook format, emotion, structure, quality-gate misses, shock value, retention vs save/share behavior. Save rate and share rate are the primary signals; retention shows whether the body held. Be specific and reference the actual tags and numbers. 4-6 sentences, plain language, no preamble.`,
    ``,
    scripts.map(describe).join("\n\n"),
  ].join("\n");

  try {
    const client = getClient();
    const response = await client.messages.create({
      model: ANALYSIS_MODEL,
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    });
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    return NextResponse.json({ explanation: text });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
