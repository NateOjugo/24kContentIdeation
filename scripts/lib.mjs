// Shared helpers for one-time setup scripts. Run from the repo root.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

function env() {
  const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  const vars = {};
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) vars[m[1]] = m[2];
  }
  return vars;
}

export async function authedClient() {
  const { NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_ANON_KEY: key } = env();
  const creds = readFileSync(new URL("../LOGIN_CREDENTIALS.txt", import.meta.url), "utf8");
  const email = creds.match(/^Email: (.+)$/m)[1].trim();
  const password = creds.match(/^Password: (.+)$/m)[1].trim();

  const supabase = createClient(url, key);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`sign-in failed: ${error.message}`);
  return { supabase, url, accessToken: data.session.access_token };
}

export async function embedTexts(url, accessToken, texts) {
  const res = await fetch(`${url}/functions/v1/embed`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ texts }),
  });
  if (!res.ok) throw new Error(`embed failed ${res.status}: ${await res.text()}`);
  const { embeddings } = await res.json();
  return embeddings;
}
