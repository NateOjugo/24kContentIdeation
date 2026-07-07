import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { VaultBrowser } from "@/components/VaultBrowser";

export default function Home() {
  return (
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="micro-label mb-2">The Vault</div>
            <h1 className="font-display text-4xl tracking-wide text-cream sm:text-5xl">
              Every Script. On Record.
            </h1>
          </div>
          <Link
            href="/log"
            className="rounded-[3px] bg-gold px-5 py-2.5 text-sm font-semibold text-navy-deep transition-opacity hover:opacity-90"
          >
            + Log Script
          </Link>
        </div>
        <VaultBrowser />
      </main>
    </>
  );
}
