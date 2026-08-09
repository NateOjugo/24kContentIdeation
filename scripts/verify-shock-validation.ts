// Verifies the Step 2 gate validator against real stored drafts rather than
// synthetic strings. Run: node scripts/verify-shock-validation.ts
import { parseShockFactsUsed, validateShockFacts } from "../src/lib/hooksBank.ts";
import { authedClient } from "./lib.mjs";

const { supabase } = await authedClient();

const { data: scripts } = await supabase
  .from("scripts")
  .select("id, title, original_draft_text")
  .not("original_draft_text", "is", null)
  .order("created_at", { ascending: false })
  .limit(6);

const { data: facts } = await supabase
  .from("shock_value_facts")
  .select("*")
  .gte("shock_score", 80);

console.log(`bank facts (80+): ${facts?.length ?? 0}\n`);

let parsedTotal = 0;
for (const s of scripts ?? []) {
  const used = parseShockFactsUsed(s.original_draft_text);
  parsedTotal += used.length;
  console.log(`— ${s.title.slice(0, 52)}`);
  if (!used.length) {
    console.log("    (no SHOCK VALUE FACTS USED block parsed)");
  }
  for (const u of used) {
    console.log(`    [${u.score ?? "no score"}] ${u.fact.slice(0, 72)}`);
  }
  const warnings = validateShockFacts(used, facts ?? []);
  for (const w of warnings) console.log(`    ⚠ ${w}`);
  console.log();
}

// Negative controls: the validator must actually fire on bad input.
console.log("=== negative controls ===");
const cases: [string, string][] = [
  ["sub-80 score", "SHOCK VALUE FACTS USED: Some weak observation nobody disputes (61)\nSTORY STRUCTURE: x"],
  ["unscored prose (should NOT warn)", "SHOCK VALUE FACTS USED: An unverifiable claim with no score at all\nSTORY STRUCTURE: x"],
  ["score with trailing commentary", "SHOCK VALUE FACTS USED: Some weak claim (58) — the anchor for this script\nSTORY STRUCTURE: x"],
  ["annotated score", "SHOCK VALUE FACTS USED: Another weak claim (44, original)\nSTORY STRUCTURE: x"],
  [
    "score inflated vs bank",
    "SHOCK VALUE FACTS USED: David killed a lion and a bear with his bare hands before facing Goliath (99)\nSTORY STRUCTURE: x",
  ],
  [
    "legit generated fact (should NOT warn)",
    "SHOCK VALUE FACTS USED: A brand new fact this niche has never seen before (88)\nSTORY STRUCTURE: x",
  ],
];
for (const [label, draft] of cases) {
  const w = validateShockFacts(parseShockFactsUsed(draft), facts ?? []);
  console.log(`${w.length ? "FIRED " : "quiet "} ${label}${w.length ? ` → ${w[0]}` : ""}`);
}

console.log(`\nparsed ${parsedTotal} fact citation(s) from ${scripts?.length ?? 0} real drafts`);
