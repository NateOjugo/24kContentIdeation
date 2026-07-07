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
  script?: Script; // present = edit mode
  prefill?: Partial<ScriptInput>; // used by the Repeat Builder later
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
  saves: null,
  shares: null,
  likes: null,
  comments: null,
  retention_pct: null,
  winning: false,
  post_mortem_notes: null,
};

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="accent-card p-5 sm:p-6">
      <div className="micro-label mb-5">{label}</div>
      <div className="space-y-4">{children}</div>
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
  const [error, setError] = useState<string | null>(null);

  const isYouTube = form.platform === "YouTube";
  const lowShock =
    form.shock_value_score != null && form.shock_value_score < SHOCK_VALUE_THRESHOLD;

  function set<K extends keyof ScriptInput>(key: K, value: ScriptInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const num = (v: string) => (v === "" ? null : Number(v));

  // Packaging Gate — cannot save without these (Feature 1)
  const gateErrors = useMemo(() => {
    const errs: string[] = [];
    if (!form.title.trim()) errs.push("Title");
    if (!form.platform) errs.push("Platform");
    if (!form.pillar) errs.push("Pillar");
    if (!form.target_emotion) errs.push("Target Emotion");
    if (!form.hook_format) errs.push("Hook Format");
    if (isYouTube && !form.story_structure) errs.push("Story Structure");
    return errs;
  }, [form.title, form.platform, form.pillar, form.target_emotion, form.hook_format, form.story_structure, isYouTube]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (gateErrors.length > 0) {
      setError(`Packaging Gate incomplete: ${gateErrors.join(", ")}`);
      return;
    }
    setSaving(true);
    setError(null);

    const payload: ScriptInput = {
      ...form,
      title: form.title.trim(),
      // YouTube-only fields stay null on Reels
      story_structure: isYouTube ? form.story_structure : null,
      re_hook_count: isYouTube ? form.re_hook_count : null,
      dopamine_ladder_used: isYouTube ? form.dopamine_ladder_used : null,
      album_strategy_confirmed: isYouTube ? form.album_strategy_confirmed : null,
    };

    const supabase = createClient();
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
      <Section label="Packaging Gate — required before anything else">
        <Field label="Title (internal reference)" required>
          <input
            className="field-input"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="e.g. Stewardship Ep 3 — cold showers"
          />
        </Field>

        <Field label="Platform" required>
          <div className="grid grid-cols-2 gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => set("platform", p)}
                className={`rounded-[3px] border px-3 py-2.5 text-sm font-medium transition-colors ${
                  form.platform === p
                    ? "border-gold bg-gold/15 text-gold"
                    : "border-white/10 bg-black/30 text-steel hover:text-cream"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
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
          <Field label="Content Series">
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
              <p className="mt-1.5 text-xs text-gold">
                Below 80. The system says reframe or cut.
              </p>
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
          <Field label="Re-Hook Count">
            <input
              type="number"
              min={0}
              className="field-input"
              value={form.re_hook_count ?? ""}
              onChange={(e) => set("re_hook_count", num(e.target.value))}
            />
          </Field>
        )}
      </Section>

      <Section label="The Script">
        <Field label="Full Script Text (final edited version)">
          <textarea
            rows={10}
            className="field-input font-mono text-[13px] leading-relaxed"
            value={form.full_script_text ?? ""}
            onChange={(e) => set("full_script_text", e.target.value || null)}
          />
        </Field>
        <Field label="Original Draft Text (pre-edit — feeds the Voice Learning Loop)">
          <textarea
            rows={5}
            className="field-input font-mono text-[13px] leading-relaxed"
            value={form.original_draft_text ?? ""}
            onChange={(e) => set("original_draft_text", e.target.value || null)}
          />
        </Field>
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

      <Section label="Quality Gate Snapshot — did it follow the system?">
        <div className="grid gap-2 sm:grid-cols-2">
          <Toggle
            label="Click Confirmation (hook matches promise in 3s)"
            value={form.click_confirmation_passed}
            onChange={(v) => set("click_confirmation_passed", v)}
          />
          <Toggle
            label="Atomic Shareability (one clip-and-send moment)"
            value={form.atomic_shareability_present}
            onChange={(v) => set("atomic_shareability_present", v)}
          />
          <Toggle
            label="Hook Commandments (Alignment / Speed / Clarity / Curiosity)"
            value={form.hook_commandments_passed}
            onChange={(v) => set("hook_commandments_passed", v)}
          />
          {isYouTube && (
            <>
              <Toggle
                label="Dopamine Ladder (micro-win every 15–30s)"
                value={form.dopamine_ladder_used}
                onChange={(v) => set("dopamine_ladder_used", v)}
              />
              <Toggle
                label="Album Strategy (2nd best → best → 3rd best)"
                value={form.album_strategy_confirmed}
                onChange={(v) => set("album_strategy_confirmed", v)}
              />
            </>
          )}
        </div>
        <p className="text-xs text-steel">Tap to cycle: Pass → Fail → Not set.</p>
      </Section>

      <Section label="Performance — saves and shares weigh heaviest">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {(
            [
              ["views", "Views"],
              ["saves", "Saves"],
              ["shares", "Shares"],
              ["followers_gained", "Followers Gained"],
              ["likes", "Likes"],
              ["comments", "Comments"],
            ] as const
          ).map(([key, label]) => (
            <Field key={key} label={label}>
              <input
                type="number"
                min={0}
                className="field-input"
                value={form[key] ?? ""}
                onChange={(e) => set(key, num(e.target.value))}
              />
            </Field>
          ))}
        </div>
        <Field label="Watch Time / Retention % (manual estimate)">
          <input
            type="number"
            min={0}
            max={100}
            step="0.1"
            className="field-input"
            value={form.retention_pct ?? ""}
            onChange={(e) => set("retention_pct", num(e.target.value))}
          />
        </Field>
        <button
          type="button"
          onClick={() => set("winning", !form.winning)}
          className={`flex w-full items-center justify-between rounded-[3px] border px-4 py-3 text-left transition-colors ${
            form.winning
              ? "border-gold bg-gold/15"
              : "border-white/10 bg-black/30"
          }`}
        >
          <span className={`text-sm font-semibold ${form.winning ? "text-gold" : "text-steel"}`}>
            Winning?
          </span>
          <span className="micro-label-steel">
            {form.winning ? <span className="text-gold">This one hit</span> : "Not flagged"}
          </span>
        </button>
        <Field label="Post-Mortem Notes (why it worked / why it flopped)">
          <textarea
            rows={3}
            className="field-input"
            value={form.post_mortem_notes ?? ""}
            onChange={(e) => set("post_mortem_notes", e.target.value || null)}
          />
        </Field>
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
          {saving ? "Saving..." : script ? "Update Script" : "Log Script"}
        </button>
        {gateErrors.length > 0 && (
          <p className="mt-2 text-center text-xs text-steel">
            Packaging Gate still needs: {gateErrors.join(", ")}
          </p>
        )}
      </div>
    </form>
  );
}
