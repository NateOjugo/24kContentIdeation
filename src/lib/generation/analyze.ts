import { z } from "zod/v4";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getClient, GENERATION_MODEL } from "./anthropic";
import {
  CTA_TYPES,
  EMOTIONS,
  HOOK_FORMATS,
  PILLARS,
  PLATFORMS,
  STORY_STRUCTURES,
} from "@/lib/scripts";

// THE shared Structure Analysis engine. One structured-output call that reads a
// piece of script text and returns its full framework map. Used by two callers:
//   - "own"        : Script Logger — analyze Nate's own finished script to
//                    auto-fill its Framework Tags.
//   - "transcript" : Transcript-to-Remix — analyze another creator's transcript
//                    to pull a reusable structural skeleton (how, not what).
// Same engine, same schema. The mode only changes the framing.

export const StructuralAnalysisSchema = z.object({
  // Framework Tags — the Script Logger pre-fills the form from these
  platform: z.enum(PLATFORMS),
  pillar: z.enum(PILLARS),
  pillar_secondary: z.enum(PILLARS).nullable(),
  target_emotion: z.enum(EMOTIONS),
  hook_format: z.enum(HOOK_FORMATS),
  story_structure: z.enum(STORY_STRUCTURES).nullable(),
  loop_open: z.string(),
  loop_close: z.string(),
  shock_value_score: z.number(),
  re_hook_count: z.number().nullable(),
  cta_type: z.enum(CTA_TYPES).nullable(),
  suggested_title: z.string(),
  // Structural scaffolding — Transcript-to-Remix reuses these (how, not what)
  hook_breakdown: z.string(),
  rehook_placement: z.string(),
  dopamine_ladder_pacing: z.string(),
  shock_value_angle: z.string(),
  structural_map: z.string(),
});

export type StructuralAnalysis = z.infer<typeof StructuralAnalysisSchema>;

const SHARED_RULES = `Detect every field from what is actually in the text — never invent tags the writing doesn't support.
- platform: "Reels" for a tight 30-60 second single-loop piece; "YouTube" for long-form with multiple points, re-hooks, or a title/thumbnail structure.
- pillar: TRAIN (training, Cold Iron authority), FAITH (spiritual, testimony, identity/transition), BUILD (documenting the work/process), Cultural Commentary (a recognizable cultural reference point). pillar_secondary only when the piece clearly borrows cultural gravity (Audience Hacking); otherwise null.
- target_emotion: one of Awe, Humor, Excitement, Anger, Shock, Empathy.
- hook_format: one of Secret Reveal, Case Study, Comparison, Question, Education, Problem, Contrarian, Personal Experience, Fortune Teller.
- story_structure: for YouTube only, one of Breakdown, Problem Solver, Case Study, Personal Story, Newscaster, Listicle, Tutorial. null for Reels.
- loop_open / loop_close: one line each — what tension the hook opens, and what line closes it.
- shock_value_score: 0-100. Visualize 100 people; how many have NOT heard this before? That number is the score.
- re_hook_count: for YouTube, count the re-hooks between points; null for Reels.
- cta_type: "Native Embed" if a next-step CTA is woven in as the logical solution; "None" if it just ends on the punchline.
- suggested_title: a short internal reference title.
- hook_breakdown: how the hook is built (the S1 context lean / S2 scroll stop / S3 contrarian snapback beats).
- rehook_placement: where attention resets happen between points.
- dopamine_ladder_pacing: where the micro-wins land.
- shock_value_angle: the core contrarian/shock angle in one line.
- structural_map: a compact beat-by-beat skeleton that could carry ENTIRELY different subject matter.`;

const OWN_SYSTEM = `You analyze Nate's own finished 24K script and detect its Framework Tags so the dashboard can auto-fill them. He wrote this script himself and wants the tool to read back its structure, not to hand-label it.
${SHARED_RULES}`;

const TRANSCRIPT_SYSTEM = `You are a structural analyst for the 24K brand. You are given ANOTHER creator's video transcript. Extract ONLY its structure — the scaffolding, not the content. Never summarize what the creator actually said; describe how they said it. The structural_map must be reusable to carry entirely different subject matter.
${SHARED_RULES}`;

export async function analyzeStructure(
  text: string,
  mode: "own" | "transcript"
): Promise<StructuralAnalysis> {
  const client = getClient();
  const response = await client.messages.parse({
    model: GENERATION_MODEL,
    max_tokens: 3000,
    output_config: { format: zodOutputFormat(StructuralAnalysisSchema) },
    system: mode === "own" ? OWN_SYSTEM : TRANSCRIPT_SYSTEM,
    messages: [
      {
        role: "user",
        content: `${mode === "own" ? "MY FINISHED SCRIPT" : "TRANSCRIPT"}:\n${text}`,
      },
    ],
  });

  if (!response.parsed_output) throw new Error("Structure analysis returned no result");
  const out = response.parsed_output;
  // clamp the score, null out YouTube-only fields on Reels
  out.shock_value_score = Math.max(0, Math.min(100, Math.round(out.shock_value_score)));
  if (out.platform === "Reels") {
    out.story_structure = null;
    out.re_hook_count = null;
  }
  return out;
}
