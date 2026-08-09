// Tier 2 (structured hook lookup) + Tier 3 (vector retrieval) + Voice Correction Log.
// Each generation call pulls only what's relevant — never whole tables or documents.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Emotion, HookFormat } from "@/lib/scripts";
import type { VoiceCorrection } from "./systemPrompt";

// hooks.category values from the imported CSV, mapped to the frameworks that select them
const FORMAT_CATEGORIES: Record<HookFormat, string[]> = {
  "Secret Reveal": ["All Curiosity-Driven Hooks", "All Tips and Tricks Hooks", "All Shocking Truths & Discoveries Hooks"],
  "Case Study": ["Authority & Expertise Hooks", "All Storytelling Hooks", "100 Alex Hormozi Hooks"],
  Comparison: ["All Educational Hooks", "All Problem-Solving Hooks"],
  Question: ["All Question-Based Hooks"],
  Education: ["All Educational Hooks", "All Tips and Tricks Hooks", "All List-Based Hooks"],
  Problem: ["All Problem-Solving Hooks", "All Relatable Hooks"],
  Contrarian: ["All Shocking Truths & Discoveries Hooks", "High Impact Scroll-Stoppers", "100 Alex Hormozi Hooks"],
  "Personal Experience": ["All Storytelling Hooks", "All Relatable Hooks", "All Inspirational and Motivational Hooks"],
  "Fortune Teller": ["All Trending Topics & Current Events Hooks", "All Curiosity-Driven Hooks"],
  Experimenter: ["All Curiosity-Driven Hooks", "All Shocking Truths & Discoveries Hooks", "High Impact Scroll-Stoppers"],
};

const EMOTION_CATEGORIES: Record<Emotion, string[]> = {
  Awe: ["All Inspirational and Motivational Hooks", "All Shocking Truths & Discoveries Hooks"],
  Humor: ["All Relatable Hooks"],
  Excitement: ["High Impact Scroll-Stoppers", "All Trending Topics & Current Events Hooks"],
  Anger: ["All Shocking Truths & Discoveries Hooks", "High Impact Scroll-Stoppers"],
  Shock: ["All Shocking Truths & Discoveries Hooks", "High Impact Scroll-Stoppers", "All Curiosity-Driven Hooks"],
  Empathy: ["All Relatable Hooks", "All Storytelling Hooks", "All Inspirational and Motivational Hooks"],
};

/** Tier 2: pull the top matching hook examples for the selected format + emotion. */
export async function fetchHookExamples(
  supabase: SupabaseClient,
  hookFormat: HookFormat,
  emotion: Emotion,
  limit = 15
): Promise<string[]> {
  const categories = [...new Set([...FORMAT_CATEGORIES[hookFormat], ...EMOTION_CATEGORIES[emotion]])];
  const { data, error } = await supabase
    .from("hooks")
    .select("content, example")
    .in("category", categories)
    .limit(limit * 4);
  if (error || !data) return [];

  // deterministic-ish spread across categories without pulling the whole table
  const shuffled = data.sort(() => Math.random() - 0.5).slice(0, limit);
  return shuffled.map((h) => (h.example ? `${h.content} (e.g. "${h.example}")` : h.content));
}

/** Tier 3: embed the topic + emotion, pull the top matching knowledge chunks. */
export async function fetchKnowledgeChunks(
  supabase: SupabaseClient,
  supabaseUrl: string,
  accessToken: string,
  topic: string,
  emotion: string,
  count = 4
): Promise<{ source: string; content: string }[]> {
  const res = await fetch(`${supabaseUrl}/functions/v1/embed`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ texts: [`${topic}. Target emotion: ${emotion}`] }),
  });
  if (!res.ok) return [];
  const { embeddings } = await res.json();

  const { data, error } = await supabase.rpc("match_knowledge_chunks", {
    query_embedding: embeddings[0],
    match_count: count,
  });
  if (error || !data) return [];
  return data.map((d: { source: string; content: string }) => ({
    source: d.source,
    content: d.content,
  }));
}

/** Voice Correction Log — all active entries, capped at the 30 most recent/most reinforced. */
export async function fetchVoiceCorrections(supabase: SupabaseClient): Promise<VoiceCorrection[]> {
  const { data } = await supabase
    .from("voice_corrections")
    .select("rule, reinforced_count")
    .eq("active", true)
    .order("reinforced_count", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(30);
  return data ?? [];
}
