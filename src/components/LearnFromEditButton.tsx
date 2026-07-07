"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LearnFromEditButton({ scriptId }: { scriptId: string }) {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function learn() {
    setWorking(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/learn-from-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scriptId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setResult(
        data.added === 0
          ? "No new patterns — the draft and final were close."
          : `Learned ${data.added} voice rule${data.added === 1 ? "" : "s"} from your edit.`
      );
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="accent-card p-5">
      <div className="micro-label mb-2">Voice Learning Loop</div>
      <p className="mb-3 text-sm text-steel">
        Compare the generated draft against your final edit and pull concrete voice
        rules from the diff. They feed every future generation.
      </p>
      <button
        type="button"
        onClick={learn}
        disabled={working}
        className="rounded-[3px] bg-gold px-4 py-2.5 text-sm font-semibold text-navy-deep transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {working ? "Reading your edit…" : "Learn from Edit"}
      </button>
      {result && <p className="mt-3 text-sm text-cream">{result}</p>}
      {error && <p className="mt-3 text-sm text-gold">{error}</p>}
    </div>
  );
}
