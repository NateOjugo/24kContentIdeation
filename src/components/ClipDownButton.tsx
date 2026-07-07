"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ClipDownButton({ scriptId }: { scriptId: string }) {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function clipDown() {
    setWorking(true);
    setError(null);
    try {
      const res = await fetch("/api/clip-down", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scriptId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      router.push(`/scripts/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setWorking(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={clipDown}
        disabled={working}
        className="rounded-[3px] border border-gold/60 px-4 py-1.5 text-sm font-semibold text-gold transition-colors hover:bg-gold/10 disabled:opacity-60"
      >
        {working ? "Cutting the Reel…" : "Clip This Down"}
      </button>
      {error && <span className="text-xs text-gold">{error}</span>}
    </div>
  );
}
