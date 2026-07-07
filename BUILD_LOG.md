# 24K Script Vault — Build Log

## Phase 0 — Foundation ✅ (2026-07-06)

**Built:**
- Supabase project `24k-script-vault` (ref `zsyazcquundngmdrnzha`, us-east-1, free tier $0/mo) — separate from the HHA- Website project
- `scripts` table with typed enums for every Packaging Gate select field, Quality Gate snapshot booleans, performance columns, generated `search_tsv` full-text column + GIN index, `updated_at` trigger, RLS restricted to authenticated users
- Next.js 16 (App Router, TypeScript, Tailwind v4) in `/Users/nateojugo/24k-script-vault`
- Design tokens in `globals.css` per brand spec: navy-deep `#0A1628`, navy-mid `#0F1E33`, gold `#C9A84C`, cream `#F0EDE6`, steel `#8A8578`; Bebas Neue display + Inter body via next/font; `.accent-card` gold accent-line card pattern lifted from `24K_Brand_Architecture_Map.jsx`
- Supabase Auth (email/password) with `@supabase/ssr`, session guard in `src/proxy.ts` (Next 16 middleware convention)
- User account created and email-confirmed: nateojugo45@gmail.com — credentials in `LOGIN_CREDENTIALS.txt` (gitignored). **Change this password after first login.**
- Deployed: https://24k-script-vault.vercel.app (Vercel project `24k-script-vault`, env vars set for production)

**Verified:** local build passes; sign-in → dashboard → live scripts count (0) confirmed in browser; production URL redirects unauthenticated traffic to /login and renders the login page.

**Decisions / notes:**
- New Supabase project rather than reusing HHA- Website — keeps 24K personal-brand data fully separate from agency data. Cost $0.
- Added `pillar_secondary` column to support the Script Skill's "Pillar Blending" (primary + secondary lane) even though the spec table lists a single Pillar field.
- Supabase signups remain enabled (needed to create the account via API). RLS only grants access to authenticated users; consider disabling signups in the Supabase dashboard (Auth → Providers → Email) since this is single-user.
- `ANTHROPIC_API_KEY` placeholder added to `.env.local` — **Nate must paste a real key before Phase 3 generation works.** It will also need to be added to Vercel env at that point.

**Open items for Nate:**
- Two Tier 3 reference docs were not found on this machine: `the_art_of_the_personal_brand.pdf` and `The_art_of_branding.pdf`. Found and will use: Kallaway's Guide To Lead Magnets.docx, personal brand playbook.pdf, script tips&tricks.pdf, series and content ideas.docx (Downloads). Drop the two missing PDFs into `~/Desktop/24k-script-vault/` if you want them in the knowledge base.
- Hooks database: using `hooks_database.csv` found in a prior Claude session workspace (matches the expected category/content/example/source_file/tags columns, ~2,490 rows). Original appears to be `hooksdatabse.numbers` in iCloud Numbers. Will clean junk rows (markdown table separators) during Phase 3 import.

## Phase 1 — Script Logger + Vault ✅ (2026-07-06)

**Built:**
- `/log` — Script Logger form (`src/components/ScriptForm.tsx`, reused for edit + later Repeat Builder prefill). Packaging Gate enforced client-side: no save without Title, Platform, Pillar, Target Emotion, Hook Format, and Story Structure when platform is YouTube. Live "gate still needs" hint under the save button. Shock Value warning when below 80. YouTube-only fields (Story Structure, Re-Hook Count, Dopamine Ladder, Album Strategy) appear only for YouTube and are nulled on save for Reels. Quality Gate toggles cycle Pass → Fail → Not set. Mobile: single column, sticky save bar.
- `/` — The Vault (`src/components/VaultBrowser.tsx`): script cards with framework tags, performance strip (views/saves/shares/followers), winning badge; full-text websearch against the `search_tsv` column; filters for Platform, Pillar (matches secondary lane too), Emotion, Hook Format, Structure, Series, and Winning-only.
- `/scripts/[id]` — detail view (performance, loop, final script, collapsed original draft, caption, quality gate, post-mortem) + `/scripts/[id]/edit`.

**Verified in browser:** logged a test script through the form (gate validation worked, insert + redirect to detail confirmed), full-text search matched script body text, emotion filter excluded/included correctly. Test row deleted afterward — Vault ships empty, no fake data.

## Phase 2 — Pattern Engine ✅ (2026-07-06)

**Built:** `/patterns` — server-rendered aggregation over the full scripts table (`src/lib/patterns.ts`):
- Rankings for Hook Formats, Story Structures (YouTube only), Target Emotions, Pillars, and Content Series — sorted by avg saves+shares (primary signal per spec), with avg followers gained, avg views, sample size N, and win count beside it. Top row highlighted gold.
- Winning Formula callout: takes the top 3 scripts by saves+shares and surfaces every framework attribute all three share, linking to the scripts.
- Shock Value Check: below-80 vs 80+ performance comparison plus a flagged list of under-threshold scripts.
- Honest empty state: engine refuses to rank until ≥3 scripts have performance data.

