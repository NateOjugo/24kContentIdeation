import Anthropic from "@anthropic-ai/sdk";
import { GENERATION_MODEL } from "@/lib/models.config";

// Model strings live ONLY in @/lib/models.config — never hardcode them here.
export function anthropicConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function getClient(): Anthropic {
  if (!anthropicConfigured()) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to .env.local and the Vercel project env."
    );
  }
  return new Anthropic();
}

/** One-shot generation call (Sonnet 5, from the model config). */
export async function generateText(opts: {
  system: string;
  prompt: string;
  maxTokens?: number;
  effort?: "low" | "medium" | "high" | "xhigh";
}): Promise<string> {
  const client = getClient();
  const response = await client.messages.create({
    model: GENERATION_MODEL,
    max_tokens: opts.maxTokens ?? 8000,
    system: opts.system,
    output_config: opts.effort ? { effort: opts.effort } : undefined,
    messages: [{ role: "user", content: opts.prompt }],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("Generation was declined by the model's safety system. Reword the idea and try again.");
  }

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
  if (!text) throw new Error("Model returned no text output.");
  return text;
}
