"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppNav } from "@/components/AppNav";
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

type Structure = {
  hook_format: HookFormat;
  story_structure: StoryStructure | null;
  hook_breakdown: string;
  rehook_placement: string;
  dopamine_ladder_pacing: string;
  shock_value_angle: string;
  structural_map: string;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="micro-label-steel mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

function MapRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-white/8 py-2 first:border-0">
      <div className="micro-label-steel mb-0.5">{label}</div>
      <div className="text-sm text-cream/90">{value}</div>
    </div>
  );
}

export default function RemixPage() {
  const router = useRouter();
  const [transcript, setTranscript] = useState("");
  const [structure, setStructure] = useState<Structure | null>(null);
  const [extracting, setExtracting] = useState(false);

  const [take, setTake] = useState("");
  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState<Platform>("Reels");
  const [pillar, setPillar] = useState<Pillar>("TRAIN");
  const [pillarSecondary, setPillarSecondary] = useState<Pillar | "">("");
  const [emotion, setEmotion] = useState<Emotion>("Awe");
  const [hookFormat, setHookFormat] = useState<HookFormat | "">("");
  const [storyStructure, setStoryStructure] = useState<StoryStructure | "">("");

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isYouTube = platform === "YouTube";

  async function extract() {
    setExtracting(true);
    setError(null);
    try {
      const res = await fetch("/api/extract-structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setStructure(data);
      setHookFormat(data.hook_format);
      if (data.story_structure) {
        setStoryStructure(data.story_structure);
        setPlatform("YouTube");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setExtracting(false);
    }
  }

  async function remix() {
    if (!hookFormat || (isYouTube && !storyStructure)) {
      setError(`Set ${!hookFormat ? "Hook Format" : "Story Structure"} first`);
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/remix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          take,
          title,
          platform,
          pillar,
          pillarSecondary: pillarSecondary || null,
          emotion,
          hookFormat,
          storyStructure,
          structureMap: structure?.structural_map,
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

  return (
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-6">
          <div className="micro-label mb-2">Transcript to Remix</div>
          <h1 className="font-display text-4xl tracking-wide text-cream">
            Steal the Structure. Not the Words.
          </h1>
          <p className="mt-1 text-sm text-steel">
            Paste a transcript, pull its skeleton, then build your own take on that proven shape.
          </p>
        </div>

        {/* Step 1 — Paste Transcript */}
        <section className="accent-card mb-5 p-5 sm:p-6">
          <div className="micro-label mb-4">1 — Paste Transcript</div>
          <textarea
            rows={7}
            className="field-input font-mono text-[13px]"
            placeholder="Paste the full transcript (timestamps optional)…"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
          />
          <button
            type="button"
            disabled={transcript.trim().length < 100 || extracting}
            onClick={extract}
            className="mt-4 rounded-[3px] bg-gold px-4 py-2.5 text-sm font-semibold text-navy-deep transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {extracting ? "Mapping the structure…" : "Extract Structure"}
          </button>
        </section>

        {/* Step 2 — Structure Map */}
        {structure && (
          <section className="accent-card mb-5 p-5 sm:p-6" data-active="true">
            <div className="micro-label mb-3">2 — Structure Map (scaffolding only)</div>
            <MapRow label="Hook Format" value={structure.hook_format} />
            {structure.story_structure && <MapRow label="Story Structure" value={structure.story_structure} />}
            <MapRow label="Hook Breakdown" value={structure.hook_breakdown} />
            <MapRow label="Re-Hook Placement" value={structure.rehook_placement} />
            <MapRow label="Dopamine Ladder Pacing" value={structure.dopamine_ladder_pacing} />
            <MapRow label="Shock Value Angle" value={structure.shock_value_angle} />
            <MapRow label="Reusable Skeleton" value={structure.structural_map} />
          </section>
        )}

        {/* Step 3 — Your Take + Packaging Gate */}
        {structure && (
          <section className="accent-card mb-5 p-5 sm:p-6">
            <div className="micro-label mb-4">3 — Your Take</div>
            <Field label="Your idea / angle / point of view (this becomes the actual content)">
              <textarea
                rows={5}
                className="field-input"
                placeholder="What's YOUR take on this topic? The structure is just scaffolding."
                value={take}
                onChange={(e) => setTake(e.target.value)}
              />
            </Field>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Title (optional)">
                <input className="field-input" value={title} onChange={(e) => setTitle(e.target.value)} />
              </Field>
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
              <Field label="Pillar / Lane">
                <select className="field-input" value={pillar} onChange={(e) => setPillar(e.target.value as Pillar)}>
                  {PILLARS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="Secondary Lane">
                <select className="field-input" value={pillarSecondary} onChange={(e) => setPillarSecondary(e.target.value as Pillar | "")}>
                  <option value="">None</option>
                  {PILLARS.filter((p) => p !== pillar).map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="Target Emotion">
                <select className="field-input" value={emotion} onChange={(e) => setEmotion(e.target.value as Emotion)}>
                  {EMOTIONS.map((em) => <option key={em} value={em}>{em}</option>)}
                </select>
              </Field>
              <Field label="Hook Format">
                <select className="field-input" value={hookFormat} onChange={(e) => setHookFormat(e.target.value as HookFormat | "")}>
                  <option value="">Select…</option>
                  {HOOK_FORMATS.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </Field>
              {isYouTube && (
                <Field label="Story Structure">
                  <select className="field-input" value={storyStructure} onChange={(e) => setStoryStructure(e.target.value as StoryStructure | "")}>
                    <option value="">Select…</option>
                    {STORY_STRUCTURES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
              )}
            </div>

            <button
              type="button"
              disabled={!take.trim() || generating}
              onClick={remix}
              className="mt-5 w-full rounded-[3px] bg-gold px-4 py-3 text-sm font-semibold text-navy-deep transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {generating ? "Remixing… this can take a minute or two" : `Generate ${platform} Remix`}
            </button>
          </section>
        )}

        {error && <p className="text-sm text-gold" role="alert">{error}</p>}
      </main>
    </>
  );
}
