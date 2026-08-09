"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { POWER_WORD_FUNCTIONS, normalizeNiche, type SandcastleImport, type PowerWordFn } from "@/lib/hooksBank";

function PromoteForm({
  row,
  onDone,
}: {
  row: SandcastleImport;
  onDone: (id: string, promoted: boolean) => void;
}) {
  const supabase = createClient();
  const [phrase, setPhrase] = useState(row.raw_hook);
  const [fn, setFn] = useState<PowerWordFn>("accusation");
  const [niches, setNiches] = useState("");
  const [saving, setSaving] = useState(false);

  async function promote() {
    if (!phrase.trim()) return;
    setSaving(true);
    const nicheList = [...new Set(niches.split(",").map((n) => normalizeNiche(n)).filter(Boolean))];
    const { error: insertErr } = await supabase
      .from("power_words")
      .insert({ phrase: phrase.trim(), fn, niches: nicheList, source: "sandcastles" });
    if (insertErr) {
      setSaving(false);
      return;
    }
    await supabase.from("sandcastles_imports").update({ reviewed: true, promoted: true }).eq("id", row.id);
    setSaving(false);
    onDone(row.id, true);
  }

  return (
    <div className="mt-2 space-y-2 rounded-[3px] border border-gold/30 bg-black/30 p-3">
      <input className="field-input" value={phrase} onChange={(e) => setPhrase(e.target.value)} placeholder="Phrase" />
      <div className="grid grid-cols-2 gap-2">
        <select className="field-input" value={fn} onChange={(e) => setFn(e.target.value as PowerWordFn)}>
          {POWER_WORD_FUNCTIONS.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
        <input className="field-input" value={niches} onChange={(e) => setNiches(e.target.value)} placeholder="niches, comma separated" />
      </div>
      <button
        type="button"
        onClick={promote}
        disabled={saving || !phrase.trim()}
        className="rounded-[3px] bg-gold px-3 py-1.5 text-xs font-semibold text-navy-deep transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {saving ? "Promoting…" : "Confirm Promote"}
      </button>
    </div>
  );
}

export function HooksSandcastlesImport({ initialImports }: { initialImports: SandcastleImport[] }) {
  const supabase = createClient();
  const [imports, setImports] = useState(initialImports);
  const [raw, setRaw] = useState("");
  const [importing, setImporting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function bulkImport() {
    const lines = raw
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (!lines.length) return;
    setImporting(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("sandcastles_imports")
      .insert(lines.map((raw_hook) => ({ raw_hook })))
      .select("*");
    setImporting(false);
    if (err) return setError(err.message);
    setImports((i) => [...((data as SandcastleImport[]) ?? []), ...i]);
    setRaw("");
  }

  async function dismiss(id: string) {
    await supabase.from("sandcastles_imports").update({ reviewed: true, promoted: false }).eq("id", id);
    setImports((i) => i.filter((row) => row.id !== id));
  }

  function handlePromoted(id: string) {
    setImports((i) => i.filter((row) => row.id !== id));
    setExpandedId(null);
  }

  return (
    <section className="accent-card p-5 sm:p-6">
      <div className="micro-label mb-1">Sandcastles Import</div>
      <p className="mb-4 text-xs text-steel">
        Paste raw hook lines (one per line). Review each and promote the ones worth keeping into the Power Words bank.
      </p>
      <textarea
        rows={4}
        className="field-input"
        placeholder={"One raw hook per line…"}
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
      />
      <button
        type="button"
        onClick={bulkImport}
        disabled={importing || !raw.trim()}
        className="mt-3 rounded-[3px] bg-gold px-4 py-2.5 text-sm font-semibold text-navy-deep transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {importing ? "Importing…" : "Import Lines"}
      </button>

      {error && (
        <p className="mt-2 text-sm text-gold" role="alert">
          {error}
        </p>
      )}

      {imports.length > 0 && (
        <div className="mt-5">
          <div className="micro-label-steel mb-2">Review Queue ({imports.length})</div>
          <ul className="space-y-2">
            {imports.map((row) => (
              <li key={row.id} className="rounded-[3px] border border-white/8 bg-black/25 px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm text-cream">{row.raw_hook}</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
                      className="rounded-[3px] border border-gold/40 px-3 py-1 text-xs text-gold transition-opacity hover:opacity-80"
                    >
                      Promote to Power Word
                    </button>
                    <button
                      type="button"
                      onClick={() => dismiss(row.id)}
                      className="rounded-[3px] border border-white/15 px-3 py-1 text-xs text-steel transition-colors hover:text-cream"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
                {expandedId === row.id && <PromoteForm row={row} onDone={handlePromoted} />}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
