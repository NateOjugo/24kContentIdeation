import Link from "next/link";
import { notFound } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { ClipDownButton } from "@/components/ClipDownButton";
import { LearnFromEditButton } from "@/components/LearnFromEditButton";
import { PostMortemEditor } from "@/components/PostMortemEditor";
import { RepeatBuilderButton } from "@/components/RepeatBuilderButton";
import { createClient } from "@/lib/supabase/server";
import { computeOutliers } from "@/lib/outlier";
import { formatCount, type Script } from "@/lib/scripts";

function Tag({ children, gold }: { children: React.ReactNode; gold?: boolean }) {
  return (
    <span
      className={`inline-block rounded-[2px] border px-2 py-1 font-mono text-[10px] font-bold tracking-[0.08em] uppercase ${
        gold ? "border-gold/40 bg-gold/10 text-gold" : "border-white/10 bg-white/5 text-steel"
      }`}
    >
      {children}
    </span>
  );
}

function GateBadge({ label, value }: { label: string; value: boolean | null }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[3px] border border-white/8 bg-black/25 px-3 py-2">
      <span className="text-[13px] text-steel">{label}</span>
      <span className={`font-mono text-[10px] font-bold tracking-[0.1em] uppercase ${
        value === true ? "text-gold" : value === false ? "text-cream/60" : "text-steel/50"
      }`}>
        {value === true ? "Pass" : value === false ? "Fail" : "—"}
      </span>
    </div>
  );
}

