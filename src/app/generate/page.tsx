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

export default function GeneratePage() {
  const router = useRouter();
  const [idea, setIdea] = useState("");
  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState<Platform>("Reels");
  const [gate, setGate] = useState<Gate | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isYouTube = platform === "YouTube";

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
    setGate({
      pillar: "TRAIN",
      pillar_secondary: null,
      target_emotion: "Awe",
      hook_format: null,
      story_structure: null,
    });
  }

  async function generate() {
    if (!gate?.hook_format || (isYouTube && !gate.story_structure)) {
      setError(`Packaging Gate incomplete: ${!gate?.hook_format ? "Hook Format" : "Story Structure"}`);
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea,
          title,
          platform,
          pillar: gate.pillar,
          pillarSecondary: gate.pillar_secondary,
          emotion: gate.target_emotion,
          hookFormat: gate.hook_format,
          storyStructure: gate.story_structure,
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
          <div className="micro-label mb-2">Generation</div>
          <h1 className="font-display text-4xl tracking-wide text-cream">
            Idea In. Script Out.
          </h1>
          <p className="mt-1 text-sm text-steel">
            Script Skill + hooks database + knowledge base + your voice corrections, every call.
          </p>
        </div>

        {/* Step 1 — Idea Intake */}
        <section className="accent-card mb-5 p-5 sm:p-6">
          <div className="micro-label mb-4">1 — Idea Intake</div>
          <textarea
            rows={5}
            className="field-input"
            placeholder="Paste the raw idea, voice-memo transcript, or NotebookLM notes…"
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
          />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="micro-label-steel mb-1.5 block">Title (optional — defaults to the idea)</span>
              <input className="field-input" value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <div>
              <span className="micro-label-steel mb-1.5 block">Platform</span>
              <div className="grid grid-cols-2 gap-2">
                {PLATFORMS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setPlatform(p);
                      if (gate && p === "Reels") setGate({ ...gate, story_structure: null });
                    }}
                    className={`rounded-[3px] border px-3 py-2.5 text-sm font-medium transition-colors ${
                      platform === p
                        ? "border-gold bg-gold/15 text-gold"
                        : "border-white/10 bg-black/30 text-steel hover:text-cream"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
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
        </section>

        {/* Step 2 — Packaging Gate (confirm or override) */}
        {gate && (
          <section className="accent-card mb-5 p-5 sm:p-6" data-active="true">
            <div className="micro-label mb-1">2 — Packaging Gate</div>
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
            {generating && (
              <p className="mt-2 text-center text-xs text-steel">
                Pulling matching hooks, retrieving strategy notes, and writing in the 24K voice. Stay on this page.
              </p>
            )}
          </section>
        )}

        {error && (
          <p className="text-sm text-gold" role="alert">
            {error}
          </p>
        )}
      </main>
    </>
  );
}
