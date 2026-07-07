// Verifies the shared Structure Analysis engine on a real finished 24K script.
// Mirrors src/lib/generation/analyze.ts exactly (same model, schema, prompt).
// Run: node --experimental-strip-types scripts/verify-analyze.ts
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod/v4";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

const PLATFORMS = ["Reels", "YouTube"] as const;
const PILLARS = ["TRAIN", "FAITH", "BUILD", "Cultural Commentary"] as const;
const EMOTIONS = ["Awe", "Humor", "Excitement", "Anger", "Shock", "Empathy"] as const;
const HOOK_FORMATS = ["Secret Reveal", "Case Study", "Comparison", "Question", "Education", "Problem", "Contrarian", "Personal Experience", "Fortune Teller"] as const;
const STORY_STRUCTURES = ["Breakdown", "Problem Solver", "Case Study", "Personal Story", "Newscaster", "Listicle", "Tutorial"] as const;
const CTA_TYPES = ["Native Embed", "None"] as const;

const Schema = z.object({
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
  hook_breakdown: z.string(),
  rehook_placement: z.string(),
  dopamine_ladder_pacing: z.string(),
  shock_value_angle: z.string(),
  structural_map: z.string(),
});

const script = `Everyone tells you cold showers build mental toughness.
But that's not what's happening in there.
The cold isn't training your mind. It's teaching your body who it answers to.
The second that water hits, your nervous system screams at you to move. That scream is a command, but you don't have to obey it.
So you stay planted. Ten seconds becomes twenty, your breathing slows, and your body learns that panic is a signal, not an order.
Scripture calls it the flesh. The flesh is loud, but loud was never the same as in charge.
Discipline isn't ignoring the flesh. It's the flesh learning who it answers to.`;

const OWN_SYSTEM = `You analyze Nate's own finished 24K script and detect its Framework Tags so the dashboard can auto-fill them. He wrote this script himself and wants the tool to read back its structure, not to hand-label it.
Detect every field from what is actually in the text. platform: Reels for a tight 30-60s single-loop piece, YouTube for long-form. pillar: TRAIN/FAITH/BUILD/Cultural Commentary; pillar_secondary null unless it borrows cultural gravity. target_emotion one of the six. hook_format one of nine. story_structure YouTube only else null. loop_open/loop_close one line each. shock_value_score 0-100. re_hook_count YouTube else null. cta_type Native Embed or None. suggested_title short. Plus hook_breakdown, rehook_placement, dopamine_ladder_pacing, shock_value_angle, structural_map (reusable skeleton).`;

const client = new Anthropic();
console.log("Analyzing a finished FAITH-lane Reel via claude-fable-5…\n");
const response = await client.messages.parse({
  model: "claude-fable-5",
  max_tokens: 3000,
  output_config: { format: zodOutputFormat(Schema) },
  system: OWN_SYSTEM,
  messages: [{ role: "user", content: `MY FINISHED SCRIPT:\n${script}` }],
});

const a = response.parsed_output;
if (!a) { console.error("no parsed output"); process.exit(1); }
console.log("AUTO-DETECTED FRAMEWORK TAGS:");
console.log("  platform:         ", a.platform);
console.log("  pillar:           ", a.pillar, a.pillar_secondary ? `(+${a.pillar_secondary})` : "");
console.log("  target_emotion:   ", a.target_emotion);
console.log("  hook_format:      ", a.hook_format);
console.log("  story_structure:  ", a.story_structure);
console.log("  shock_value_score:", a.shock_value_score);
console.log("  cta_type:         ", a.cta_type);
console.log("  loop_open:        ", a.loop_open);
console.log("  loop_close:       ", a.loop_close);
console.log("  suggested_title:  ", a.suggested_title);
console.log("\nSanity: Reels platform =", a.platform === "Reels", "| FAITH pillar =", a.pillar === "FAITH", "| story_structure null on Reels =", a.story_structure === null);
