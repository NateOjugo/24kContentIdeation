"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  fetchPowerWordsForNiche,
  fetchMetaphorsForNiche,
  groupPowerWordsByFn,
  type HookFormatTemplate,
  type Metaphor,
  type PowerWord,
} from "@/lib/hooksBank";
import {
  EMOTIONS,
  HOOK_FORMATS,
  PILLARS,
  PLATFORMS,
  STORY_STRUCTURES,
  type Emotion,
  type HookFormat,
  type Pillar,
  type Platform,
  type StoryStructure,
} from "@/lib/scripts";

type Gate = {
  pillar: Pillar;
  pillar_secondary: Pillar | null;
  target_emotion: Emotion;
  hook_format: HookFormat | null;
  story_structure: StoryStructure | null;
  reasoning?: string;
};

function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  allowEmpty,
}: {
  label: string;
  value: T | null;
  options: readonly T[];
  onChange: (v: T | null) => void;
  allowEmpty?: boolean;
}) {
  return (
    <label className="block">
      <span className="micro-label-steel mb-1.5 block">{label}</span>
      <select
        className="field-input"
        value={value ?? ""}
        onChange={(e) => onChange((e.target.value || null) as T | null)}
      >
        {allowEmpty && <option value="">None</option>}
        {!allowEmpty && value === null && <option value="">Select…</option>}
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}

export function HooksGenerateForm({ hookFormatTemplates }: { hookFormatTemplates: HookFormatTemplate[] }) {
  const router = useRouter();
  const supabase = createClient();

  const [idea, setIdea] = useState("");
  const [title, setTitle] = useState("");
  const [niche, setNiche] = useState("");
  const [platform, setPlatform] = useState<Platform>("Reels");

  const [bankLoaded, setBankLoaded] = useState(false);
  const [loadingBank, setLoadingBank] = useState(false);
  const [powerWords, setPowerWords] = useState<PowerWord[]>([]);
  const [metaphors, setMetaphors] = useState<Metaphor[]>([]);
  const [selectedWordIds, setSelectedWordIds] = useState<Set<string>>(new Set());
  const [selectedMetaphorId, setSelectedMetaphorId] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const [gate, setGate] = useState<Gate | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isYouTube = platform === "YouTube";

  async function findBankMaterial() {
    if (!niche.trim()) return;
    setLoadingBank(true);
    setError(null);
    try {
      const [words, metas] = await Promise.all([
        fetchPowerWordsForNiche(supabase, niche),
        fetchMetaphorsForNiche(supabase, niche),
      ]);
      setPowerWords(words);
      setMetaphors(metas);
      setBankLoaded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingBank(false);
    }
  }

  function toggleWord(id: string) {
    setSelectedWordIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function suggestGate() {
    setSuggesting(true);
    setError(null);
    try {
      const res = await fetch("/api/suggest-gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, platform }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setGate(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSuggesting(false);
    }
  }

  function manualGate() {
    setGate({ pillar: "TRAIN", pillar_secondary: null, target_emotion: "Awe", hook_format: null, story_structure: null });
  }

  async function generate() {
    if (!gate?.hook_format || (isYouTube && !gate.story_structure)) {
      setError(`Packaging Gate incomplete: ${!gate?.hook_format ? "Hook Format" : "Story Structure"}`);
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/hooks-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea,
          title,
          niche,
          platform,
          pillar: gate.pillar,
          pillarSecondary: gate.pillar_secondary,
          emotion: gate.target_emotion,
          hookFormat: gate.hook_format,
          storyStructure: gate.story_structure,
          hookFormatId: selectedTemplateId,
          metaphorId: selectedMetaphorId,
          powerWordIds: [...selectedWordIds],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      router.push(`/scripts/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setGenerating(false);
    }
  }

  const grouped = groupPowerWordsByFn(powerWords);

  return (
    <section className="accent-card space-y-5 p-5 sm:p-6">
      <div>
        <div className="micro-label mb-1">Generate From The Bank</div>
        <p className="text-xs text-steel">
          Same Script Skill + voice corrections as Generate, plus the Reference Framework and whatever bank material you pick below.
        </p>
      </div>

      <textarea
        rows={4}
        className="field-input"
        placeholder="Topic / raw idea…"
        value={idea}
        onChange={(e) => setIdea(e.target.value)}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="micro-label-steel mb-1.5 block">Title (optional)</span>
          <input className="field-input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="block">
          <span className="micro-label-steel mb-1.5 block">Niche</span>
          <input className="field-input" value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="fitness" />
        </label>
        <div>
          <span className="micro-label-steel mb-1.5 block">Platform</span>
          <div className="grid grid-cols-2 gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPlatform(p)}
                className={`rounded-[3px] border px-3 py-2.5 text-sm font-medium transition-colors ${
                  platform === p ? "border-gold bg-gold/15 text-gold" : "border-white/10 bg-black/30 text-steel hover:text-cream"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={findBankMaterial}
        disabled={!niche.trim() || loadingBank}
        className="rounded-[3px] border border-gold/40 px-4 py-2.5 text-sm text-gold transition-opacity hover:opacity-80 disabled:opacity-50"
      >
        {loadingBank ? "Searching the bank…" : "Find Matching Bank Material"}
      </button>

      {bankLoaded && (
        <div className="space-y-4 rounded-[3px] border border-white/8 bg-black/20 p-4">
          {Object.entries(grouped).map(([fn, words]) =>
            words.length ? (
              <div key={fn}>
                <div className="micro-label-steel mb-1.5">{fn}</div>
                <div className="flex flex-wrap gap-2">
                  {words.map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => toggleWord(w.id)}
                      className={`rounded-[3px] border px-3 py-1.5 text-xs transition-colors ${
                        selectedWordIds.has(w.id) ? "border-gold bg-gold/15 text-gold" : "border-white/10 bg-black/30 text-steel hover:text-cream"
                      }`}
                    >
                      &ldquo;{w.phrase}&rdquo;
                    </button>
                  ))}
                </div>
              </div>
            ) : null
          )}
          {powerWords.length === 0 && metaphors.length === 0 && (
            <p className="text-xs text-steel">No bank material tagged for this niche yet — generation still works, just without it.</p>
          )}

          {metaphors.length > 0 && (
            <div>
              <div className="micro-label-steel mb-1.5">Metaphors (pick one)</div>
              <div className="space-y-1.5">
                {metaphors.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedMetaphorId(selectedMetaphorId === m.id ? null : m.id)}
                    className={`block w-full rounded-[3px] border px-3 py-2 text-left text-xs transition-colors ${
                      selectedMetaphorId === m.id ? "border-gold bg-gold/15 text-gold" : "border-white/10 bg-black/30 text-steel hover:text-cream"
                    }`}
                  >
                    {m.concrete_anchor} <span className="opacity-60">→</span> {m.meaning_layer}
                  </button>
                ))}
              </div>
            </div>
          )}

          {hookFormatTemplates.length > 0 && (
            <div>
              <div className="micro-label-steel mb-1.5">Hook Format Template (optional structural inspiration)</div>
              <div className="space-y-1.5">
                {hookFormatTemplates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTemplateId(selectedTemplateId === t.id ? null : t.id)}
                    className={`block w-full rounded-[3px] border px-3 py-2 text-left text-xs transition-colors ${
                      selectedTemplateId === t.id ? "border-gold bg-gold/15 text-gold" : "border-white/10 bg-black/30 text-steel hover:text-cream"
                    }`}
                  >
                    <span className="text-cream">{t.name}</span> — {t.template}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={!idea.trim() || suggesting}
          onClick={suggestGate}
          className="rounded-[3px] bg-gold px-4 py-2.5 text-sm font-semibold text-navy-deep transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {suggesting ? "Reading the idea…" : "Suggest Packaging Gate"}
        </button>
        <button
          type="button"
          disabled={!idea.trim()}
          onClick={manualGate}
          className="rounded-[3px] border border-white/15 px-4 py-2.5 text-sm text-steel transition-colors hover:text-cream disabled:opacity-50"
        >
          Set it manually
        </button>
      </div>

      {gate && (
        <div className="border-t border-white/8 pt-4">
          <div className="micro-label mb-1">Packaging Gate</div>
          {gate.reasoning && <p className="mb-4 text-sm text-steel">{gate.reasoning}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Pillar / Lane" value={gate.pillar} options={PILLARS} onChange={(v) => v && setGate({ ...gate, pillar: v })} />
            <Select label="Secondary Lane" value={gate.pillar_secondary} options={PILLARS.filter((p) => p !== gate.pillar)} onChange={(v) => setGate({ ...gate, pillar_secondary: v })} allowEmpty />
            <Select label="Target Emotion" value={gate.target_emotion} options={EMOTIONS} onChange={(v) => v && setGate({ ...gate, target_emotion: v })} />
            <Select label="Hook Format" value={gate.hook_format} options={HOOK_FORMATS} onChange={(v) => setGate({ ...gate, hook_format: v })} />
            {isYouTube && (
              <Select label="Story Structure" value={gate.story_structure} options={STORY_STRUCTURES} onChange={(v) => setGate({ ...gate, story_structure: v })} />
            )}
          </div>

          <button
            type="button"
            disabled={generating}
            onClick={generate}
            className="mt-5 w-full rounded-[3px] bg-gold px-4 py-3 text-sm font-semibold text-navy-deep transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {generating ? "Writing the script… this can take a minute or two" : `Generate ${platform} Script`}
          </button>
        </div>
      )}

      {error && (
        <p className="text-sm text-gold" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
