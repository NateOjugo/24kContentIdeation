import { OUTLIER_MIN_SCRIPTS, type Script } from "./scripts";

// Outlier score replaces the old binary "Winning?" toggle. Computed from the
// whole dataset (never stored, never hand-set): a video's Views vs Nate's own
// median Views, with a save/share quality check to catch pure-reach spikes.

export type OutlierTier = "Poor" | "Semi-Good" | "Amazing";

export type OutlierResult =
  | { established: false }
  | {
      established: true;
      tier: OutlierTier;
      multiplier: number;
      reachOutlier: boolean; // Amazing on views but weak on saves+shares
      label: string;
    };

function median(nums: number[]): number {
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function tierFor(multiplier: number): OutlierTier {
  if (multiplier < 1.0) return "Poor";
  if (multiplier < 3.0) return "Semi-Good";
  return "Amazing";
}

// Only these fields are needed — accept partial rows so callers can do a
// lightweight `select id, views, save_rate, share_rate` for the global baseline.
export type OutlierInput = Pick<Script, "id" | "views" | "save_rate" | "share_rate">;

export type OutlierBaseline = {
  established: boolean;
  medianViews: number | null;
  n: number;
};

export function outlierBaseline(scripts: Pick<Script, "views">[]): OutlierBaseline {
  const withViews = scripts.filter((s) => s.views != null).map((s) => s.views!);
  if (withViews.length < OUTLIER_MIN_SCRIPTS) {
    return { established: false, medianViews: null, n: withViews.length };
  }
  return { established: true, medianViews: median(withViews), n: withViews.length };
}

/** Compute outlier results for every script, keyed by id. */
export function computeOutliers(scripts: OutlierInput[]): Map<string, OutlierResult> {
  const result = new Map<string, OutlierResult>();
  const withViews = scripts.filter((s) => s.views != null);

  if (withViews.length < OUTLIER_MIN_SCRIPTS) {
    for (const s of scripts) result.set(s.id, { established: false });
    return result;
  }

  const medianViews = median(withViews.map((s) => s.views!));
  const saveRates = scripts.filter((s) => s.save_rate != null).map((s) => s.save_rate!);
  const shareRates = scripts.filter((s) => s.share_rate != null).map((s) => s.share_rate!);
  const medianSave = saveRates.length ? median(saveRates) : null;
  const medianShare = shareRates.length ? median(shareRates) : null;

  for (const s of scripts) {
    if (s.views == null) {
      result.set(s.id, { established: false });
      continue;
    }
    const multiplier = medianViews > 0 ? s.views / medianViews : 0;
    const tier = tierFor(multiplier);

    // Quality check: Amazing on reach but below-median on BOTH save and share rate
    const reachOutlier =
      tier === "Amazing" &&
      medianSave != null &&
      medianShare != null &&
      s.save_rate != null &&
      s.share_rate != null &&
      s.save_rate < medianSave &&
      s.share_rate < medianShare;

    result.set(s.id, {
      established: true,
      tier,
      multiplier,
      reachOutlier,
      label: reachOutlier ? "Reach Outlier — verify quality" : tier,
    });
  }
  return result;
}

export const OUTLIER_TIERS: OutlierTier[] = ["Amazing", "Semi-Good", "Poor"];
