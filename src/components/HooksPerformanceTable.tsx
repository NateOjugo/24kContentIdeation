import Link from "next/link";
import { formatCount } from "@/lib/scripts";

export type HooksLinkedScript = {
  id: string;
  title: string;
  platform: string;
  views: number | null;
  retention_rate: number | null;
  save_rate: number | null;
  share_rate: number | null;
};

const pct = (n: number | null) => (n == null ? "—" : `${n.toFixed(1)}%`);

export function HooksPerformanceTable({ scripts }: { scripts: HooksLinkedScript[] }) {
  return (
    <section className="accent-card p-5 sm:p-6">
      <div className="micro-label mb-1">Generated From The Bank</div>
      <p className="mb-4 text-xs text-steel">
        Scripts generated with power words, a metaphor, or a hook format template attached. Click through to log performance —
        same detail/edit flow as the rest of the Vault.
      </p>
      {scripts.length === 0 ? (
        <p className="text-sm text-steel">Nothing generated from the bank yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/8 text-left">
              <th className="micro-label-steel pb-2 font-bold">Title</th>
              <th className="micro-label-steel pb-2 pl-3 text-left font-bold">Platform</th>
              <th className="micro-label-steel pb-2 pl-3 text-right font-bold">Views</th>
              <th className="micro-label-steel pb-2 pl-3 text-right font-bold">Ret%</th>
              <th className="micro-label-steel hidden pb-2 pl-3 text-right font-bold sm:table-cell">Save%</th>
              <th className="micro-label-steel hidden pb-2 pl-3 text-right font-bold sm:table-cell">Share%</th>
            </tr>
          </thead>
          <tbody>
            {scripts.map((s) => (
              <tr key={s.id} className="border-b border-white/5 last:border-0">
                <td className="py-2 pr-2">
                  <Link href={`/scripts/${s.id}`} className="text-cream transition-colors hover:text-gold">
                    {s.title}
                  </Link>
                </td>
                <td className="py-2 pl-3 text-steel">{s.platform}</td>
                <td className="py-2 pl-3 text-right font-mono text-[13px] text-cream">{formatCount(s.views)}</td>
                <td className="py-2 pl-3 text-right font-mono text-[13px] text-steel">{pct(s.retention_rate)}</td>
                <td className="hidden py-2 pl-3 text-right font-mono text-[13px] text-steel sm:table-cell">{pct(s.save_rate)}</td>
                <td className="hidden py-2 pl-3 text-right font-mono text-[13px] text-steel sm:table-cell">{pct(s.share_rate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
