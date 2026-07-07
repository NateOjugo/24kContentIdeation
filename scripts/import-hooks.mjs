// One-time Tier 2 import: hooks_database.csv -> hooks table.
// Usage: node scripts/import-hooks.mjs /path/to/hooks_database.csv
import { readFileSync } from "node:fs";
import { authedClient } from "./lib.mjs";

const csvPath = process.argv[2];
if (!csvPath) {
  console.error("usage: node scripts/import-hooks.mjs <hooks_database.csv>");
  process.exit(1);
}

// Minimal CSV parser handling quoted fields with embedded commas/newlines.
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

const rows = parseCsv(readFileSync(csvPath, "utf8"));
const header = rows.shift();
console.log("header:", header.join(","), "| data rows:", rows.length);

const records = [];
for (const r of rows) {
  if (r.length < 5) continue;
  let [category, content, example, source_file, tags] = r;
  content = content.trim();
  // skip markdown table headers/separators exported from Notion
  if (!content || content.startsWith("| ---") || /^\|\s*\*\*S\.?No\*\*/i.test(content)) continue;
  // unpack "| N | hook | example |" markdown rows
  const m = content.match(/^\|\s*\d+\s*\|(.+?)\|(.*?)\|?\s*$/);
  if (m) {
    content = m[1].trim();
    if (!example.trim() && m[2].trim()) example = m[2].trim();
  }
  if (!content) continue;
  records.push({
    category: category.trim(),
    content,
    example: example.trim() || null,
    source_file: source_file.trim() || null,
    tags: tags.trim() || null,
  });
}
console.log("clean records:", records.length);

const { supabase } = await authedClient();

// idempotent: clear and re-import
const { error: delError } = await supabase.from("hooks").delete().gte("id", 0);
if (delError) throw delError;

for (let i = 0; i < records.length; i += 500) {
  const batch = records.slice(i, i + 500);
  const { error } = await supabase.from("hooks").insert(batch);
  if (error) throw new Error(`insert batch ${i}: ${error.message}`);
  console.log(`inserted ${Math.min(i + 500, records.length)}/${records.length}`);
}

const { count } = await supabase.from("hooks").select("*", { count: "exact", head: true });
console.log("hooks table now has", count, "rows");
