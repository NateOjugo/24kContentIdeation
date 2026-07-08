"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { type Script } from "@/lib/scripts";

type OutlierLite = { label: string; established: boolean };

type Row = { label: string; get: (s: Script) => string };

const gate = (b: boolean | null) => (b === true ? "Pass" : b === false ? "Fail" : "—");
const pct = (v: number | null) => (v == null ? "—" : `${v}%`);
const numOr = (v: number | null) => (v == null ? "—" : String(v));

const FRAMEWORK_ROWS: Row[] = [
  { label: "Platform", get: (s) => s.platform },
  { label: "Pillar", get: (s) => (s.pillar_secondary ? `${s.pillar} + ${s.pillar_secondary}` : s.pillar) },
  { label: "Target Emotion", get: (s) => s.target_emotion },
  { label: "Hook Format", get: (s) => s.hook_format ?? "—" },
  { label: "Story Structure", get: (s) => s.story_structure ?? "—" },
  { label: "Content Series", get: (s) => s.content_series ?? "—" },
  { label: "Shock Value", get: (s) => numOr(s.shock_value_score) },
  { label: "CTA Type", get: (s) => s.cta_type ?? "—" },
  { label: "Re-Hook Count", get: (s) => numOr(s.re_hook_count) },
];

const GATE_ROWS: Row[] = [
  { label: "Click Confirmation", get: (s) => gate(s.click_confirmation_passed) },
  { label: "Hook Commandments", get: (s) => gate(s.hook_commandments_passed) },
  { label: "Atomic Shareability", get: (s) => gate(s.atomic_shareability_present) },
  { label: "Dopamine Ladder", get: (s) => gate(s.dopamine_ladder_used) },
  { label: "Album Strategy", get: (s) => gate(s.album_strategy_confirmed) },
];

const PERF_ROWS: Row[] = [
  { label: "Views", get: (s) => numOr(s.views) },
  { label: "Retention Rate", get: (s) => pct(s.retention_rate) },
  { label: "Save Rate", get: (s) => pct(s.save_rate) },
  { label: "Share Rate", get: (s) => pct(s.share_rate) },
  { label: "Like Rate", get: (s) => pct(s.like_rate) },
  { label: "Skip Rate", get: (s) => pct(s.skip_rate) },
  { label: "Comments", get: (s) => numOr(s.comments) },
  { label: "Followers Gained", get: (s) => numOr(s.followers_gained) },
];

function Group({ title, rows, scripts }: { title: string; rows: Row[]; scripts: Script[] }) {
  return (
    <>
      <tr>
        <td colSpan={scripts.length + 1} className="pt-4 pb-1">
          <span className="micro-label">{title}</span>
        </td>
      </tr>
      {rows.map((r) => {
        const values = scripts.map((s) => r.get(s));
        const differs = new Set(values).size > 1;
        return (
          <tr key={r.label} className={`border-b border-white/5 ${differs ? "bg-gold/[0.04]" : ""}`}>
            <td className="py-2 pr-3 align-top text-[13px] text-steel">
              {differs && <span className="mr-1 text-gold">•</span>}
              {r.label}
            </td>
            {values.map((v, i) => (
              <td
                key={i}
                className={`py-2 pl-3 align-top font-mono text-[13px] ${differs ? "text-cream" : "text-steel"}`}
              >
                {v}
              </td>
            ))}
          </tr>
        );
      })}
    </>
  );
}

export function CompareScripts({
  scripts,
  outliers,
}: {
  scripts: Script[];
  outliers: Record<string, OutlierLite>;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [explaining, setExplaining] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const chosen = useMemo(() => scripts.filter((s) => selected.has(s.id)), [scripts, selected]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setExplanation(null);
  }

  async function explain() {
    setExplaining(true);
    setError(null);
    setExplanation(null);
    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selected] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setExplanation(data.explanation);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setExplaining(false);
    }
  }

  if (scripts.length < 2) {
    return (
      <div className="accent-card p-8 text-center">
        <p className="text-sm text-steel">
          Compare needs at least two scripts with real performance data logged. You have {scripts.length}.
          Log past videos with their Instagram Insights numbers and they become comparison points.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Selector */}
      <div className="accent-card p-5">
        <div className="micro-label mb-1">Pick scripts to compare</div>
        <p className="mb-4 text-xs text-steel">
          Any performance-tracked script — including past videos you logged by hand. Pick two or more.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {scripts.map((s) => {
            const on = selected.has(s.id);
            const o = outliers[s.id];
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => toggle(s.id)}
                className={`flex items-center justify-between gap-3 rounded-[3px] border px-3 py-2.5 text-left transition-colors ${
                  on ? "border-gold bg-gold/10" : "border-white/10 bg-black/30 hover:border-white/20"
                }`}
              >
                <span className={`min-w-0 truncate text-sm ${on ? "text-cream" : "text-steel"}`}>{s.title}</span>
                <span className="shrink-0 font-mono text-[10px] tracking-[0.08em] uppercase text-steel">
                  {o?.established ? o.label.split(" —")[0] : "—"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Side-by-side */}
      {chosen.length >= 2 && (
        <div className="accent-card p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="micro-label">Side by Side</div>
            <button
              type="button"
              onClick={explain}
              disabled={explaining}
              className="rounded-[3px] bg-gold px-4 py-2 text-sm font-semibold text-navy-deep transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {explaining ? "Diagnosing…" : "Explain the Performance Gap"}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left">
                  <th className="micro-label-steel pb-2 pr-3 font-bold">Field</th>
                  {chosen.map((s) => (
                    <th key={s.id} className="pb-2 pl-3 text-left">
                      <Link href={`/scripts/${s.id}`} className="text-[13px] font-semibold text-cream underline-offset-2 hover:underline">
                        {s.title}
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <Group title="Framework Tags" rows={FRAMEWORK_ROWS} scripts={chosen} />
                <Group title="Quality Gate Snapshot" rows={GATE_ROWS} scripts={chosen} />
                <Group title="Performance" rows={PERF_ROWS} scripts={chosen} />
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-steel"><span className="text-gold">•</span> marks a row where the scripts differ.</p>
        </div>
      )}

      {error && <p className="text-sm text-gold" role="alert">{error}</p>}

      {explanation && (
        <div className="relative overflow-hidden rounded-[4px] border border-gold/40 bg-gold/8 p-6">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-transparent via-gold to-transparent" />
          <div className="micro-label mb-3">Likely Cause of the Gap</div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-cream/90">{explanation}</p>
        </div>
      )}
    </div>
  );
}
