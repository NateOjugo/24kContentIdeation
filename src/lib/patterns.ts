import { SHOCK_VALUE_THRESHOLD, type Script } from "./scripts";

// Saves + shares are the primary signals per the spec — rankings sort on that first.

export type RankRow = {
  label: string;
  n: number;
  avgSavesShares: number | null;
  avgFollowers: number | null;
  avgViews: number | null;
  wins: number;
};

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function hasPerf(s: Script): boolean {
  return s.saves != null || s.shares != null || s.followers_gained != null || s.views != null;
}

export function savesShares(s: Script): number {
  return (s.saves ?? 0) + (s.shares ?? 0);
}

export function rankBy(scripts: Script[], key: (s: Script) => string | null): RankRow[] {
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
      avgSavesShares: avg(withPerf.map(savesShares)),
      avgFollowers: avg(withPerf.map((s) => s.followers_gained).filter((v): v is number => v != null)),
      avgViews: avg(withPerf.map((s) => s.views).filter((v): v is number => v != null)),
      wins: group.filter((s) => s.winning).length,
    });
  }
  return rows.sort((a, b) => (b.avgSavesShares ?? -1) - (a.avgSavesShares ?? -1));
}

export type WinningFormula = {
  topScripts: { id: string; title: string; metric: number }[];
  shared: { field: string; value: string }[];
};

/** Spec: "your 3 highest performers all share this combo" — take the top 3 by
 * saves+shares and surface every framework attribute all of them share. */
export function winningFormula(scripts: Script[]): WinningFormula | null {
  const ranked = scripts
    .filter(hasPerf)
    .sort((a, b) => savesShares(b) - savesShares(a))
    .slice(0, 3);
  if (ranked.length < 3) return null;

  const fields: { field: string; get: (s: Script) => string | null }[] = [
    { field: "Hook Format", get: (s) => s.hook_format },
    { field: "Story Structure", get: (s) => s.story_structure },
    { field: "Target Emotion", get: (s) => s.target_emotion },
    { field: "Pillar", get: (s) => s.pillar },
    { field: "Series", get: (s) => s.content_series },
    { field: "Platform", get: (s) => s.platform },
  ];

  const shared = fields.flatMap(({ field, get }) => {
    const v = get(ranked[0]);
    return v && ranked.every((s) => get(s) === v) ? [{ field, value: v }] : [];
  });

  if (shared.length === 0) return null;
  return {
    topScripts: ranked.map((s) => ({ id: s.id, title: s.title, metric: savesShares(s) })),
    shared,
  };
}

export type ShockComparison = {
  low: { n: number; avgSavesShares: number | null; avgViews: number | null };
  high: { n: number; avgSavesShares: number | null; avgViews: number | null };
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
      avgSavesShares: avg(withPerf.map(savesShares)),
      avgViews: avg(withPerf.map((s) => s.views).filter((v): v is number => v != null)),
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
