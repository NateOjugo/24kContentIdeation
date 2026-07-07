// One-time Tier 3 ingestion: reference docs -> chunk -> embed (gte-small edge fn) -> knowledge_chunks.
// Usage: node scripts/ingest-knowledge.mjs
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import mammoth from "mammoth";
import { authedClient, embedTexts } from "./lib.mjs";

const DOCS = [
  "/Users/nateojugo/Downloads/Kallaway's Guide To Lead Magnets.docx",
  "/Users/nateojugo/Downloads/personal brand playbook.pdf",
  "/Users/nateojugo/Downloads/script tips&tricks.pdf",
  "/Users/nateojugo/Downloads/series and content ideas.docx",
  // Not found on this machine (see BUILD_LOG.md): the_art_of_the_personal_brand.pdf, The_art_of_branding.pdf
];

async function extractText(path) {
  if (path.endsWith(".docx")) {
    const { value } = await mammoth.extractRawText({ path });
    return value;
  }
  if (path.endsWith(".pdf")) {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: readFileSync(path) });
    const result = await parser.getText();
    await parser.destroy();
    return result.text;
  }
  throw new Error(`unsupported file type: ${path}`);
}

function chunk(text, size = 1200, overlap = 150) {
  const cleaned = text.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
  const chunks = [];
  let start = 0;
  while (start < cleaned.length) {
    let end = Math.min(start + size, cleaned.length);
    if (end < cleaned.length) {
      // prefer to break on a paragraph or sentence boundary
      const para = cleaned.lastIndexOf("\n\n", end);
      const sentence = cleaned.lastIndexOf(". ", end);
      const brk = Math.max(para, sentence);
      if (brk > start + size / 2) end = brk + 1;
    }
    const c = cleaned.slice(start, end).trim();
    if (c.length > 50) chunks.push(c);
    if (end >= cleaned.length) break;
    start = end - overlap;
  }
  return chunks;
}

const { supabase, url, accessToken } = await authedClient();

// idempotent: clear and re-ingest
const { error: delError } = await supabase.from("knowledge_chunks").delete().gte("id", 0);
if (delError) throw delError;

let total = 0;
for (const path of DOCS) {
  const source = basename(path);
  let text;
  try {
    text = await extractText(path);
  } catch (e) {
    console.error(`SKIPPED ${source}: ${e.message}`);
    continue;
  }
  const chunks = chunk(text);
  console.log(`${source}: ${text.length} chars -> ${chunks.length} chunks`);

  const BATCH = 5; // small batches — the edge worker has tight compute limits
  for (let i = 0; i < chunks.length; i += BATCH) {
    const batch = chunks.slice(i, i + BATCH);
    let embeddings;
    for (let attempt = 1; ; attempt++) {
      try {
        embeddings = await embedTexts(url, accessToken, batch);
        break;
      } catch (e) {
        if (attempt >= 4) throw e;
        console.log(`  retry ${attempt} after: ${e.message.slice(0, 80)}`);
        await new Promise((r) => setTimeout(r, 2000 * attempt));
      }
    }
    const records = batch.map((content, j) => ({
      source,
      chunk_index: i + j,
      content,
      embedding: embeddings[j],
    }));
    const { error } = await supabase.from("knowledge_chunks").insert(records);
    if (error) throw new Error(`insert ${source} batch ${i}: ${error.message}`);
    process.stdout.write(`  embedded ${Math.min(i + BATCH, chunks.length)}/${chunks.length}\r`);
  }
  console.log();
  total += chunks.length;
}

const { count } = await supabase.from("knowledge_chunks").select("*", { count: "exact", head: true });
console.log(`done — ${total} chunks ingested, table has ${count} rows`);
