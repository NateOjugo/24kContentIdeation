import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** API routes are excluded from the proxy guard — they authenticate here. */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { supabase, error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }), accessToken: null };
  }
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return { supabase, error: null, accessToken: session?.access_token ?? null };
}
