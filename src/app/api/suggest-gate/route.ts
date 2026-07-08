import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { requireUser } from "@/lib/generation/routeAuth";
import { anthropicConfigured, getClient } from "@/lib/generation/anthropic";
import { ANALYSIS_MODEL } from "@/lib/models.config";
import { rankBy } from "@/lib/patterns";
import { computeOutliers } from "@/lib/outlier";
import { EMOTIONS, HOOK_FORMATS, PILLARS, STORY_STRUCTURES, type Script } from "@/lib/scripts";

export const maxDuration = 120;

const SuggestionSchema = z.object({
  pillar: z.enum(PILLARS),
  pillar_secondary: z.enum(PILLARS).nullable(),
  target_emotion: z.enum(EMOTIONS),
  hook_format: z.enum(HOOK_FORMATS),
  story_structure: z.enum(STORY_STRUCTURES).nullable(),
  reasoning: z.string(),
});

export async function POST(req: Request) {
  const { supabase, error } = await requireUser();
  if (error) return error;
  if (!anthropicConfigured()) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured yet — set it in the environment." },
      { status: 503 }
    );
  }

  const { idea, platform } = await req.json();
  if (!idea?.trim() || !["Reels", "YouTube"].includes(platform)) {
    return NextResponse.json({ error: "idea and platform (Reels|YouTube) required" }, { status: 400 });
  }

  // Feature 3 data feeds the suggestion: what has historically won in the Vault
  const { data: scripts } = await supabase.from("scripts").select("*");
  const all = (scripts ?? []) as Script[];
  const amazingIds = new Set(
    [...computeOutliers(all).entries()]
      .filter(([, o]) => o.established && o.tier === "Amazing")
      .map(([id]) => id)
  );
  const summarize = (label: string, rows: ReturnType<typeof rankBy>) =>
    rows.length
      ? `${label}: ${rows
          .slice(0, 3)
          .map((r) => `${r.label} (avg performance ${(r.avgPerformance ?? 0).toFixed(1)}, n=${r.n})`)
          .join("; ")}`
      : null;
  const history = [
    summarize("Top hook formats", rankBy(all, (s) => s.hook_format, amazingIds)),
    summarize("Top emotions", rankBy(all, (s) => s.target_emotion, amazingIds)),
    summarize("Top pillars", rankBy(all, (s) => s.pillar, amazingIds)),
    summarize("Top structures", rankBy(all.filter((s) => s.platform === "YouTube"), (s) => s.story_structure, amazingIds)),
  ]
    .filter(Boolean)
    .join("\n");

  const client = getClient();
  const response = await client.messages.parse({
    model: ANALYSIS_MODEL,
    max_tokens: 2000,
    output_config: { format: zodOutputFormat(SuggestionSchema) },
    system:
      "You classify raw content ideas into the 24K brand's Packaging Gate. Lanes: TRAIN (training, Cold Iron authority), FAITH (spiritual, testimony, identity), BUILD (documenting the work/process), Cultural Commentary (recognizable cultural reference points). Suggest a secondary lane only when the idea clearly borrows cultural gravity (Audience Hacking). story_structure is null for Reels. Set reasoning to 2-3 sentences on why this combination fits, referencing the Vault history if it informed the choice.",
    messages: [
      {
        role: "user",
        content: `Platform: ${platform}\n\nRaw idea:\n${idea}\n\n${
          history ? `What has historically won in the Vault:\n${history}` : "No performance history logged yet."
        }`,
      },
    ],
  });

  if (!response.parsed_output) {
    return NextResponse.json({ error: "Could not parse a suggestion" }, { status: 502 });
  }
  return NextResponse.json(response.parsed_output);
}
