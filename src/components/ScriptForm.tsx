"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  CONTENT_SERIES,
  CTA_TYPES,
  EMOTIONS,
  HOOK_FORMATS,
  PILLARS,
  PLATFORMS,
  SHOCK_VALUE_THRESHOLD,
  STORY_STRUCTURES,
  type Script,
  type ScriptInput,
} from "@/lib/scripts";

type Props = {
  script?: Script; // present = edit mode (updates in place — never a new row)
  prefill?: Partial<ScriptInput>; // Repeat Builder
};

const EMPTY: ScriptInput = {
  title: "",
  platform: "Reels",
  content_series: null,
  pillar: "TRAIN",
  pillar_secondary: null,
  target_emotion: "Awe",
  hook_format: null,
  story_structure: null,
  shock_value_score: null,
  loop_open: null,
  loop_close: null,
  re_hook_count: null,
  cta_type: null,
  full_script_text: null,
  original_draft_text: null,
  caption: null,
  date_posted: null,
  click_confirmation_passed: null,
  atomic_shareability_present: null,
  hook_commandments_passed: null,
  dopamine_ladder_used: null,
  album_strategy_confirmed: null,
  views: null,
  followers_gained: null,
  comments: null,
  video_duration: null,
  average_watch_time: null,
  skip_rate: null,
  share_rate: null,
  like_rate: null,
  save_rate: null,
  post_mortem_notes: null,
};

function Section({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="accent-card p-5 sm:p-6">
      <div className="micro-label mb-1">{label}</div>
      {hint && <p className="mb-4 text-xs text-steel">{hint}</p>}
      <div className={`space-y-4 ${hint ? "" : "mt-4"}`}>{children}</div>
    </section>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="micro-label-steel mb-1.5 block">
        {label}
        {required && <span className="text-gold"> *</span>}
      </span>
      {children}
    </label>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean | null;
  onChange: (v: boolean | null) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(value === true ? false : value === false ? null : true)}
      className={`flex w-full items-center justify-between rounded-[3px] border px-3 py-2.5 text-left text-sm transition-colors ${
        value === true
          ? "border-gold/60 bg-gold/10 text-cream"
          : value === false
            ? "border-white/10 bg-black/30 text-steel"
            : "border-white/10 bg-transparent text-steel/60"
      }`}
    >
      <span>{label}</span>
      <span className="micro-label-steel shrink-0">
        {value === true ? <span className="text-gold">Pass</span> : value === false ? "Fail" : "Not set"}
      </span>
    </button>
  );
}

