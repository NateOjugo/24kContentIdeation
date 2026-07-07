// Option lists mirror the Postgres enums created in the scripts table migration.

export const PLATFORMS = ["Reels", "YouTube"] as const;
export const CONTENT_SERIES = [
  "Stewardship Season",
  "Winners Wednesday",
  "100 Ways to Be Active",
  "Lost Lifts",
  "TRAIN LIKE",
  "The Algorithm",
  "Other",
] as const;
export const PILLARS = ["TRAIN", "FAITH", "BUILD", "Cultural Commentary"] as const;
export const EMOTIONS = ["Awe", "Humor", "Excitement", "Anger", "Shock", "Empathy"] as const;
export const HOOK_FORMATS = [
  "Secret Reveal",
  "Case Study",
  "Comparison",
  "Question",
  "Education",
  "Problem",
  "Contrarian",
  "Personal Experience",
  "Fortune Teller",
] as const;
export const STORY_STRUCTURES = [
  "Breakdown",
  "Problem Solver",
  "Case Study",
  "Personal Story",
  "Newscaster",
  "Listicle",
  "Tutorial",
] as const;
export const CTA_TYPES = ["Native Embed", "None"] as const;

export type Platform = (typeof PLATFORMS)[number];
export type ContentSeries = (typeof CONTENT_SERIES)[number];
export type Pillar = (typeof PILLARS)[number];
export type Emotion = (typeof EMOTIONS)[number];
export type HookFormat = (typeof HOOK_FORMATS)[number];
export type StoryStructure = (typeof STORY_STRUCTURES)[number];
export type CtaType = (typeof CTA_TYPES)[number];

export type Script = {
  id: string;
  title: string;
  platform: Platform;
  content_series: ContentSeries | null;
  pillar: Pillar;
  pillar_secondary: Pillar | null;
  target_emotion: Emotion;
  hook_format: HookFormat | null;
  story_structure: StoryStructure | null;
  shock_value_score: number | null;
  loop_open: string | null;
  loop_close: string | null;
  re_hook_count: number | null;
  cta_type: CtaType | null;
  full_script_text: string | null;
  original_draft_text: string | null;
  caption: string | null;
  date_posted: string | null;
  click_confirmation_passed: boolean | null;
  atomic_shareability_present: boolean | null;
  hook_commandments_passed: boolean | null;
  dopamine_ladder_used: boolean | null;
  album_strategy_confirmed: boolean | null;
  views: number | null;
  followers_gained: number | null;
  saves: number | null;
  shares: number | null;
  likes: number | null;
  comments: number | null;
  retention_pct: number | null;
  winning: boolean;
  post_mortem_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ScriptInput = Omit<Script, "id" | "created_at" | "updated_at">;

export const SHOCK_VALUE_THRESHOLD = 80;

export function formatCount(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}
