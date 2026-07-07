import { NextResponse } from "next/server";
import { requireUser } from "@/lib/generation/routeAuth";
import { anthropicConfigured } from "@/lib/generation/anthropic";
import { analyzeStructure } from "@/lib/generation/analyze";

export const maxDuration = 180;

// Script Logger: analyze Nate's own pasted, finished script and return the
// auto-detected Framework Tags to pre-fill the form. Same engine as
// /api/extract-structure — just pointed at his own script instead of a transcript.
export async function POST(req: Request) {
  const { error } = await requireUser();
  if (error) return error;
  if (!anthropicConfigured()) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured yet — set it in the environment." },
      { status: 503 }
    );
  }

  const { text } = await req.json();
  if (!text?.trim() || text.trim().length < 40) {
    return NextResponse.json({ error: "Paste a fuller script (40+ chars)" }, { status: 400 });
  }

  try {
    const analysis = await analyzeStructure(text.trim(), "own");
    return NextResponse.json(analysis);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
