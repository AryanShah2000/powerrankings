import Link from "next/link";
import { auth } from "@/auth";
import { signOutAction } from "@/lib/actions";

const LINKS = [
  { href: "/", label: "Power Rankings" },
  { href: "/rankings", label: "Enter Rankings" },
  { href: "/board", label: "Full Board" },
  { href: "/trends", label: "Trends" },
  { href: "/teams", label: "Teams" },
];

export async function Nav() {
  const session = await auth();
  const name = session?.user?.name;
  if (!name) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-border-hairline bg-bg-page/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <span className="text-lg">🏆</span>
          <span className="hidden sm:inline">Power Rankings</span>
        </Link>

        <nav className="flex flex-1 items-center gap-1 overflow-x-auto text-sm">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="whitespace-nowrap rounded-lg px-3 py-1.5 text-text-secondary transition-colors hover:bg-bg-surface-2 hover:text-text-primary"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-text-secondary sm:inline">{name}</span>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent-strong">
            {name.charAt(0)}
          </span>
          <form action={signOutAction}>
            <button
              type="submit"
              className="rounded-lg border border-border-hairline px-2.5 py-1.5 text-xs text-text-secondary transition-colors hover:bg-bg-surface-2 hover:text-text-primary"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
