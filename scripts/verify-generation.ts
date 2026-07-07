// End-to-end generation verification. Exercises the real pipeline:
// Tier 2 hooks + Tier 3 knowledge retrieval + the real system prompt + the
// claude-fable-5 call with server-side fallback. Run: node scripts/verify-generation.ts
import Anthropic from "@anthropic-ai/sdk";
import { authedClient, embedTexts } from "./lib.mjs";
import { SCRIPT_SKILL_SYSTEM_PROMPT } from "../src/lib/generation/systemPrompt.ts";

const { supabase, url, accessToken } = await authedClient();

// --- Tier 2: hooks for Contrarian + Shock ---
const { data: hooks } = await supabase
  .from("hooks")
  .select("content, example")
  .in("category", ["All Shocking Truths & Discoveries Hooks", "High Impact Scroll-Stoppers"])
  .limit(10);
console.log(`Tier 2: pulled ${hooks?.length ?? 0} hook examples`);

// --- Tier 3: knowledge chunks for the topic ---
const topic = "cold showers rewire your nervous system for discipline";
const [emb] = await embedTexts(url, accessToken, [`${topic}. Target emotion: Shock`]);
const { data: chunks } = await supabase.rpc("match_knowledge_chunks", {
  query_embedding: emb,
  match_count: 3,
});
console.log(`Tier 3: retrieved ${chunks?.length ?? 0} knowledge chunks`);

// --- Real generation call ---
const client = new Anthropic();
const prompt = [
  "PACKAGING GATE (confirmed):",
  "- Platform: Reels",
  `- Topic: ${topic}`,
  "- Lane: FAITH",
  "- Target Emotion: Shock",
  "- Hook Format: Contrarian",
  "",
  `REFERENCE HOOKS:\n${(hooks ?? []).map((h) => `- ${h.content}`).join("\n")}`,
  "",
  `RELEVANT STRATEGY NOTES:\n${(chunks ?? []).map((c: { source: string; content: string }) => `[${c.source}]\n${c.content}`).join("\n\n")}`,
  "",
  "Write the Reels script now, in the exact Reels output format.",
].join("\n");

console.log("\nCalling claude-fable-5 (this can take a minute)…\n");
const response = await client.beta.messages.create({
  model: "claude-fable-5",
  max_tokens: 8000,
  betas: ["server-side-fallback-2026-06-01"],
  fallbacks: [{ model: "claude-opus-4-8" }],
  output_config: { effort: "high" },
  system: SCRIPT_SKILL_SYSTEM_PROMPT,
  messages: [{ role: "user", content: prompt }],
});

console.log("stop_reason:", response.stop_reason);
console.log("served by model:", response.model);
const text = response.content
  .filter((b) => b.type === "text")
  .map((b) => (b as { text: string }).text)
  .join("\n");
console.log("\n===== GENERATED SCRIPT =====\n");
console.log(text);
console.log("\n===== END =====");
console.log("\nformat check — contains TARGET EMOTION:", text.includes("TARGET EMOTION"),
  "| HOOK:", /HOOK/i.test(text), "| CLOSING PUNCH:", /CLOSING PUNCH/i.test(text),
  "| no em dash:", !text.includes("—"));
