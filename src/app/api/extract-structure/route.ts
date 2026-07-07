import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { requireUser } from "@/lib/generation/routeAuth";
import { anthropicConfigured, getClient, GENERATION_MODEL } from "@/lib/generation/anthropic";
import { HOOK_FORMATS, STORY_STRUCTURES } from "@/lib/scripts";

export const maxDuration = 180;

// Feature 9 step 1: separate STRUCTURE from CONTENT. A structural map only —
// not a summary of what was said.
const StructureSchema = z.object({
  hook_format: z.enum(HOOK_FORMATS),
  story_structure: z.enum(STORY_STRUCTURES).nullable(),
  hook_breakdown: z.string(),
  rehook_placement: z.string(),
  dopamine_ladder_pacing: z.string(),
  shock_value_angle: z.string(),
  structural_map: z.string(),
});

export async function POST(req: Request) {
  const { error } = await requireUser();
  if (error) return error;
  if (!anthropicConfigured()) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured yet — set it in the environment." },
      { status: 503 }
    );
  }

  const { transcript } = await req.json();
  if (!transcript?.trim() || transcript.trim().length < 100) {
    return NextResponse.json({ error: "Paste a fuller transcript (100+ chars)" }, { status: 400 });
  }

  const client = getClient();
  const response = await client.messages.parse({
    model: GENERATION_MODEL,
    max_tokens: 3000,
    output_config: { format: zodOutputFormat(StructureSchema) },
    system:
      "You are a structural analyst for the 24K brand. Given a video transcript, extract ONLY its structure — the scaffolding, not the content. Identify: the Hook Format used (from the 9 formats), the Story Structure if it's long-form (else null), how the hook is built (the S1 context lean / S2 scroll stop / S3 contrarian snapback beats), where re-hooks are placed between points, how the dopamine ladder is paced (where micro-wins land), and the general shock-value angle. structural_map is a compact reusable skeleton (beat-by-beat) that could carry ENTIRELY different subject matter. Never summarize what the creator actually said — describe how they said it.",
    messages: [{ role: "user", content: `TRANSCRIPT:\n${transcript.trim()}` }],
  });

  if (!response.parsed_output) {
    return NextResponse.json({ error: "Could not extract structure" }, { status: 502 });
  }
  return NextResponse.json(response.parsed_output);
}
