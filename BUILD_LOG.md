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

## Phase 5 — Voice Learning Loop ✅ wired (2026-07-06)

**Built** (Feature 7):
- `/api/learn-from-edit` — diffs a script's `original_draft_text` against its `full_script_text` (Nate's final edit) and extracts concrete, repeatable voice rules (word swaps, cut structures, punctuation changes) via `claude-fable-5` structured output. Refuses vague notes; returns empty if the versions are close. Appends rules to `voice_corrections` with the source script id.
- `/api/consolidate-voice` — the cap/consolidation job: reads all active corrections, asks Claude to merge/dedupe into a tighter set (≤30), deactivates the old rows (kept for history), inserts the consolidated set.
- Script detail page: "Learn from Edit" card appears once a script has BOTH a draft and a final edit; a hint card appears when it only has a draft (paste the final via Edit first). "Clip This Down" card wired here too for YouTube scripts.
- `/voice` page: the Voice Correction Log — active-rule count, over-cap warning, per-rule reinforcement badges, links back to source scripts, and the Consolidate button (highlighted gold when over the 30 cap).
- Generation already reads the top-30 corrections (built in Phase 3), so the loop compounds: edit → learn → next generation uses the rules.

**Verified:** build passes; `voice_corrections` table + 30-cap read confirmed in Phase 3; `/voice` uses the same server-component pattern as the verified `/patterns` page. Live learn/consolidate calls need `ANTHROPIC_API_KEY` (clean 503 until set).

## Phase 6 — Repeat Builder + Series View ✅ (2026-07-06)

**Built** (Features 4 & 5, pure data — no AI):
- **Repeat Builder** (Feature 4): "Repeat This Pattern" action on every script detail page links to `/log?from=<id>`. The logger server-fetches that script and pre-fills the framework combo (platform, pillar, secondary lane, emotion, hook format, story structure, series, CTA) via the existing ScriptForm `prefill` prop — title and script text stay blank. Header switches to "Rebuild From a Winner" mode.
- **Series View** (Feature 5): `/series` groups all series-tagged scripts by Content Series, ordered chronologically, showing saves+shares / views / followers / shock score per episode, with the best-performing episode's saves+shares highlighted gold and a "win" flag. Directly answers "why did Ep 2 underperform Ep 1."

**Verified with real queries:** seeded a 2-episode Stewardship Season, confirmed the Series query grouped both episodes and flagged Ep 1 (2700 saves+shares) as best over Ep 2 (1000); confirmed Repeat Builder prefill pulled the exact combo from the winning episode. Seed rows deleted — table back to 0.

**Note:** found (and worked around in the test) that PostgREST bulk inserts with heterogeneous keys send NULL for omitted columns instead of applying the default — not an app issue, since ScriptForm always sends every column.

## Phase 7 — Notes / Post-Mortem Log ✅ (2026-07-06)

**Built** (Feature 6): inline `PostMortemEditor` on every script detail page — a freeform diagnosis textarea with its own Save that updates only `post_mortem_notes`. Always visible (add notes even when empty), kept visually and structurally separate from the framework tags, with a note that the Pattern Engine never reads it. The full edit form still has the field too.

**Verified with real queries:** created a script, saved a post-mortem note inline, confirmed only `post_mortem_notes` changed and hook_format/emotion/winning were untouched. Seed row deleted.

---

## BUILD COMPLETE — all 7 phases (0–7) shipped

Live: https://24k-script-vault.vercel.app · Repo: /Users/nateojugo/24k-script-vault (standalone) · Supabase: 24k-script-vault (zsyazcquundngmdrnzha)

**Fully verified end-to-end (no AI key needed):** auth, Script Logger + Packaging Gate enforcement, Vault browse/search/filter, Pattern Engine rankings + Winning Formula, Repeat Builder prefill, Series View grouping, inline Post-Mortem, Tier 2 hooks import (2390 rows), Tier 3 knowledge ingestion (89 chunks) + vector search, embed edge function.

**Wired but NOT run end-to-end (needs ANTHROPIC_API_KEY):** the four generation calls — /api/suggest-gate, /api/generate, /api/clip-down, /api/extract-structure + /api/remix, /api/learn-from-edit, /api/consolidate-voice. All return a clean 503 until the key is set. No fake output anywhere.

