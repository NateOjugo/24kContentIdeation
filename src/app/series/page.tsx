import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { createClient } from "@/lib/supabase/server";
import { formatCount, savesSharesWeight, type Script } from "@/lib/scripts";

export const metadata = { title: "Series View — 24K Script Vault" };
export const dynamic = "force-dynamic";

function metricCell(v: number | null, highlight = false) {
  return (
    <td className={`py-2 pl-3 text-right font-mono text-[13px] ${highlight ? "text-gold" : "text-cream"}`}>
      {formatCount(v)}
    </td>
  );
}

export default async function SeriesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scripts")
    .select("*")
    .not("content_series", "is", null)
    .order("date_posted", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  const scripts = (data ?? []) as Script[];

  // group by series
  const groups = new Map<string, Script[]>();
  for (const s of scripts) {
    const key = s.content_series!;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(s);
  }

  return (
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-6">
          <div className="micro-label mb-2">Series View</div>
          <h1 className="font-display text-4xl tracking-wide text-cream sm:text-5xl">
            Episode vs Episode
          </h1>
          <p className="mt-1 text-sm text-steel">
            Every series side by side. Diagnose why one episode outran another.
          </p>
        </div>

        {error && <p className="text-sm text-gold">Query error: {error.message}</p>}

        {groups.size === 0 && !error && (
          <div className="accent-card p-10 text-center">
            <p className="text-sm text-steel">
              No scripts tagged with a Content Series yet. Set one on the logger and
              they group here.
            </p>
          </div>
        )}

        <div className="space-y-6">
          {[...groups.entries()].map(([series, eps]) => {
            const best = eps.reduce(
              (max, s) => Math.max(max, savesSharesWeight(s)),
              0
            );
            return (
              <section key={series} className="accent-card p-5">
                <div className="mb-3 flex items-baseline justify-between gap-3">
                  <h2 className="font-display text-2xl tracking-wide text-cream">{series}</h2>
                  <span className="micro-label-steel">{eps.length} episode{eps.length === 1 ? "" : "s"}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-left">
                        <th className="micro-label-steel pb-2 font-bold">Episode</th>
                        <th className="micro-label-steel pb-2 pl-3 text-right font-bold">Saves+Sh</th>
                        <th className="micro-label-steel pb-2 pl-3 text-right font-bold">Views</th>
                        <th className="micro-label-steel pb-2 pl-3 text-right font-bold">Followers</th>
                        <th className="micro-label-steel hidden pb-2 pl-3 text-right font-bold sm:table-cell">Shock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eps.map((s) => {
                        const ss = savesSharesWeight(s);
                        const isBest = best > 0 && ss === best;
                        return (
                          <tr key={s.id} className="border-b border-white/5 last:border-0">
                            <td className="py-2 pr-2">
                              <Link href={`/scripts/${s.id}`} className="text-cream underline-offset-2 hover:underline">
                                {s.title}
                              </Link>
                              {s.winning && (
                                <span className="ml-2 font-mono text-[9px] font-bold tracking-[0.08em] text-gold uppercase">
                                  win
                                </span>
                              )}
                              <span className="ml-2 font-mono text-[10px] text-steel/70">
                                {s.date_posted ?? "unposted"}
                              </span>
                            </td>
                            {metricCell(s.saves != null || s.shares != null ? ss : null, isBest)}
                            {metricCell(s.views)}
                            {metricCell(s.followers_gained)}
                            <td className={`hidden py-2 pl-3 text-right font-mono text-[13px] sm:table-cell ${
                              s.shock_value_score != null && s.shock_value_score < 80 ? "text-gold" : "text-steel"
                            }`}>
                              {s.shock_value_score ?? "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
        </div>
      </main>
    </>
  );
}