export default async function ScriptDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("scripts").select("*").eq("id", id).single();
  if (!data) notFound();
  const s = data as Script;

  // Outlier score is computed against the global median, so fetch the baseline.
  const { data: baselineRows } = await supabase
    .from("scripts")
    .select("id, views, save_rate, share_rate");
  const outlier = computeOutliers(baselineRows ?? []).get(s.id);

  const pctStr = (v: number | null) => (v == null ? "—" : `${v.toFixed(1)}%`);
  const perf: [string, string][] = [
    ["Views", formatCount(s.views)],
    ["Retention", pctStr(s.retention_rate)],
    ["Save Rate", pctStr(s.save_rate)],
    ["Share Rate", pctStr(s.share_rate)],
    ["Like Rate", pctStr(s.like_rate)],
    ["Skip Rate", pctStr(s.skip_rate)],
  ];

  return (
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between gap-4">
            <Link href="/" className="micro-label-steel hover:text-cream">← Vault</Link>
            <Link
              href={`/scripts/${s.id}/edit`}
              className="rounded-[3px] border border-gold/60 px-4 py-1.5 text-sm font-semibold text-gold transition-colors hover:bg-gold/10"
            >
              Edit
            </Link>
          </div>
          <h1 className="font-display text-4xl tracking-wide text-cream">{s.title}</h1>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {outlier?.established && <Tag gold>{outlier.label}</Tag>}
            <Tag>{s.platform}</Tag>
            <Tag>{s.pillar}</Tag>
            {s.pillar_secondary && <Tag>+{s.pillar_secondary}</Tag>}
            <Tag>{s.target_emotion}</Tag>
            {s.hook_format && <Tag>{s.hook_format}</Tag>}
            {s.story_structure && <Tag>{s.story_structure}</Tag>}
            {s.content_series && <Tag>{s.content_series}</Tag>}
            {s.cta_type && <Tag>CTA: {s.cta_type}</Tag>}
            {s.date_posted && <Tag>{s.date_posted}</Tag>}
          </div>
        </div>

        <div className="accent-card mb-5 p-5">
          <div className="micro-label mb-4">Performance</div>
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
            {perf.map(([label, v]) => (
              <div key={label} className="text-center">
                <div className="font-display text-2xl text-cream">{v}</div>
                <div className="micro-label-steel mt-0.5">{label}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-4 border-t border-white/8 pt-3 font-mono text-[11px] text-steel">
            {outlier?.established && (
              <span>
                Outlier: <span className="text-gold">{outlier.label}</span>{" "}
                <span className="text-steel">({outlier.multiplier.toFixed(1)}x median views)</span>
              </span>
            )}
            {s.comments != null && <span>Comments: <span className="text-cream">{formatCount(s.comments)}</span></span>}
            {s.followers_gained != null && <span>Followers: <span className="text-cream">{formatCount(s.followers_gained)}</span></span>}
            {s.shock_value_score != null && (
              <span>
                Shock Value:{" "}
                <span className={s.shock_value_score < 80 ? "text-gold" : "text-cream"}>
                  {s.shock_value_score}
                  {s.shock_value_score < 80 && " (below threshold)"}
                </span>
              </span>
            )}
            {s.re_hook_count != null && (
              <span>Re-Hooks: <span className="text-cream">{s.re_hook_count}</span></span>
            )}
          </div>
        </div>

        {(s.loop_open || s.loop_close) && (
          <div className="accent-card mb-5 p-5">
            <div className="micro-label mb-3">The Loop</div>
            {s.loop_open && (
              <p className="text-sm text-cream"><span className="micro-label-steel">Opens: </span>{s.loop_open}</p>
            )}
            {s.loop_close && (
              <p className="mt-1 text-sm text-cream"><span className="micro-label-steel">Closes: </span>{s.loop_close}</p>
            )}
          </div>
        )}

        {s.full_script_text && (
          <div className="accent-card mb-5 p-5">
            <div className="micro-label mb-3">Script — Final</div>
            <pre className="font-mono text-[13px] leading-relaxed whitespace-pre-wrap text-cream/90">
              {s.full_script_text}
            </pre>
          </div>
        )}

        {s.original_draft_text && (
          <details className="accent-card mb-5 p-5">
            <summary className="micro-label cursor-pointer">Original Draft (pre-edit)</summary>
            <pre className="mt-3 font-mono text-[13px] leading-relaxed whitespace-pre-wrap text-steel">
              {s.original_draft_text}
            </pre>
          </details>
        )}

        {s.caption && (
          <div className="accent-card mb-5 p-5">
            <div className="micro-label mb-2">Caption</div>
            <p className="text-sm text-cream/90">{s.caption}</p>
          </div>
        )}

        <div className="accent-card mb-5 p-5">
          <div className="micro-label mb-3">Quality Gate Snapshot</div>
          <div className="grid gap-2 sm:grid-cols-2">
            <GateBadge label="Click Confirmation" value={s.click_confirmation_passed} />
            <GateBadge label="Atomic Shareability" value={s.atomic_shareability_present} />
            <GateBadge label="Hook Commandments" value={s.hook_commandments_passed} />
            {s.platform === "YouTube" && (
              <>
                <GateBadge label="Dopamine Ladder" value={s.dopamine_ladder_used} />
                <GateBadge label="Album Strategy" value={s.album_strategy_confirmed} />
              </>
            )}
          </div>
        </div>

        <div className="mb-5">
          <PostMortemEditor scriptId={s.id} initial={s.post_mortem_notes} />
        </div>

        {/* Actions */}
        <div className="mt-8 space-y-4 border-t border-white/8 pt-6">
          <div className="micro-label-steel">Actions</div>

          <RepeatBuilderButton scriptId={s.id} />

          {s.original_draft_text && s.full_script_text && (
            <LearnFromEditButton scriptId={s.id} />
          )}

          {s.original_draft_text && !s.full_script_text && (
            <div className="accent-card p-5">
              <div className="micro-label mb-2">Voice Learning Loop</div>
              <p className="text-sm text-steel">
                Paste your final edited version into Full Script Text (via Edit),
                then a “Learn from Edit” button appears here to capture your voice
                patterns from the diff.
              </p>
            </div>
          )}

          {s.platform === "YouTube" && (s.full_script_text || s.original_draft_text) && (
            <div className="accent-card flex flex-wrap items-center justify-between gap-3 p-5">
              <div>
                <div className="micro-label mb-1">Clip This Down</div>
                <p className="text-sm text-steel">Pull a Reels-format cut from this YouTube script.</p>
              </div>
              <ClipDownButton scriptId={s.id} />
            </div>
          )}
        </div>
      </main>
    </>
  );
}