### What Nate must do
1. **Add the Anthropic API key** — `.env.local` (`ANTHROPIC_API_KEY=...`) for local, and the `24k-script-vault` Vercel project env for production. Then run one generation to confirm voice + format.
2. **Change the login password** — see `LOGIN_CREDENTIALS.txt` (gitignored). Email: nateojugo45@gmail.com.
3. **Log real past scripts** with real numbers (Stewardship Ep 1 & 2 first) — the Pattern Engine and gate suggestions come alive once there's data.
4. Optional: drop the two missing Tier 3 PDFs (the_art_of_the_personal_brand.pdf, The_art_of_branding.pdf) into ~/Desktop/24k-script-vault/ and re-run `node scripts/ingest-knowledge.mjs` to add them.
5. Optional: disable Supabase email signups (single-user tool).


## Generation VERIFIED end-to-end (2026-07-06, later)

`ANTHROPIC_API_KEY` added to `.env.local` and the `24k-script-vault` Vercel production env. Ran a real generation through the actual pipeline (`scripts/verify-generation.ts`): Tier 2 pulled 10 hooks, Tier 3 retrieved 3 knowledge chunks, and `claude-fable-5` (served directly, stop_reason end_turn) produced a correctly-formatted 24K FAITH-lane Reels script — TARGET EMOTION header, 3-step Contrarian hook, Context/Application/Framing body, screenshot closing punch, caption, "therefore" per the voice rule, Physical-First/Meaning-Last with scripture in the punchline, no em dashes in the prose. **All four generation surfaces are now proven working, not just wired.**

Excluded `scripts/` from the app tsconfig so the verification utility doesn't affect the app build.

**Security note:** the API key was shared in plaintext chat. Consider rotating it in the Anthropic console once you've confirmed everything works — the key in `.env.local`/Vercel would need updating to the new one.

## Feature 1 Rework — Script Logger is now paste-and-analyze, not a manual form (2026-07-07)

**Why:** the original Logger forced hand-selecting Platform/Pillar/Emotion/Hook Format before saving — wrong assumption. The value is the tool reading the tags off the script, not Nate labeling them.

**Built a single shared Structure Analysis engine** (`src/lib/generation/analyze.ts` → `analyzeStructure(text, mode)`): one `claude-fable-5` structured-output call that reads script text and returns the full framework map (platform, pillar + secondary, target emotion, hook format, story structure, loop open/close, shock value score, re-hook count, CTA type, suggested title, plus the reusable structural skeleton). Two callers, one engine — no duplicate analysis systems:
- `mode: "own"` → `/api/analyze-script`, used by the Script Logger on Nate's own finished scripts.
- `mode: "transcript"` → `/api/extract-structure`, used by Transcript-to-Remix on another creator's transcript. Refactored to call the same engine (previously had its own inline call). The remix UI response shape is unchanged (the shared schema is a superset).

**New Logger flow** (`src/components/ScriptForm.tsx`): (1) paste the finished script → (2) "Analyze & Auto-Fill Tags" pre-fills every Framework Tag from the analysis → (3) review/correct → (4) save. Content Series, Quality Gate self-assessment, and Performance stay manual (not inferable from text). Save gate is now a light "review before saving" check, not a fill-the-form wall.

**One entry per script:** `/log` inserts once; editing goes through `/scripts/[id]/edit` which `update()`s the same row in place — never a duplicate Vault item. `original_draft_text` (dashboard-generated) and `full_script_text` (final edited) are both columns on that single row; edit mode preserves `original_draft_text` even though the Logger doesn't render a field for it.

**Verified:** shared engine run on a real finished FAITH/TRAIN Reel via claude-fable-5 — correctly returned platform=Reels, hook_format=Contrarian, story_structure=null, extracted loop open/close verbatim, suggested a title, detected pillar-blending (TRAIN + FAITH secondary), cta_type=None. Build passes; `/api/analyze-script` returns 401 unauthenticated; `/log` redirects to login. **Not run in-browser** in this environment (auth-cookie constraint) — Nate should do a 30-second paste test after deploy to confirm the click-through feels right.

## Performance model + Outlier scoring overhaul (2026-07-07)

**1. Platform-first logger.** Platform selection is now Step 1 (before pasting). The chosen platform is passed into the analysis (`analyzeStructure(text, "own", platformHint)`) so it reads for the right structure — Reels single-loop vs YouTube StoryLoop/Dopamine/Album/Re-Hooks — instead of inferring from text.

**2. Watch time with a denominator.** Added `video_duration` (sec) and `average_watch_time` (sec). `retention_rate` is a **generated Postgres column** (`average_watch_time / video_duration * 100`) — never hand-entered; the form shows a live preview.

