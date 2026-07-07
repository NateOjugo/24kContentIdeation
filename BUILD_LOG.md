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
