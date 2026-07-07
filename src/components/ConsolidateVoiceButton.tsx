"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ConsolidateVoiceButton({ overCap }: { overCap: boolean }) {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function consolidate() {
    setWorking(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/consolidate-voice", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setResult(`Merged ${data.before} rules down to ${data.after}.`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setWorking(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={consolidate}
        disabled={working}
        className={`rounded-[3px] px-4 py-2.5 text-sm font-semibold transition-opacity disabled:opacity-60 ${
          overCap
            ? "bg-gold text-navy-deep hover:opacity-90"
            : "border border-white/15 text-steel hover:text-cream"
        }`}
      >
        {working ? "Consolidating…" : "Consolidate Voice Log"}
      </button>
      {result && <p className="mt-2 text-sm text-cream">{result}</p>}
      {error && <p className="mt-2 text-sm text-gold">{error}</p>}
    </div>
  );
}