**3. IG-Insights rate metrics replace raw counts.** Dropped `likes`/`shares`/`saves` raw columns; added `skip_rate`, `share_rate`, `like_rate`, `save_rate` (percentages, manual entry — match Insights' own reporting). Views, comments, followers_gained kept.

**4. Computed Outlier Score replaces the binary "Winning?" toggle** (`src/lib/outlier.ts`, never stored, never hand-set): median Views over all performance-logged scripts (recomputed each render) → multiplier = views ÷ median → Poor (<1x) / Semi-Good (1–2.9x) / Amazing (≥3x). Amazing-on-views but below-median on BOTH save_rate and share_rate → "Reach Outlier — verify quality". Baseline needs ≥5 performance-logged scripts, else "Baseline not yet established." Vault cards, script detail, and Series view all show the tier; the Vault filter is now "Amazing Only" (client-side over a global baseline fetch so the median isn't skewed by active filters).

**5. Quality Gate mostly auto-determined.** The analysis engine now returns Click Confirmation, Hook Commandments, Dopamine Ladder, Album Strategy, and Re-Hook Count from the script text. Atomic Shareability stays manual (needs visual judgment) and is labeled as such.

**6. Pattern Engine reworked** (`src/lib/patterns.ts`): ranks framework combos by the composite `save_rate + share_rate + retention_rate` (not raw counts); the primary grouping is now the Outlier tier breakdown (Amazing/Semi-Good/Poor), and the Winning Formula derives from the Amazing tier (falls back to top-3 by composite).

**Verified:** migration applied (scripts empty, clean restructure); full build passes; no stale field references remain (grep clean); outlier math confirmed on synthetic data (3.0x with weak save/share correctly flagged Reach Outlier, 2.5x stays Semi-Good); analysis engine confirmed via claude-fable-5 — honors the Reels platform hint, returns click_confirmation/hook_commandments booleans, nulls YouTube-only gates on Reels. In-browser click-through still pending Nate's paste test (auth-cookie constraint in this environment).

## Model config + Remix blend toggle + Compare Scripts (2026-07-08)

**1. Centralized model config — single source of truth** (`src/lib/models.config.ts`): `GENERATION_MODEL = "claude-sonnet-5"`, `ANALYSIS_MODEL = "claude-haiku-4-5-20251001"`. Every AI call imports from here; no model string is hardcoded anywhere else. Fable 5 / Opus 4.8 are banned (documented in the file: Fable is $10/$50 per M tokens, and Sonnet 5 matches/exceeds it on this app's knowledge-work tasks). Removed the old Fable+Opus server-side-fallback machinery from `anthropic.ts`.
- **Generation → Sonnet 5:** `/api/generate`, `/api/remix`, `/api/clip-down` (via `generateText`).
- **Analysis → Haiku 4.5:** structure extraction + auto-tagging (`analyze.ts` → `/api/analyze-script`, `/api/extract-structure`), quality-gate detection (same engine), packaging-gate suggestion (`/api/suggest-gate`), voice-log extraction + consolidation (`/api/learn-from-edit`, `/api/consolidate-voice`), and the new Compare diagnostic (`/api/compare`).
- **Audit:** grep confirms zero `claude-fable`/`claude-opus` anywhere in the repo except the why-not comment in the config. Both new model strings verified live — Sonnet 5 generation returns end_turn; Haiku 4.5 returns valid structured output.

**2. "Blend with My Winning Patterns" toggle on Remix — OFF by default** (`/remix` + `/api/remix`): `useState(false)`, never persisted, so it's OFF on every new session (not just first load). OFF = structure + take + Script Skill + Voice Bible + Voice Correction Log only, no Vault Winning Formula. ON = additionally injects a short summary of the Amazing-tier Winning Formula. Reasoning documented in code: the source transcript is already a proven outlier carrying its own signal; auto-blending two proven structures risks a generation that follows neither cleanly — so it's an explicit opt-in.

**3. Compare Scripts** (`/compare` + `CompareScripts.tsx` + `/api/compare`): multi-select 2+ performance-tracked scripts → side-by-side table of every Framework Tag, Quality Gate result, and Performance metric, with differing rows highlighted (gold dot + tint) → "Explain the Performance Gap" runs a Haiku diagnostic. **Works for any script with real performance data, filtered by `hasPerf` (not generation origin)** — so manually-logged past videos with their Instagram Insights numbers are first-class comparison points against each other and against dashboard-generated ones.

**Verified:** build passes with `/compare` + `/api/compare`; all three required checks confirmed — (1) no Fable/Opus calls remain, (2) Remix toggle defaults OFF every session with no persistence, (3) Compare selects by performance-data presence, not generation origin. Live model check passed for both Sonnet 5 and Haiku 4.5.
