import Link from "next/link";
import { SignOutButton } from "./SignOutButton";

const links: { href: string; label: string }[] = [
  { href: "/", label: "Vault" },
  { href: "/log", label: "Log Script" },
  { href: "/patterns", label: "Patterns" },
  { href: "/compare", label: "Compare" },
  { href: "/generate", label: "Generate" },
  { href: "/remix", label: "Remix" },
  { href: "/series", label: "Series" },
  { href: "/voice", label: "Voice" },
];

export function AppNav() {
  return (
    <header className="border-b border-white/8 bg-navy-mid/60">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-baseline gap-3">
          <span className="font-display text-2xl tracking-wider text-cream">24K</span>
          <span className="micro-label hidden sm:inline">Script Vault</span>
        </Link>
        <nav className="flex items-center gap-5 overflow-x-auto">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm text-steel transition-colors hover:text-cream"
            >
              {l.label}
            </Link>
          ))}
          <SignOutButton />
        </nav>
      </div>
    </header>
  );
}
