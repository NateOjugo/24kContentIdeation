import Link from "next/link";

// Feature 4: rebuild from a proven pattern. Links to the logger with the source
// script's framework combo pre-filled.
export function RepeatBuilderButton({ scriptId }: { scriptId: string }) {
  return (
    <div className="accent-card flex flex-wrap items-center justify-between gap-3 p-5">
      <div>
        <div className="micro-label mb-1">Repeat Builder</div>
        <p className="text-sm text-steel">
          Start a new script pre-loaded with this exact framework combo.
        </p>
      </div>
      <Link
        href={`/log?from=${scriptId}`}
        className="rounded-[3px] border border-gold/60 px-4 py-1.5 text-sm font-semibold text-gold transition-colors hover:bg-gold/10"
      >
        Repeat This Pattern
      </Link>
    </div>
  );
}
