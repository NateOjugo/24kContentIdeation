import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { requireUser } from "@/lib/generation/routeAuth";
import { anthropicConfigured, getClient, GENERATION_MODEL } from "@/lib/generation/anthropic";
import type { Script } from "@/lib/scripts";

export const maxDuration = 180;

// Feature 7: "Learn from Edit" — extract concrete, repeatable voice rules from the
// diff between the generated draft and Nate's final edit. Specific edits, not "sound more natural."
const RulesSchema = z.object({
  rules: z.array(z.string()).max(8),
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

  const { scriptId } = await req.json();
  const { data } = await supabase.from("scripts").select("*").eq("id", scriptId).single();
  if (!data) return NextResponse.json({ error: "Script not found" }, { status: 404 });
  const s = data as Script;

  if (!s.original_draft_text?.trim() || !s.full_script_text?.trim()) {
    return NextResponse.json(
      { error: "This needs both an Original Draft and a Final edited script to learn from." },
      { status: 400 }
    );
  }

  const client = getClient();
  const response = await client.messages.parse({
    model: GENERATION_MODEL,
    max_tokens: 2000,
    output_config: { format: zodOutputFormat(RulesSchema) },
    system:
      "You extract voice-correction rules for the 24K brand by diffing a generated draft against Nate's final edit. Output ONLY concrete, repeatable, actionable rules describing specific patterns in how Nate edits — word swaps he consistently makes, sentence structures he cuts, punctuation he changes, openings/closings he rewrites, phrasings he removes. Each rule must be specific enough to apply to a future script (e.g. 'Cut hedging openers like \"I think\" and \"maybe\" — Nate starts on the assertion'). Never vague notes like 'sound more natural' or 'improve flow'. If the two versions are nearly identical, return an empty array. Do not invent rules that aren't evidenced by the diff.",
    messages: [
      {
        role: "user",
        content: `GENERATED DRAFT:\n${s.original_draft_text}\n\n---\n\nNATE'S FINAL EDIT:\n${s.full_script_text}`,
      },
    ],
  });

  const rules = response.parsed_output?.rules ?? [];
  if (rules.length === 0) {
    return NextResponse.json({ added: 0, rules: [] });
  }

  const rows = rules.map((rule) => ({ rule, source_script_id: s.id }));
  const { error: insertError } = await supabase.from("voice_corrections").insert(rows);
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }
  return NextResponse.json({ added: rules.length, rules });
}
