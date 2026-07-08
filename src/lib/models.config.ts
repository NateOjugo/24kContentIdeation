// ─────────────────────────────────────────────────────────────────────────────
// CENTRALIZED MODEL CONFIGURATION — SINGLE SOURCE OF TRUTH
//
// Every Anthropic API call in this app MUST import its model from here.
// Do not hardcode a model string anywhere else in the codebase.
//
// If "claude-fable-5" or "claude-opus-4-8" appears ANYWHERE outside this file,
// that is a bug — flag it and route it through this config.
//
// Why NOT Fable 5 or Opus 4.8:
//   Fable 5 is priced at $10/M input and $50/M output tokens — by far the most
//   expensive model available. This is a script-writing tool, and Sonnet 5
//   already matches or exceeds Fable on knowledge-work-type tasks at a fraction
//   of the cost. There is no task in this app that justifies Fable/Opus pricing.
//
// Split:
//   GENERATION_MODEL — script writing (Sonnet 5, strong knowledge-work quality)
//   ANALYSIS_MODEL   — structured classification/extraction (Haiku 4.5, cheap + fast)
// ─────────────────────────────────────────────────────────────────────────────

/** Generation tasks: Feature 8 (In-Dashboard Generation), Feature 9 (Remix),
 *  Feature 10 (Pattern Testing Loop). */
export const GENERATION_MODEL = "claude-sonnet-5";

/** Analysis / classification tasks: Structure Extraction, auto-tagging on paste,
 *  Quality Gate auto-detection, Compare Scripts diagnostic, voice-log extraction/
 *  consolidation, and Packaging Gate suggestion. */
export const ANALYSIS_MODEL = "claude-haiku-4-5-20251001";