**Verified:** inserted 4 clearly-labeled VERIFY rows, confirmed rankings and Winning Formula math in the browser (avg saves+shares 2166→2.2K correct; formula correctly extracted Contrarian + Awe + TRAIN), then deleted them. Vault is empty again.

**Decisions:**
- Aggregation is computed in the server component from one `select *` rather than SQL views — dataset is personal-scale (hundreds of rows max), and TS keeps the weighting logic in one reviewable place. Can move to materialized views if the table ever gets big.
- **Seeding:** the Notion export (`~/Downloads/notion_import/SCRIPTS_DATABASE.csv`) uses a different taxonomy (MBS/ATHLETE pillars, Built Different/Temple Lens series) and `PERFORMANCE_TRACKER.csv` has no real numbers — only an example row. Rather than guess-map mislabeled data, the Vault ships empty. Nate: log your real past scripts (Stewardship Ep 1 & 2 first) with actual numbers and the Pattern Engine lights up.

## Phase 3 — In-Dashboard Generation + Knowledge Architecture ✅ wired (2026-07-06)

**Built the full Tier 1/2/3 knowledge architecture (Section 3 of the instructions):**
- **Tier 1** (`src/lib/generation/systemPrompt.ts`): the entire 24K Script Skill converted into the generation system prompt (Packaging Gate, Voice DNA, both output-format templates, 9 hook formats, 7 story structures, Quality Gate). Baked in on every call. Voice Correction Log appended, capped at 30 entries.
- **Tier 2** (`hooks` table + `src/lib/generation/retrieval.ts`): imported `hooks_database.csv` → 2,390 clean rows (junk markdown-separator rows stripped). On generation, queried by the selected Hook Format + Emotion via a category map — top ~15 examples passed in, never the whole table.
- **Tier 3** (`knowledge_chunks` pgvector table + `embed` edge function): one-time ingestion of 4 reference docs → 89 chunks embedded with gte-small (384-dim) via a Supabase edge function. Each generation embeds the topic+emotion and pulls the top 4 chunks via cosine similarity (`match_knowledge_chunks` RPC).
- `voice_corrections` table created (populated in Phase 5, already read by generation).

**Routes** (all server-side, auth-guarded, `ANTHROPIC_API_KEY` never exposed to client):
- `/api/suggest-gate` — AI-suggested Packaging Gate. Feeds Feature-3 Vault history (what's won) into a `claude-fable-5` structured-output call; returns pillar/emotion/hook-format/structure + reasoning.
- `/api/generate` — Idea Intake → assembles Tier 1+2+3 → `claude-fable-5` (server-side fallback to Opus 4.8 on refusal) → auto-saves as a new Vault entry with `original_draft_text` + pre-filled framework tags → redirects to the script.
- `/api/clip-down` — "Clip This Down": on-demand Reels cut from a finished YouTube script (secondary action, not automatic).
- `/generate` UI: Idea Intake → Suggest Packaging Gate (or set manually) → confirm/override → Generate.

**Verified:** Tier 2 category query returns rows; Tier 3 vector search returns relevant chunks (0.88 similarity on "how to write a viral hook"); embed edge function returns 384-dim vectors; all three API routes return 401 unauthenticated and `/generate` redirects to /login; production build passes with all routes.

**NOT yet verified (blocked): the actual generation call.** No `ANTHROPIC_API_KEY` is available on this machine, so a live idea→script generation has not been run end to end. The routes return a clear 503 ("ANTHROPIC_API_KEY is not configured yet") until the key is set — no fake output is produced. **Action for Nate:** paste your Anthropic API key into `.env.local` (`ANTHROPIC_API_KEY=...`) for local use, and add it to the Vercel project env (`24k-script-vault` → Settings → Environment Variables) for production. Then run one generation to confirm voice/format before relying on it.

## Phase 4 — Transcript-to-Remix Generator ✅ wired (2026-07-06)

**Built** (Feature 9 — reuses the Phase 3 pipeline with a different input path):
- `/api/extract-structure` — pastes a transcript, returns a STRUCTURAL MAP only (Hook Format, Story Structure, hook beat-breakdown, re-hook placement, dopamine-ladder pacing, shock-value angle, and a reusable beat-by-beat skeleton). Structured output via `claude-fable-5`. Explicitly instructed to describe *how* it was said, never *what* was said.
- `/api/remix` — combines [structure map] + [Nate's take] + Script Skill + hooks + knowledge + voice corrections → new script that's structurally proven but entirely Nate's material. Auto-saves to Vault like `/api/generate`.
- `/remix` UI: Paste Transcript → Extract Structure (renders the map) → Your Take + Packaging Gate → Generate Remix. Extracted hook format / structure pre-fill the gate.

**Verified:** build passes; both routes return 401 unauthenticated, `/remix` redirects to /login. Same generation-call limitation as Phase 3 — the live remix call needs `ANTHROPIC_API_KEY` (returns clean 503 until set).
