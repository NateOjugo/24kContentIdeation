"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  POWER_WORD_FUNCTIONS,
  POWER_WORD_SLOTS,
  CORE_SLOTS,
  SHOCK_VALUE_GATE,
  normalizeNiche,
  type HookFormatTemplate,
  type Metaphor,
  type PowerWord,
  type PowerWordFn,
  type PowerWordSlot,
  type SixPowerWord,
  type ShockValueFact,
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
  initialSixPowerWords,
  initialShockValueFacts,
}: {
  initialPowerWords: PowerWord[];
  initialMetaphors: Metaphor[];
  initialHookFormatTemplates: HookFormatTemplate[];
  initialSixPowerWords: SixPowerWord[];
  initialShockValueFacts: ShockValueFact[];
}) {
  const supabase = createClient();

  const [powerWords, setPowerWords] = useState(initialPowerWords);
  const [metaphors, setMetaphors] = useState(initialMetaphors);
  const [templates, setTemplates] = useState(initialHookFormatTemplates);
  const [sixWords, setSixWords] = useState(initialSixPowerWords);
  const [facts, setFacts] = useState(initialShockValueFacts);
  const [error, setError] = useState<string | null>(null);

  // Six Power Words add-form. is_core is derived from the slot, never entered by hand —
  // the DB has a CHECK enforcing the same rule.
  const [spwSlot, setSpwSlot] = useState<PowerWordSlot>("subject");
  const [spwExample, setSpwExample] = useState("");
  const [spwNiche, setSpwNiche] = useState("");
  const [spwSaving, setSpwSaving] = useState(false);

  async function addSixPowerWord() {
    if (!spwExample.trim()) return;
    setSpwSaving(true);
    setError(null);
    const isCore = (CORE_SLOTS as readonly string[]).includes(spwSlot);
    const { data, error: err } = await supabase
      .from("six_power_words")
      .insert({ slot: spwSlot, example: spwExample.trim(), niche: splitNiches(spwNiche), is_core: isCore })
      .select("*")
      .single();
    setSpwSaving(false);
    if (err) return setError(err.message);
    setSixWords((s) => [data as SixPowerWord, ...s]);
    setSpwExample("");
    setSpwNiche("");
  }

  // Shock Value Facts add-form
  const [svFact, setSvFact] = useState("");
  const [svTopic, setSvTopic] = useState("");
  const [svNiche, setSvNiche] = useState("");
  const [svScore, setSvScore] = useState("");
  const [svExpectation, setSvExpectation] = useState("");
  const [svReality, setSvReality] = useState("");
  const [svSaving, setSvSaving] = useState(false);

  const svScoreNum = svScore === "" ? null : Number(svScore);
  const svBelowGate = svScoreNum != null && svScoreNum < SHOCK_VALUE_GATE;

  async function addShockValueFact() {
    if (!svFact.trim() || !svTopic.trim() || !svNiche.trim() || svScoreNum == null) return;
    setSvSaving(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("shock_value_facts")
      .insert({
        fact: svFact.trim(),
        topic: svTopic.trim(),
        niche: normalizeNiche(svNiche),
        shock_score: svScoreNum,
        expectation: svExpectation.trim() || null,
        reality: svReality.trim() || null,
      })
      .select("*")
      .single();
    setSvSaving(false);
    if (err) return setError(err.message);
    setFacts((f) => [data as ShockValueFact, ...f]);
    setSvFact("");
    setSvTopic("");
    setSvScore("");
    setSvExpectation("");
    setSvReality("");
  }

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
      <Section
        label="Shock Value Facts"
        hint={`Step 2 of the pipeline. Score the gap between what the audience believes and what you're revealing. Anything under ${SHOCK_VALUE_GATE} is common knowledge and never gets retrieved.`}
      >
        <Field label="Fact">
          <textarea rows={2} className="field-input" value={svFact} onChange={(e) => setSvFact(e.target.value)} placeholder="David killed a lion and a bear with his bare hands before facing Goliath" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Topic">
            <input className="field-input" value={svTopic} onChange={(e) => setSvTopic(e.target.value)} placeholder="David rotational power" />
          </Field>
          <Field label="Niche">
            <input className="field-input" value={svNiche} onChange={(e) => setSvNiche(e.target.value)} placeholder="masculinity-identity" />
          </Field>
          <Field label="Shock Score (1–100)">
            <input type="number" min={1} max={100} className="field-input" value={svScore} onChange={(e) => setSvScore(e.target.value)} />
            {svBelowGate && (
              <p className="mt-1.5 text-xs text-gold">Below {SHOCK_VALUE_GATE}. It saves, but generation will never pull it.</p>
            )}
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Expectation (what they believe now)">
            <input className="field-input" value={svExpectation} onChange={(e) => setSvExpectation(e.target.value)} placeholder="David got lucky with the stone" />
          </Field>
          <Field label="Reality (what you're revealing)">
            <input className="field-input" value={svReality} onChange={(e) => setSvReality(e.target.value)} placeholder="He had years of proven combat training" />
          </Field>
        </div>
        <button
          type="button"
          onClick={addShockValueFact}
          disabled={svSaving || !svFact.trim() || !svTopic.trim() || !svNiche.trim() || svScoreNum == null}
          className="rounded-[3px] bg-gold px-4 py-2.5 text-sm font-semibold text-navy-deep transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {svSaving ? "Adding…" : "Add Fact"}
        </button>
        {facts.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {facts.map((f) => (
              <li key={f.id} className="rounded-[3px] border border-white/8 bg-black/25 px-3 py-2 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-cream">{f.fact}</span>
                  <span className={`shrink-0 font-mono text-[11px] font-bold ${f.shock_score >= SHOCK_VALUE_GATE ? "text-gold" : "text-steel/60"}`}>
                    {f.shock_score}
                  </span>
                </div>
                <div className="micro-label-steel mt-1">{f.niche} · {f.topic}</div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        label="Six Power Words"
        hint="Step 4a. Subject / Action / Objective / Contrast are required in every hook. Proof and Time are optional intensifiers."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Slot">
            <select className="field-input" value={spwSlot} onChange={(e) => setSpwSlot(e.target.value as PowerWordSlot)}>
              {POWER_WORD_SLOTS.map((s) => (
                <option key={s} value={s}>
                  {s}{(CORE_SLOTS as readonly string[]).includes(s) ? " (core)" : " (intensifier)"}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Example">
            <input className="field-input" value={spwExample} onChange={(e) => setSpwExample(e.target.value)} placeholder="dropped a nine foot giant" />
          </Field>
          <Field label="Niches (comma separated)">
            <input className="field-input" value={spwNiche} onChange={(e) => setSpwNiche(e.target.value)} placeholder="masculinity-identity" />
          </Field>
        </div>
        <button
          type="button"
          onClick={addSixPowerWord}
          disabled={spwSaving || !spwExample.trim()}
          className="rounded-[3px] bg-gold px-4 py-2.5 text-sm font-semibold text-navy-deep transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {spwSaving ? "Adding…" : "Add Slot Filler"}
        </button>
        {sixWords.length > 0 && (
          <div className="mt-2 space-y-3">
            {POWER_WORD_SLOTS.map((slot) => {
              const rows = sixWords.filter((w) => w.slot === slot);
              if (!rows.length) return null;
              return (
                <div key={slot}>
                  <div className="micro-label-steel mb-1.5">
                    {slot}
                    {(CORE_SLOTS as readonly string[]).includes(slot) && <span className="text-gold"> · core</span>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {rows.map((w) => (
                      <span key={w.id} className="rounded-[3px] border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-cream">
                        {w.example}
                        {w.niche.length > 0 && <span className="ml-2 text-steel/70">{w.niche.join(", ")}</span>}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

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
