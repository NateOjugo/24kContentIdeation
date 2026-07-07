"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Feature 6: freeform per-script diagnosis. Kept separate from framework tags so
// the Pattern Engine stays clean — this is the qualitative read, editable inline.
export function PostMortemEditor({
  scriptId,
  initial,
}: {
  scriptId: string;
  initial: string | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initial ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = value !== (initial ?? "");

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    const supabase = createClient();
    const { error } = await supabase
      .from("scripts")
      .update({ post_mortem_notes: value.trim() || null })
      .eq("id", scriptId);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="accent-card p-5">
      <div className="micro-label mb-2">Post-Mortem</div>
      <p className="mb-3 text-xs text-steel">
        Why it worked or flopped, in your words. Separate from the framework tags — the
        Pattern Engine never reads this.
      </p>
      <textarea
        rows={4}
        className="field-input"
        placeholder="Your diagnosis…"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setSaved(false);
        }}
      />
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving || !dirty}
          className="rounded-[3px] bg-gold px-4 py-2 text-sm font-semibold text-navy-deep transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Notes"}
        </button>
        {saved && !dirty && <span className="text-xs text-steel">Saved.</span>}
        {error && <span className="text-xs text-gold">{error}</span>}
      </div>
    </div>
  );
}