export function ScriptForm({ script, prefill }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<ScriptInput>({
    ...EMPTY,
    ...prefill,
    ...(script
      ? (Object.fromEntries(
          Object.keys(EMPTY).map((k) => [k, script[k as keyof Script]])
        ) as unknown as ScriptInput)
      : {}),
  });
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isYouTube = form.platform === "YouTube";
  const lowShock =
    form.shock_value_score != null && form.shock_value_score < SHOCK_VALUE_THRESHOLD;

  // retention_rate is computed (generated column) — show a live preview only.
  const retentionPreview =
    form.video_duration && form.video_duration > 0 && form.average_watch_time != null
      ? (form.average_watch_time / form.video_duration) * 100
      : null;

  function set<K extends keyof ScriptInput>(key: K, value: ScriptInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const num = (v: string) => (v === "" ? null : Number(v));

  // Structure Analysis — reads the pasted script (for the chosen platform) and
  // auto-fills the Framework Tags + most of the Quality Gate.
  async function analyze() {
    const text = form.full_script_text?.trim();
    if (!text) {
      setError("Paste your script first, then analyze.");
      return;
    }
    setAnalyzing(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, platform: form.platform }),
      });
      const a = await res.json();
      if (!res.ok) throw new Error(a.error ?? `HTTP ${res.status}`);
      const yt = form.platform === "YouTube";
      setForm((f) => ({
        ...f,
        pillar: a.pillar,
        pillar_secondary: a.pillar_secondary ?? null,
        target_emotion: a.target_emotion,
        hook_format: a.hook_format,
        story_structure: yt ? a.story_structure : null,
        loop_open: a.loop_open ?? null,
        loop_close: a.loop_close ?? null,
        shock_value_score: a.shock_value_score ?? null,
        re_hook_count: yt ? a.re_hook_count ?? null : null,
        cta_type: a.cta_type ?? null,
        // auto-determined Quality Gate (atomic shareability stays manual)
        click_confirmation_passed: a.click_confirmation_passed ?? null,
        hook_commandments_passed: a.hook_commandments_passed ?? null,
        dopamine_ladder_used: yt ? a.dopamine_ladder_used ?? null : null,
        album_strategy_confirmed: yt ? a.album_strategy_confirmed ?? null : null,
        title: f.title.trim() ? f.title : a.suggested_title ?? "",
      }));
      setAnalyzed(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setAnalyzing(false);
    }
  }

  const gateErrors = useMemo(() => {
    const errs: string[] = [];
    if (!form.title.trim()) errs.push("Title");
    if (!form.hook_format) errs.push("Hook Format");
    if (!form.target_emotion) errs.push("Target Emotion");
    if (isYouTube && !form.story_structure) errs.push("Story Structure");
    return errs;
  }, [form.title, form.hook_format, form.target_emotion, form.story_structure, isYouTube]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (gateErrors.length > 0) {
      setError(`Review before saving — still needs: ${gateErrors.join(", ")}`);
      return;
    }
    // Watch time needs its denominator to be meaningful.
    if (form.average_watch_time != null && !form.video_duration) {
      setError("Enter Video Duration so retention can be computed.");
      return;
    }
    setSaving(true);
    setError(null);

    const payload: ScriptInput = {
      ...form,
      title: form.title.trim(),
      story_structure: isYouTube ? form.story_structure : null,
      re_hook_count: isYouTube ? form.re_hook_count : null,
      dopamine_ladder_used: isYouTube ? form.dopamine_ladder_used : null,
      album_strategy_confirmed: isYouTube ? form.album_strategy_confirmed : null,
    };

    const supabase = createClient();
    // One entry per script: edit updates in place, never inserts a duplicate row.
    const { data, error } = script
      ? await supabase.from("scripts").update(payload).eq("id", script.id).select("id").single()
      : await supabase.from("scripts").insert(payload).select("id").single();

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    router.push(`/scripts/${data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* 1 — Platform first: the analyzer needs to know which structure to expect */}
      <Section
        label={script ? "Platform" : "1 — Platform"}
        hint="Pick this first — it tells the analysis which structure to read for (Reels single-loop vs YouTube StoryLoop)."
      >
        <div className="grid grid-cols-2 gap-2">
          {PLATFORMS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => set("platform", p)}
              className={`rounded-[3px] border px-3 py-3 text-sm font-medium transition-colors ${
                form.platform === p
                  ? "border-gold bg-gold/15 text-gold"
                  : "border-white/10 bg-black/30 text-steel hover:text-cream"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </Section>

      {/* 2 — Paste the finished script */}
      <Section
        label={script ? "The Script" : "2 — Paste Your Finished Script"}
        hint={
          script
            ? "Edit the text, then re-analyze if the structure changed. Saving updates this same entry."
            : "Write it wherever you write (Claude chat, your Script Skill), then paste the finished text here. The dashboard reads its structure and fills the tags for you."
        }
      >
        <textarea
          rows={10}
          className="field-input font-mono text-[13px] leading-relaxed"
          placeholder="Paste the full script text…"
          value={form.full_script_text ?? ""}
          onChange={(e) => set("full_script_text", e.target.value || null)}
        />
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={analyze}
            disabled={analyzing || !form.full_script_text?.trim()}
            className="rounded-[3px] bg-gold px-4 py-2.5 text-sm font-semibold text-navy-deep transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {analyzing ? "Reading the structure…" : analyzed ? "Re-Analyze" : "Analyze & Auto-Fill Tags"}
          </button>
          {analyzed && !analyzing && (
            <span className="micro-label-steel"><span className="text-gold">Tags detected</span> — review below</span>
          )}
        </div>
      </Section>

      {/* 3 — Framework Tags (auto-detected, review & correct) */}
      <Section
        label={script ? "Framework Tags" : "3 — Framework Tags"}
        hint="Auto-detected from the script. Correct anything the analysis got wrong."
      >
        <Field label="Title (internal reference)" required>
          <input
            className="field-input"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="e.g. Stewardship Ep 3 — cold showers"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Pillar / Lane" required>
            <select
              className="field-input"
              value={form.pillar}
              onChange={(e) => set("pillar", e.target.value as ScriptInput["pillar"])}
            >
              {PILLARS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </Field>
          <Field label="Secondary Lane (pillar blending)">
            <select
              className="field-input"
              value={form.pillar_secondary ?? ""}
              onChange={(e) => set("pillar_secondary", (e.target.value || null) as ScriptInput["pillar_secondary"])}
            >
              <option value="">None</option>
              {PILLARS.filter((p) => p !== form.pillar).map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Target Emotion" required>
            <select
              className="field-input"
              value={form.target_emotion}
              onChange={(e) => set("target_emotion", e.target.value as ScriptInput["target_emotion"])}
            >
              {EMOTIONS.map((em) => (
                <option key={em} value={em}>{em}</option>
              ))}
            </select>
          </Field>
          <Field label="Content Series (your call — not auto-detected)">
            <select
              className="field-input"
              value={form.content_series ?? ""}
              onChange={(e) => set("content_series", (e.target.value || null) as ScriptInput["content_series"])}
            >
              <option value="">None</option>
              {CONTENT_SERIES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Hook Format" required>
            <select
              className="field-input"
              value={form.hook_format ?? ""}
              onChange={(e) => set("hook_format", (e.target.value || null) as ScriptInput["hook_format"])}
            >
              <option value="">Select…</option>
              {HOOK_FORMATS.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </Field>
          {isYouTube && (
            <Field label="Story Structure" required>
              <select
                className="field-input"
                value={form.story_structure ?? ""}
                onChange={(e) => set("story_structure", (e.target.value || null) as ScriptInput["story_structure"])}
              >
                <option value="">Select…</option>
                {STORY_STRUCTURES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Shock Value Score (0–100)">
            <input
              type="number"
              min={0}
              max={100}
              className="field-input"
              value={form.shock_value_score ?? ""}
              onChange={(e) => set("shock_value_score", num(e.target.value))}
              placeholder="100 people. How many haven't heard this?"
            />
            {lowShock && (
              <p className="mt-1.5 text-xs text-gold">Below 80. The system says reframe or cut.</p>
            )}
          </Field>
          <Field label="CTA Type">
            <select
              className="field-input"
              value={form.cta_type ?? ""}
              onChange={(e) => set("cta_type", (e.target.value || null) as ScriptInput["cta_type"])}
            >
              <option value="">Not set</option>
              {CTA_TYPES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Loop — What Opens">
            <input
              className="field-input"
              value={form.loop_open ?? ""}
              onChange={(e) => set("loop_open", e.target.value || null)}
            />
          </Field>
          <Field label="Loop — What Closes">
            <input
              className="field-input"
              value={form.loop_close ?? ""}
              onChange={(e) => set("loop_close", e.target.value || null)}
            />
          </Field>
        </div>

        {isYouTube && (
          <Field label="Re-Hook Count (auto-detected)">
            <input
              type="number"
              min={0}
              className="field-input"
              value={form.re_hook_count ?? ""}
              onChange={(e) => set("re_hook_count", num(e.target.value))}
            />
          </Field>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Caption">
            <input
              className="field-input"
              value={form.caption ?? ""}
              onChange={(e) => set("caption", e.target.value || null)}
            />
          </Field>
          <Field label="Date Posted">
            <input
              type="date"
              className="field-input"
              value={form.date_posted ?? ""}
              onChange={(e) => set("date_posted", e.target.value || null)}
            />
          </Field>
        </div>
      </Section>

      {/* 4 — Quality Gate Snapshot (auto-determined; atomic shareability manual) */}
      <Section
        label={script ? "Quality Gate Snapshot" : "4 — Quality Gate Snapshot"}
        hint="Auto-determined from the script by the analysis. Atomic Shareability is yours to set — it needs visual judgment. Tap to cycle: Pass → Fail → Not set."
      >
        <div className="grid gap-2 sm:grid-cols-2">
          <Toggle label="Click Confirmation (auto)" value={form.click_confirmation_passed} onChange={(v) => set("click_confirmation_passed", v)} />
          <Toggle label="Hook Commandments (auto)" value={form.hook_commandments_passed} onChange={(v) => set("hook_commandments_passed", v)} />
          <Toggle label="Atomic Shareability (manual — your call)" value={form.atomic_shareability_present} onChange={(v) => set("atomic_shareability_present", v)} />
          {isYouTube && (
            <>
              <Toggle label="Dopamine Ladder (auto)" value={form.dopamine_ladder_used} onChange={(v) => set("dopamine_ladder_used", v)} />
              <Toggle label="Album Strategy (auto)" value={form.album_strategy_confirmed} onChange={(v) => set("album_strategy_confirmed", v)} />
            </>
          )}
        </div>
      </Section>

      {/* 5 — Performance (manual, IG-Insights rate metrics) */}
      <Section
        label={script ? "Performance" : "5 — Performance"}
        hint="From Instagram Insights — entered by hand. Rates match Insights' own reporting. Not inferable from the script text."
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Views">
            <input type="number" min={0} className="field-input" value={form.views ?? ""} onChange={(e) => set("views", num(e.target.value))} />
          </Field>
          <Field label="Video Duration (sec)">
            <input type="number" min={0} className="field-input" value={form.video_duration ?? ""} onChange={(e) => set("video_duration", num(e.target.value))} />
          </Field>
          <Field label="Avg Watch Time (sec)">
            <input type="number" min={0} step="0.1" className="field-input" value={form.average_watch_time ?? ""} onChange={(e) => set("average_watch_time", num(e.target.value))} />
          </Field>
        </div>

        <div className="rounded-[3px] border border-white/8 bg-black/25 px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="micro-label-steel">Retention Rate (computed)</span>
            <span className="font-display text-2xl text-gold">
              {retentionPreview != null ? `${retentionPreview.toFixed(1)}%` : "—"}
            </span>
          </div>
          <p className="mt-1 text-xs text-steel">avg watch time ÷ duration × 100. Filled automatically on save.</p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {(
            [
              ["skip_rate", "Skip Rate %"],
              ["save_rate", "Save Rate %"],
              ["share_rate", "Share Rate %"],
              ["like_rate", "Like Rate %"],
            ] as const
          ).map(([key, label]) => (
            <Field key={key} label={label}>
              <input
                type="number"
                min={0}
                max={100}
                step="0.1"
                className="field-input"
                value={form[key] ?? ""}
                onChange={(e) => set(key, num(e.target.value))}
              />
            </Field>
          ))}
        </div>
        <p className="text-xs text-steel">Save rate and share rate are the primary signals — they weigh heaviest in the Pattern Engine.</p>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Comments">
            <input type="number" min={0} className="field-input" value={form.comments ?? ""} onChange={(e) => set("comments", num(e.target.value))} />
          </Field>
          <Field label="Followers Gained">
            <input type="number" min={0} className="field-input" value={form.followers_gained ?? ""} onChange={(e) => set("followers_gained", num(e.target.value))} />
          </Field>
        </div>
        <p className="text-xs text-steel">
          No manual &ldquo;Winning?&rdquo; toggle — the Vault computes an Outlier Score (Poor / Semi-Good / Amazing) from your Views against your own median.
        </p>
      </Section>

      {error && (
        <p className="text-sm text-gold" role="alert">
          {error}
        </p>
      )}

      <div className="sticky bottom-0 -mx-4 border-t border-white/8 bg-navy-deep/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-[3px] bg-gold px-4 py-3 text-sm font-semibold text-navy-deep transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Saving..." : script ? "Update Script" : "Save to Vault"}
        </button>
        {gateErrors.length > 0 && (
          <p className="mt-2 text-center text-xs text-steel">Still needs: {gateErrors.join(", ")}</p>
        )}
      </div>
    </form>
  );
}
