import { AppNav } from "@/components/AppNav";
import { CompareScripts } from "@/components/CompareScripts";
import { createClient } from "@/lib/supabase/server";
import { hasPerf } from "@/lib/patterns";
import { computeOutliers } from "@/lib/outlier";
import { type Script } from "@/lib/scripts";

export const metadata = { title: "Compare Scripts — 24K Script Vault" };
export const dynamic = "force-dynamic";

export default async function ComparePage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("scripts")
    .select("*")
    .order("date_posted", { ascending: false, nullsFirst: false });
  const all = (data ?? []) as Script[];

  // Outlier tier is computed over ALL scripts; only performance-tracked ones are
  // comparable (includes past videos logged by hand, not just generated ones).
  const outlierMap = computeOutliers(all);
  const comparable = all.filter(hasPerf);
  const outliers = Object.fromEntries(
    comparable.map((s) => {
      const o = outlierMap.get(s.id);
      return [s.id, { label: o?.established ? o.label : "—", established: Boolean(o?.established) }];
    })
  );

  return (
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-6">
          <div className="micro-label mb-2">Compare Scripts</div>
          <h1 className="font-display text-4xl tracking-wide text-cream sm:text-5xl">
            Why Did One Beat the Other
          </h1>
          <p className="mt-1 text-sm text-steel">
            Line up any performance-tracked scripts, see every tag and metric side by side, and get the likely cause of the gap.
          </p>
        </div>
        <CompareScripts scripts={comparable} outliers={outliers} />
      </main>
    </>
  );
}
