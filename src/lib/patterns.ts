import { performanceScore, SHOCK_VALUE_THRESHOLD, type Script } from "./scripts";

// Rankings sort on the composite rate metric: save_rate + share_rate +
// retention_rate. Outlier tier (Amazing/Semi-Good/Poor) is the primary grouping.

export type RankRow = {
  label: string;
  n: number;
  avgPerformance: number | null; // composite save+share+retention
  avgSaveRate: number | null;
  avgShareRate: number | null;
  avgRetention: number | null;
  amazing: number; // count of Amazing-tier scripts in this group
};

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function nn(vals: (number | null)[]): number[] {
  return vals.filter((v): v is number => v != null);
}

/** A script has performance data once any rate or view count is logged. */
export function hasPerf(s: Script): boolean {
  return (
    s.views != null ||
    s.save_rate != null ||
    s.share_rate != null ||
    s.retention_rate != null ||
    s.like_rate != null ||
    s.skip_rate != null
  );
}

export function rankBy(
  scripts: Script[],
  key: (s: Script) => string | null,
  amazingIds: Set<string>
): RankRow[] {
  const groups = new Map<string, Script[]>();
  for (const s of scripts) {
    const k = key(s);
    if (!k) continue;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(s);
  }
  const rows: RankRow[] = [];
  for (const [label, group] of groups) {
    const withPerf = group.filter(hasPerf);
    rows.push({
      label,
      n: group.length,
      avgPerformance: avg(nn(withPerf.map((s) => performanceScore(s)))),
      avgSaveRate: avg(nn(withPerf.map((s) => s.save_rate))),
      avgShareRate: avg(nn(withPerf.map((s) => s.share_rate))),
      avgRetention: avg(nn(withPerf.map((s) => s.retention_rate))),
      amazing: group.filter((s) => amazingIds.has(s.id)).length,
    });
  }
  return rows.sort((a, b) => (b.avgPerformance ?? -1) - (a.avgPerformance ?? -1));
}

export type WinningFormula = {
  topScripts: { id: string; title: string; metric: number }[];
  shared: { field: string; value: string }[];
  basis: "amazing" | "top";
};

/** The shared framework combo behind your best performers. Prefers the Amazing
 * outlier tier; falls back to the top 3 by composite performance. */
export function winningFormula(scripts: Script[], amazingIds: Set<string>): WinningFormula | null {
  const amazing = scripts.filter((s) => amazingIds.has(s.id));
  let basis: "amazing" | "top" = "amazing";
  let pool = amazing;
  if (pool.length < 2) {
    basis = "top";
    pool = scripts
      .filter(hasPerf)
      .filter((s) => performanceScore(s) != null)
      .sort((a, b) => (performanceScore(b) ?? 0) - (performanceScore(a) ?? 0))
      .slice(0, 3);
  }
  if (pool.length < 2) return null;

  const fields: { field: string; get: (s: Script) => string | null }[] = [
    { field: "Hook Format", get: (s) => s.hook_format },
    { field: "Story Structure", get: (s) => s.story_structure },
    { field: "Target Emotion", get: (s) => s.target_emotion },
    { field: "Pillar", get: (s) => s.pillar },
    { field: "Series", get: (s) => s.content_series },
    { field: "Platform", get: (s) => s.platform },
  ];

  const shared = fields.flatMap(({ field, get }) => {
    const v = get(pool[0]);
    return v && pool.every((s) => get(s) === v) ? [{ field, value: v }] : [];
  });

  if (shared.length === 0) return null;
  return {
    topScripts: pool.map((s) => ({ id: s.id, title: s.title, metric: performanceScore(s) ?? 0 })),
    shared,
    basis,
  };
}

export type ShockComparison = {
  low: { n: number; avgPerformance: number | null; avgRetention: number | null };
  high: { n: number; avgPerformance: number | null; avgRetention: number | null };
  lowScripts: { id: string; title: string; score: number }[];
};

export function shockValueComparison(scripts: Script[]): ShockComparison {
  const scored = scripts.filter((s) => s.shock_value_score != null);
  const low = scored.filter((s) => s.shock_value_score! < SHOCK_VALUE_THRESHOLD);
  const high = scored.filter((s) => s.shock_value_score! >= SHOCK_VALUE_THRESHOLD);
  const stats = (group: Script[]) => {
    const withPerf = group.filter(hasPerf);
    return {
      n: group.length,
      avgPerformance: avg(nn(withPerf.map((s) => performanceScore(s)))),
      avgRetention: avg(nn(withPerf.map((s) => s.retention_rate))),
    };
  };
  return {
    low: stats(low),
    high: stats(high),
    lowScripts: low.map((s) => ({ id: s.id, title: s.title, score: s.shock_value_score! })),
  };
}

export function perfScriptCount(scripts: Script[]): number {
  return scripts.filter(hasPerf).length;
}
