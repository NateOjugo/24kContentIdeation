import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { requireUser } from "@/lib/generation/routeAuth";
import { anthropicConfigured, getClient, GENERATION_MODEL } from "@/lib/generation/anthropic";

export const maxDuration = 180;

// Feature 7 cap/consolidation: when the log grows past the cap, merge/dedupe it into
// a tighter rule set so it doesn't grow unbounded and eat context on every call.
const ConsolidatedSchema = z.object({
  rules: z.array(z.string()).max(30),
});

export async function POST() {
  const { supabase, error } = await requireUser();
  if (error) return error;
  if (!anthropicConfigured()) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured yet — set it in the environment." },
      { status: 503 }
    );
  }

  const { data: existing } = await supabase
    .from("voice_corrections")
    .select("id, rule")
    .eq("active", true);

  if (!existing || existing.length < 2) {
    return NextResponse.json({ error: "Not enough corrections to consolidate." }, { status: 400 });
  }

  const client = getClient();
  const response = await client.messages.parse({
    model: GENERATION_MODEL,
    max_tokens: 4000,
    output_config: { format: zodOutputFormat(ConsolidatedSchema) },
    system:
      "You consolidate a list of voice-correction rules for the 24K brand into a tighter, deduplicated set. Merge rules that say the same thing, combine closely related rules, drop redundancy, and keep each rule concrete and actionable. Preserve every distinct instruction — do not lose a real pattern in the merge. Return the smallest set of rules that fully captures the input.",
    messages: [
      { role: "user", content: `Consolidate these voice rules:\n${existing.map((r) => `- ${r.rule}`).join("\n")}` },
    ],
  });

  const consolidated = response.parsed_output?.rules ?? [];
  if (consolidated.length === 0) {
    return NextResponse.json({ error: "Consolidation produced no rules — nothing changed." }, { status: 502 });
  }

  // Replace: deactivate old, insert consolidated. Keep old rows (inactive) for history.
  const { error: deactivateError } = await supabase
    .from("voice_corrections")
    .update({ active: false })
    .eq("active", true);
  if (deactivateError) {
    return NextResponse.json({ error: deactivateError.message }, { status: 500 });
  }

  const { error: insertError } = await supabase
    .from("voice_corrections")
    .insert(consolidated.map((rule) => ({ rule })));
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ before: existing.length, after: consolidated.length });
}
