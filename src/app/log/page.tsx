import { AppNav } from "@/components/AppNav";
import { ScriptForm } from "@/components/ScriptForm";

export const metadata = { title: "Log Script — 24K Script Vault" };

export default function LogPage() {
  return (
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-6">
          <div className="micro-label mb-2">Script Logger</div>
          <h1 className="font-display text-4xl tracking-wide text-cream">Log a Script</h1>
          <p className="mt-1 text-sm text-steel">
            The Packaging Gate is enforced. No gate, no save.
          </p>
        </div>
        <ScriptForm />
      </main>
    </>
  );
}
