"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  CONTENT_SERIES,
  EMOTIONS,
  HOOK_FORMATS,
  PILLARS,
  PLATFORMS,
  STORY_STRUCTURES,
  formatCount,
  type Script,
} from "@/lib/scripts";

type Filters = {
  q: string;
  platform: string;
  pillar: string;
  emotion: string;
  hookFormat: string;
  structure: string;
  series: string;
  winningOnly: boolean;
};

const NO_FILTERS: Filters = {
  q: "",
  platform: "",
  pillar: "",
  emotion: "",
  hookFormat: "",
  structure: "",
  series: "",
  winningOnly: false,
};

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: readonly string[];
}) {
  return (
    <select
      className={`field-input !w-auto !py-2 text-[13px] ${value ? "!border-gold/60 !text-gold" : "!text-steel"}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}

function Tag({ children, gold }: { children: React.ReactNode; gold?: boolean }) {
  return (
    <span
      className={`inline-block rounded-[2px] border px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-[0.08em] uppercase ${
        gold ? "border-gold/40 bg-gold/10 text-gold" : "border-white/10 bg-white/5 text-steel"
      }`}
    >
      {children}
    </span>
  );
}

function ScriptCard({ s }: { s: Script }) {
  return (
    <Link
      href={`/scripts/${s.id}`}
      className="accent-card block p-4 transition-colors hover:border-white/15"
      data-active={s.winning || undefined}
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <h3 className="min-w-0 truncate text-[15px] font-semibold text-cream">{s.title}</h3>
        {s.winning && <Tag gold>Winning</Tag>}
      </div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        <Tag>{s.platform}</Tag>
        <Tag>{s.pillar}</Tag>
        {s.pillar_secondary && <Tag>+{s.pillar_secondary}</Tag>}
        <Tag>{s.target_emotion}</Tag>
        {s.hook_format && <Tag>{s.hook_format}</Tag>}
        {s.story_structure && <Tag>{s.story_structure}</Tag>}
        {s.content_series && <Tag>{s.content_series}</Tag>}
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-white/8 pt-3">
        <div className="flex gap-4 font-mono text-[11px] text-steel">
          <span><span className="text-cream">{formatCount(s.views)}</span> views</span>
          <span><span className="text-cream">{formatCount(s.saves)}</span> saves</span>
          <span><span className="text-cream">{formatCount(s.shares)}</span> shares</span>
          <span className="hidden sm:inline"><span className="text-cream">{formatCount(s.followers_gained)}</span> followers</span>
        </div>
        <span className="shrink-0 font-mono text-[11px] text-steel/70">
          {s.date_posted ?? "unposted"}
        </span>
      </div>
    </Link>
  );
}

export function VaultBrowser() {
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [scripts, setScripts] = useState<Script[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runQuery = useCallback(async (f: Filters) => {
    const supabase = createClient();
    let query = supabase
      .from("scripts")
      .select("*")
      .order("date_posted", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(200);

    if (f.q.trim()) query = query.textSearch("search_tsv", f.q.trim(), { type: "websearch", config: "english" });
    if (f.platform) query = query.eq("platform", f.platform);
    if (f.pillar) query = query.or(`pillar.eq.${JSON.stringify(f.pillar)},pillar_secondary.eq.${JSON.stringify(f.pillar)}`);
    if (f.emotion) query = query.eq("target_emotion", f.emotion);
    if (f.hookFormat) query = query.eq("hook_format", f.hookFormat);
    if (f.structure) query = query.eq("story_structure", f.structure);
    if (f.series) query = query.eq("content_series", f.series);
    if (f.winningOnly) query = query.eq("winning", true);

    const { data, error } = await query;
    if (error) setError(error.message);
    else {
      setError(null);
      setScripts(data as Script[]);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runQuery(filters), filters.q ? 300 : 0);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [filters, runQuery]);

  const set = <K extends keyof Filters>(k: K, v: Filters[K]) =>
    setFilters((f) => ({ ...f, [k]: v }));

  const active =
    filters.platform || filters.pillar || filters.emotion || filters.hookFormat ||
    filters.structure || filters.series || filters.winningOnly || filters.q;

  return (
    <div>
      <div className="mb-4 space-y-3">
        <input
          className="field-input"
          placeholder="Search script text, titles, captions…"
          value={filters.q}
          onChange={(e) => set("q", e.target.value)}
        />
        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect value={filters.platform} onChange={(v) => set("platform", v)} placeholder="Platform" options={PLATFORMS} />
          <FilterSelect value={filters.pillar} onChange={(v) => set("pillar", v)} placeholder="Pillar" options={PILLARS} />
          <FilterSelect value={filters.emotion} onChange={(v) => set("emotion", v)} placeholder="Emotion" options={EMOTIONS} />
          <FilterSelect value={filters.hookFormat} onChange={(v) => set("hookFormat", v)} placeholder="Hook Format" options={HOOK_FORMATS} />
          <FilterSelect value={filters.structure} onChange={(v) => set("structure", v)} placeholder="Structure" options={STORY_STRUCTURES} />
          <FilterSelect value={filters.series} onChange={(v) => set("series", v)} placeholder="Series" options={CONTENT_SERIES} />
          <button
            type="button"
            onClick={() => set("winningOnly", !filters.winningOnly)}
            className={`rounded-[3px] border px-3 py-2 font-mono text-[11px] font-bold tracking-[0.1em] uppercase transition-colors ${
              filters.winningOnly
                ? "border-gold bg-gold/15 text-gold"
                : "border-white/10 bg-black/30 text-steel hover:text-cream"
            }`}
          >
            Winning Only
          </button>
          {active && (
            <button
              type="button"
              onClick={() => setFilters(NO_FILTERS)}
              className="px-2 py-2 font-mono text-[11px] tracking-[0.1em] uppercase text-steel/70 hover:text-cream"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-gold">Query error: {error}</p>}

      {scripts === null && !error && (
        <p className="py-12 text-center text-sm text-steel">Loading the Vault…</p>
      )}

      {scripts !== null && scripts.length === 0 && (
        <div className="accent-card p-10 text-center">
          <p className="text-sm text-steel">
            {active
              ? "Nothing matches those filters."
              : "The Vault is empty. Log your first script."}
          </p>
          {!active && (
            <Link
              href="/log"
              className="mt-4 inline-block rounded-[3px] bg-gold px-5 py-2.5 text-sm font-semibold text-navy-deep hover:opacity-90"
            >
              Log a Script
            </Link>
          )}
        </div>
      )}

      {scripts !== null && scripts.length > 0 && (
        <>
          <div className="micro-label-steel mb-3">{scripts.length} script{scripts.length === 1 ? "" : "s"}</div>
          <div className="grid gap-3 md:grid-cols-2">
            {scripts.map((s) => (
              <ScriptCard key={s.id} s={s} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
