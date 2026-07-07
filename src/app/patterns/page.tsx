import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { createClient } from "@/lib/supabase/server";
import { formatCount, SHOCK_VALUE_THRESHOLD, type Script } from "@/lib/scripts";
import {
  perfScriptCount,
  rankBy,
  shockValueComparison,
  winningFormula,
  type RankRow,
} from "@/lib/patterns";

export const metadata = { title: "Pattern Engine — 24K Script Vault" };
export const dynamic = "force-dynamic";

function fmtAvg(v: number | null): string {
  if (v == null) return "—";
  return formatCount(Math.round(v));
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
            <th className="micro-label-steel pb-2 pl-3 text-right font-bold">Saves+Shares</th>
            <th className="micro-label-steel pb-2 pl-3 text-right font-bold">Followers</th>
            <th className="micro-label-steel hidden pb-2 pl-3 text-right font-bold sm:table-cell">Views</th>
            <th className="micro-label-steel pb-2 pl-3 text-right font-bold">N</th>
            <th className="micro-label-steel pb-2 pl-3 text-right font-bold">Wins</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.label} className="border-b border-white/5 last:border-0">
              <td className={`py-2 pr-2 ${i === 0 ? "font-semibold text-gold" : "text-cream"}`}>
                {r.label}
              </td>
              <td className="py-2 pl-3 text-right font-mono text-[13px] text-cream">{fmtAvg(r.avgSavesShares)}</td>
              <td className="py-2 pl-3 text-right font-mono text-[13px] text-cream">{fmtAvg(r.avgFollowers)}</td>
              <td className="hidden py-2 pl-3 text-right font-mono text-[13px] text-steel sm:table-cell">{fmtAvg(r.avgViews)}</td>
              <td className="py-2 pl-3 text-right font-mono text-[13px] text-steel">{r.n}</td>
              <td className="py-2 pl-3 text-right font-mono text-[13px] text-steel">{r.wins || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function PatternsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("scripts").select("*");
  const scripts = (data ?? []) as Script[];
  const withPerf = perfScriptCount(scripts);

  const formula = winningFormula(scripts);
  const shock = shockValueComparison(scripts);

  return (
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-6">
          <div className="micro-label mb-2">Pattern Engine</div>
          <h1 className="font-display text-4xl tracking-wide text-cream sm:text-5xl">
            What Actually Converts
          </h1>
          <p className="mt-1 text-sm text-steel">
            Ranked by average saves + shares — the primary signals. Followers gained runs beside it.
          </p>
        </div>

        {error && <p className="text-sm text-gold">Query error: {error.message}</p>}

        {!error && withPerf < 3 && (
          <div className="accent-card p-8 text-center">
            <p className="text-sm leading-relaxed text-steel">
              The Pattern Engine needs at least 3 scripts with performance data to say
              anything worth trusting. Right now it has {withPerf}.
              <br />
              Log past scripts with their real numbers and this page starts working.
            </p>
            <Link
              href="/log"
              className="mt-5 inline-block rounded-[3px] bg-gold px-5 py-2.5 text-sm font-semibold text-navy-deep hover:opacity-90"
            >
              Log a Script
            </Link>
          </div>
        )}

        {!error && withPerf >= 3 && (
          <div className="space-y-5">
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
                  Your 3 highest performers all share {formula.shared.length === 1 ? "this" : "these"}:
                </p>
                <ul className="mt-2 space-y-1">
                  {formula.topScripts.map((t) => (
                    <li key={t.id} className="text-sm">
                      <Link href={`/scripts/${t.id}`} className="text-cream underline-offset-2 hover:underline">
                        {t.title}
                      </Link>{" "}
                      <span className="font-mono text-[11px] text-steel">
                        {formatCount(t.metric)} saves+shares
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <RankTable title="Hook Formats" rows={rankBy(scripts, (s) => s.hook_format)} />
            <RankTable
              title="Story Structures"
              rows={rankBy(scripts.filter((s) => s.platform === "YouTube"), (s) => s.story_structure)}
              note="YouTube scripts only."
            />
            <RankTable title="Target Emotions" rows={rankBy(scripts, (s) => s.target_emotion)} />
            <RankTable title="Pillars" rows={rankBy(scripts, (s) => s.pillar)} />
            <RankTable title="Content Series" rows={rankBy(scripts, (s) => s.content_series)} />

            {(shock.low.n > 0 || shock.high.n > 0) && (
              <div className="accent-card p-5">
                <div className="micro-label mb-1">Shock Value Check</div>
                <p className="mb-4 text-xs text-steel">
                  Does breaking your own {SHOCK_VALUE_THRESHOLD}+ rule cost you? Scripts scored below{" "}
                  {SHOCK_VALUE_THRESHOLD} vs the ones that passed.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-[3px] border border-white/10 bg-black/25 p-4">
                    <div className="micro-label-steel mb-2">Below {SHOCK_VALUE_THRESHOLD} ({shock.low.n})</div>
                    <div className="font-display text-3xl text-cream">{fmtAvg(shock.low.avgSavesShares)}</div>
                    <div className="text-xs text-steel">avg saves+shares</div>
                    <div className="mt-1 font-mono text-[11px] text-steel">{fmtAvg(shock.low.avgViews)} avg views</div>
                  </div>
                  <div className="rounded-[3px] border border-gold/30 bg-gold/5 p-4">
                    <div className="micro-label mb-2">{SHOCK_VALUE_THRESHOLD}+ ({shock.high.n})</div>
                    <div className="font-display text-3xl text-cream">{fmtAvg(shock.high.avgSavesShares)}</div>
                    <div className="text-xs text-steel">avg saves+shares</div>
                    <div className="mt-1 font-mono text-[11px] text-steel">{fmtAvg(shock.high.avgViews)} avg views</div>
                  </div>
                </div>
                {shock.lowScripts.length > 0 && (
                  <div className="mt-4 border-t border-white/8 pt-3">
                    <div className="micro-label-steel mb-2">Flagged — under threshold</div>
                    <ul className="space-y-1">
                      {shock.lowScripts.map((s) => (
                        <li key={s.id} className="flex items-center justify-between gap-3 text-sm">
                          <Link href={`/scripts/${s.id}`} className="min-w-0 truncate text-cream underline-offset-2 hover:underline">
                            {s.title}
                          </Link>
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
