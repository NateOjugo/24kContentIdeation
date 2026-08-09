// One-time import: hooks_database_curated.csv -> hook_template_library.
// Curated subset of the Tier 2 swipe file, enriched with enum-mapped hook_format
// and curation flags. Usage: node scripts/import-hook-templates.mjs <csv>
import { readFileSync } from "node:fs";
import { authedClient } from "./lib.mjs";

const csvPath = process.argv[2];
if (!csvPath) {
  console.error("usage: node scripts/import-hook-templates.mjs <hooks_database_curated.csv>");
  process.exit(1);
}

// Must match hook_format_t exactly — anything else is a data error, not a row to coerce.
const HOOK_FORMATS = new Set([
  "Secret Reveal", "Case Study", "Comparison", "Question", "Education",
  "Problem", "Contrarian", "Personal Experience", "Fortune Teller", "Experimenter",
]);

// Same parser as import-hooks.mjs: quoted fields with embedded commas/newlines.
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const bool = (v) => String(v).trim().toLowerCase() === "true";

const rows = parseCsv(readFileSync(csvPath, "utf8"));
const header = rows.shift();
console.log("header:", header.join(" | "));
console.log("data rows:", rows.length);

const records = [];
const rejects = [];
rows.forEach((r, i) => {
  const [template, example, hook_format, source_category, niche_relevant, has_placeholder] = r;
  const t = (template ?? "").trim();
  const fmt = (hook_format ?? "").trim();
  if (!t) return rejects.push({ line: i + 2, why: "empty template" });
  if (!HOOK_FORMATS.has(fmt)) return rejects.push({ line: i + 2, why: `bad hook_format "${fmt}"`, t: t.slice(0, 50) });
  records.push({
    template: t,
    example: (example ?? "").trim() || null,
    hook_format: fmt,
    source_category: (source_category ?? "").trim() || null,
    niche_relevant: bool(niche_relevant),
    has_placeholder: bool(has_placeholder),
  });
});

if (rejects.length) {
  console.log(`\nREJECTED ${rejects.length} row(s):`);
  for (const r of rejects) console.log(`  line ${r.line}: ${r.why}${r.t ? ` — ${r.t}` : ""}`);
}
console.log("\nvalid records:", records.length);

const byFormat = {};
for (const r of records) byFormat[r.hook_format] = (byFormat[r.hook_format] ?? 0) + 1;
console.log("by hook_format:", byFormat);
console.log("niche_relevant:", records.filter((r) => r.niche_relevant).length);

const { supabase } = await authedClient();

// idempotent: clear and re-import so a re-run never doubles the library
const { error: delError } = await supabase
  .from("hook_template_library")
  .delete()
  .neq("id", "00000000-0000-0000-0000-000000000000");
if (delError) throw delError;

for (let i = 0; i < records.length; i += 200) {
  const batch = records.slice(i, i + 200);
  const { error } = await supabase.from("hook_template_library").insert(batch);
  if (error) throw new Error(`insert batch ${i}: ${error.message}`);
  console.log(`inserted ${Math.min(i + 200, records.length)}/${records.length}`);
}

const { count } = await supabase
  .from("hook_template_library")
  .select("*", { count: "exact", head: true });
console.log("hook_template_library now has", count, "rows");
