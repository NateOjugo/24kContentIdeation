import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { createClient } from "@/lib/supabase/server";
import { OUTLIER_MIN_SCRIPTS, SHOCK_VALUE_THRESHOLD, type Script } from "@/lib/scripts";
import { computeOutliers, outlierBaseline, OUTLIER_TIERS, type OutlierTier } from "@/lib/outlier";
import {
  perfScriptCount,
  rankBy,
  shockValueComparison,
  winningFormula,
  type RankRow,
} from "@/lib/patterns";

export const metadata = { title: "Pattern Engine — 24K Script Vault" };
export const dynamic = "force-dynamic";

function pct(v: number | null): string {
  if (v == null) return "—";
  return `${v.toFixed(1)}`;
}

function RankTable({ title, rows, note }: { title: string; rows: RankRow[]; note?: string }) {
  if (rows.length === 0) return null;
  return (
    <div className="accent-card p-5">
      <div className="micro-label mb-1">{title}</div>
      {note && <p className="mb-3 text-xs text-steel">{note}</p>}
      <table className="mt-2 w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 text-left">
            <th className="micro-label-steel pb-2 font-bold">&nbsp;</th>
            <th className="micro-label-steel pb-2 pl-3 text-right font-bold">Perf</th>
            <th className="micro-label-steel hidden pb-2 pl-3 text-right font-bold sm:table-cell">Save%</th>
            <th className="micro-label-steel hidden pb-2 pl-3 text-right font-bold sm:table-cell">Share%</th>
            <th className="micro-label-steel pb-2 pl-3 text-right font-bold">Ret%</th>
            <th className="micro-label-steel pb-2 pl-3 text-right font-bold">N</th>
            <th className="micro-label-steel pb-2 pl-3 text-right font-bold">Amz</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.label} className="border-b border-white/5 last:border-0">
              <td className={`py-2 pr-2 ${i === 0 ? "font-semibold text-gold" : "text-cream"}`}>{r.label}</td>
              <td className="py-2 pl-3 text-right font-mono text-[13px] text-cream">{pct(r.avgPerformance)}</td>
              <td className="hidden py-2 pl-3 text-right font-mono text-[13px] text-steel sm:table-cell">{pct(r.avgSaveRate)}</td>
              <td className="hidden py-2 pl-3 text-right font-mono text-[13px] text-steel sm:table-cell">{pct(r.avgShareRate)}</td>
              <td className="py-2 pl-3 text-right font-mono text-[13px] text-steel">{pct(r.avgRetention)}</td>
              <td className="py-2 pl-3 text-right font-mono text-[13px] text-steel">{r.n}</td>
              <td className="py-2 pl-3 text-right font-mono text-[13px] text-gold">{r.amazing || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const TIER_STYLE: Record<OutlierTier, string> = {
  Amazing: "border-gold/40 bg-gold/10 text-gold",
  "Semi-Good": "border-white/15 bg-white/5 text-cream",
  Poor: "border-white/10 bg-black/25 text-steel",
};

export default async function PatternsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("scripts").select("*");
  const scripts = (data ?? []) as Script[];
  const withPerf = perfScriptCount(scripts);

  const baseline = outlierBaseline(scripts);
  const outliers = computeOutliers(scripts);
  const amazingIds = new Set(
    scripts.filter((s) => {
      const o = outliers.get(s.id);
      return o?.established && o.tier === "Amazing";
    }).map((s) => s.id)
  );

  // Group scripts into outlier tiers (the primary grouping)
  const byTier: Record<OutlierTier, { id: string; title: string; multiplier: number; reach: boolean }[]> = {
    Amazing: [],
    "Semi-Good": [],
    Poor: [],
  };
  if (baseline.established) {
    for (const s of scripts) {
      const o = outliers.get(s.id);
      if (o?.established) {
        byTier[o.tier].push({ id: s.id, title: s.title, multiplier: o.multiplier, reach: o.reachOutlier });
      }
    }
  }

  const formula = winningFormula(scripts, amazingIds);
  const shock = shockValueComparison(scripts);

  return (
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-6">
          <div className="micro-label mb-2">Pattern Engine</div>
          <h1 className="font-display text-4xl tracking-wide text-cream sm:text-5xl">What Actually Converts</h1>
          <p className="mt-1 text-sm text-steel">
            Grouped by Outlier Score, ranked by save rate + share rate + retention. Save and share weigh heaviest.
          </p>
        </div>

        {error && <p className="text-sm text-gold">Query error: {error.message}</p>}

        {!error && withPerf < 3 && (
          <div className="accent-card p-8 text-center">
            <p className="text-sm leading-relaxed text-steel">
              The Pattern Engine needs at least 3 scripts with performance data to say anything worth
              trusting. Right now it has {withPerf}.
              <br />
              Log past scripts with their real numbers and this page starts working.
            </p>
            <Link href="/log" className="mt-5 inline-block rounded-[3px] bg-gold px-5 py-2.5 text-sm font-semibold text-navy-deep hover:opacity-90">
              Log a Script
            </Link>
          </div>
        )}

        {!error && withPerf >= 3 && (
          <div className="space-y-5">
            {/* Outlier tier breakdown — the primary grouping */}
            <div className="accent-card p-5">
              <div className="micro-label mb-1">Outlier Tiers</div>
              {!baseline.established ? (
                <p className="text-sm text-steel">
                  Baseline not yet established. Outlier Score compares each video&rsquo;s Views to your median,
                  and needs at least {OUTLIER_MIN_SCRIPTS} performance-logged scripts first (you have {baseline.n}).
                </p>
              ) : (
                <>
                  <p className="mb-4 text-xs text-steel">
                    Views vs your median ({Math.round(baseline.medianViews!).toLocaleString()}). Poor &lt;1x · Semi-Good 1–2.9x · Amazing ≥3x.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {OUTLIER_TIERS.map((tier) => (
                      <div key={tier} className={`rounded-[3px] border p-4 ${TIER_STYLE[tier]}`}>
                        <div className="flex items-baseline justify-between">
                          <span className="micro-label" style={{ color: "inherit" }}>{tier}</span>
                          <span className="font-display text-2xl">{byTier[tier].length}</span>
                        </div>
                        <ul className="mt-2 space-y-1">
                          {byTier[tier].slice(0, 5).map((s) => (
                            <li key={s.id} className="truncate text-[13px]">
                              <Link href={`/scripts/${s.id}`} className="underline-offset-2 hover:underline">{s.title}</Link>
                              <span className="ml-1 font-mono text-[10px] opacity-70">{s.multiplier.toFixed(1)}x{s.reach ? " ⚠" : ""}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-steel">⚠ = Reach Outlier: high views but below-median save and share rate. Verify quality before repeating.</p>
                </>
              )}
            </div>

            {formula && (
              <div className="relative overflow-hidden rounded-[4px] border border-gold/40 bg-gold/8 p-6">
                <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-transparent via-gold to-transparent" />
                <div className="micro-label mb-3">Winning Formula</div>
                <div className="mb-4 flex flex-wrap gap-2">
                  {formula.shared.map((s) => (
                    <span key={s.field} className="rounded-[2px] border border-gold/40 bg-gold/10 px-2.5 py-1 font-mono text-[11px] font-bold tracking-[0.08em] text-gold uppercase">
                      {s.field}: {s.value}
                    </span>
                  ))}
                </div>
                <p className="text-sm text-cream/90">
                  Your {formula.basis === "amazing" ? "Amazing outliers" : "top performers"} all share{" "}
                  {formula.shared.length === 1 ? "this" : "these"}:
                </p>
                <ul className="mt-2 space-y-1">
                  {formula.topScripts.map((t) => (
                    <li key={t.id} className="text-sm">
                      <Link href={`/scripts/${t.id}`} className="text-cream underline-offset-2 hover:underline">{t.title}</Link>{" "}
                      <span className="font-mono text-[11px] text-steel">{t.metric.toFixed(1)} perf</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <RankTable title="Hook Formats" rows={rankBy(scripts, (s) => s.hook_format, amazingIds)} />
            <RankTable
              title="Story Structures"
              rows={rankBy(scripts.filter((s) => s.platform === "YouTube"), (s) => s.story_structure, amazingIds)}
              note="YouTube scripts only."
            />
            <RankTable title="Target Emotions" rows={rankBy(scripts, (s) => s.target_emotion, amazingIds)} />
            <RankTable title="Pillars" rows={rankBy(scripts, (s) => s.pillar, amazingIds)} />
            <RankTable title="Content Series" rows={rankBy(scripts, (s) => s.content_series, amazingIds)} />

            {(shock.low.n > 0 || shock.high.n > 0) && (
              <div className="accent-card p-5">
                <div className="micro-label mb-1">Shock Value Check</div>
                <p className="mb-4 text-xs text-steel">
                  Does breaking your own {SHOCK_VALUE_THRESHOLD}+ rule cost you? Scripts scored below {SHOCK_VALUE_THRESHOLD} vs the ones that passed.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-[3px] border border-white/10 bg-black/25 p-4">
                    <div className="micro-label-steel mb-2">Below {SHOCK_VALUE_THRESHOLD} ({shock.low.n})</div>
                    <div className="font-display text-3xl text-cream">{pct(shock.low.avgPerformance)}</div>
                    <div className="text-xs text-steel">avg performance</div>
                    <div className="mt-1 font-mono text-[11px] text-steel">{pct(shock.low.avgRetention)}% avg retention</div>
                  </div>
                  <div className="rounded-[3px] border border-gold/30 bg-gold/5 p-4">
                    <div className="micro-label mb-2">{SHOCK_VALUE_THRESHOLD}+ ({shock.high.n})</div>
                    <div className="font-display text-3xl text-cream">{pct(shock.high.avgPerformance)}</div>
                    <div className="text-xs text-steel">avg performance</div>
                    <div className="mt-1 font-mono text-[11px] text-steel">{pct(shock.high.avgRetention)}% avg retention</div>
                  </div>
                </div>
                {shock.lowScripts.length > 0 && (
                  <div className="mt-4 border-t border-white/8 pt-3">
                    <div className="micro-label-steel mb-2">Flagged — under threshold</div>
                    <ul className="space-y-1">
                      {shock.lowScripts.map((s) => (
                        <li key={s.id} className="flex items-center justify-between gap-3 text-sm">
                          <Link href={`/scripts/${s.id}`} className="min-w-0 truncate text-cream underline-offset-2 hover:underline">{s.title}</Link>
                          <span className="shrink-0 font-mono text-[11px] text-gold">{s.score}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}
