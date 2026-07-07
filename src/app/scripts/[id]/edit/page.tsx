import Link from "next/link";
import { notFound } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { ScriptForm } from "@/components/ScriptForm";
import { createClient } from "@/lib/supabase/server";
import type { Script } from "@/lib/scripts";

export default async function EditScript({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("scripts").select("*").eq("id", id).single();
  if (!data) notFound();
  const script = data as Script;

  return (
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-6">
          <Link href={`/scripts/${script.id}`} className="micro-label-steel hover:text-cream">
            ← Back to script
          </Link>
          <h1 className="mt-2 font-display text-4xl tracking-wide text-cream">
            Edit: {script.title}
          </h1>
        </div>
        <ScriptForm script={script} />
      </main>
    </>
  );
}
