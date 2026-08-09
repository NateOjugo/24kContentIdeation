"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  POWER_WORD_FUNCTIONS,
  normalizeNiche,
  type HookFormatTemplate,
  type Metaphor,
  type PowerWord,
  type PowerWordFn,
} from "@/lib/hooksBank";

function Section({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="accent-card p-5 sm:p-6">
      <div className="micro-label mb-1">{label}</div>
      {hint && <p className="mb-4 text-xs text-steel">{hint}</p>}
      <div className={`space-y-4 ${hint ? "" : "mt-4"}`}>{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="micro-label-steel mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

function splitNiches(raw: string): string[] {
  return [...new Set(raw.split(",").map((n) => normalizeNiche(n)).filter(Boolean))];
}

export function HooksBankManager({
  initialPowerWords,
  initialMetaphors,
  initialHookFormatTemplates,
}: {
  initialPowerWords: PowerWord[];
  initialMetaphors: Metaphor[];
  initialHookFormatTemplates: HookFormatTemplate[];
}) {
  const supabase = createClient();

  const [powerWords, setPowerWords] = useState(initialPowerWords);
  const [metaphors, setMetaphors] = useState(initialMetaphors);
  const [templates, setTemplates] = useState(initialHookFormatTemplates);
  const [error, setError] = useState<string | null>(null);

  // Power word add-form
  const [pwPhrase, setPwPhrase] = useState("");
  const [pwFn, setPwFn] = useState<PowerWordFn>("accusation");
  const [pwNiches, setPwNiches] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  async function addPowerWord() {
    if (!pwPhrase.trim()) return;
    setPwSaving(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("power_words")
      .insert({ phrase: pwPhrase.trim(), fn: pwFn, niches: splitNiches(pwNiches) })
      .select("*")
      .single();
    setPwSaving(false);
    if (err) return setError(err.message);
    setPowerWords((p) => [data as PowerWord, ...p]);
    setPwPhrase("");
    setPwNiches("");
  }

  // Metaphor add-form
  const [mNiche, setMNiche] = useState("");
  const [mAnchor, setMAnchor] = useState("");
  const [mMeaning, setMMeaning] = useState("");
  const [mSaving, setMSaving] = useState(false);

  async function addMetaphor() {
    if (!mNiche.trim() || !mAnchor.trim() || !mMeaning.trim()) return;
    setMSaving(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("metaphors")
      .insert({ niche: normalizeNiche(mNiche), concrete_anchor: mAnchor.trim(), meaning_layer: mMeaning.trim() })
      .select("*")
      .single();
    setMSaving(false);
    if (err) return setError(err.message);
    setMetaphors((m) => [data as Metaphor, ...m]);
    setMNiche("");
    setMAnchor("");
    setMMeaning("");
  }

  // Hook format template add-form
  const [tName, setTName] = useState("");
  const [tTemplate, setTTemplate] = useState("");
  const [tNotes, setTNotes] = useState("");
  const [tSaving, setTSaving] = useState(false);

  async function addTemplate() {
    if (!tName.trim() || !tTemplate.trim()) return;
    setTSaving(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("hook_formats")
      .insert({ name: tName.trim(), template: tTemplate.trim(), notes: tNotes.trim() || null })
      .select("*")
      .single();
    setTSaving(false);
    if (err) return setError(err.message);
    setTemplates((t) => [data as HookFormatTemplate, ...t]);
    setTName("");
    setTTemplate("");
    setTNotes("");
  }

  return (
    <div className="space-y-5">
      <Section label="Power Words" hint="Tagged by function, filtered by niche when generating.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phrase">
            <input className="field-input" value={pwPhrase} onChange={(e) => setPwPhrase(e.target.value)} placeholder="e.g. you already know" />
          </Field>
          <Field label="Function">
            <select className="field-input" value={pwFn} onChange={(e) => setPwFn(e.target.value as PowerWordFn)}>
              {POWER_WORD_FUNCTIONS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Niches (comma separated)">
          <input className="field-input" value={pwNiches} onChange={(e) => setPwNiches(e.target.value)} placeholder="fitness, faith-fitness" />
        </Field>
        <button
          type="button"
          onClick={addPowerWord}
          disabled={pwSaving || !pwPhrase.trim()}
          className="rounded-[3px] bg-gold px-4 py-2.5 text-sm font-semibold text-navy-deep transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pwSaving ? "Adding…" : "Add Power Word"}
        </button>
        {powerWords.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {powerWords.map((w) => (
              <li key={w.id} className="flex flex-wrap items-center gap-2 rounded-[3px] border border-white/8 bg-black/25 px-3 py-2 text-sm">
                <span className="text-cream">&ldquo;{w.phrase}&rdquo;</span>
                <span className="micro-label-steel">{w.fn}</span>
                {w.niches.length > 0 && <span className="text-xs text-steel">{w.niches.join(", ")}</span>}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section label="Metaphors" hint="Concrete anchor → meaning layer, one niche each.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Niche">
            <input className="field-input" value={mNiche} onChange={(e) => setMNiche(e.target.value)} placeholder="fitness" />
          </Field>
          <Field label="Concrete Anchor">
            <input className="field-input" value={mAnchor} onChange={(e) => setMAnchor(e.target.value)} placeholder="the weight doesn't lie" />
          </Field>
          <Field label="Meaning Layer">
            <input className="field-input" value={mMeaning} onChange={(e) => setMMeaning(e.target.value)} placeholder="the movement reveals character" />
          </Field>
        </div>
        <button
          type="button"
          onClick={addMetaphor}
          disabled={mSaving || !mNiche.trim() || !mAnchor.trim() || !mMeaning.trim()}
          className="rounded-[3px] bg-gold px-4 py-2.5 text-sm font-semibold text-navy-deep transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {mSaving ? "Adding…" : "Add Metaphor"}
        </button>
        {metaphors.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {metaphors.map((m) => (
              <li key={m.id} className="rounded-[3px] border border-white/8 bg-black/25 px-3 py-2 text-sm">
                <span className="micro-label-steel">{m.niche}</span>
                <div className="mt-1 text-cream">{m.concrete_anchor} <span className="text-steel">→</span> {m.meaning_layer}</div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section label="Hook Format Templates" hint="Custom structural templates — separate from the fixed Packaging Gate hook formats.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            <input className="field-input" value={tName} onChange={(e) => setTName(e.target.value)} placeholder="Problem Format" />
          </Field>
          <Field label="Notes (optional)">
            <input className="field-input" value={tNotes} onChange={(e) => setTNotes(e.target.value)} />
          </Field>
        </div>
        <Field label="Template">
          <textarea
            rows={2}
            className="field-input"
            value={tTemplate}
            onChange={(e) => setTTemplate(e.target.value)}
            placeholder="If you are {identity} and {physical_failure} — that's not a {expected_diagnosis}. That's a {reframe}."
          />
        </Field>
        <button
          type="button"
          onClick={addTemplate}
          disabled={tSaving || !tName.trim() || !tTemplate.trim()}
          className="rounded-[3px] bg-gold px-4 py-2.5 text-sm font-semibold text-navy-deep transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {tSaving ? "Adding…" : "Add Template"}
        </button>
        {templates.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {templates.map((t) => (
              <li key={t.id} className="rounded-[3px] border border-white/8 bg-black/25 px-3 py-2 text-sm">
                <span className="text-cream">{t.name}</span>
                <p className="mt-1 text-xs text-steel">{t.template}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {error && (
        <p className="text-sm text-gold" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
