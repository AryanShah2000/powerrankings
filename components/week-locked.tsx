import Link from "next/link";

export function WeekLocked({ weekId, weekLabel }: { weekId: string; weekLabel: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border-hairline p-10 text-center">
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-bg-surface-2 text-lg">
        🔒
      </div>
      <h2 className="text-sm font-semibold text-text-primary">
        Submit your {weekLabel} rankings to unlock
      </h2>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-text-secondary">
        To keep everyone&rsquo;s picks independent, you can&rsquo;t see how the committee
        ranked {weekLabel} until you&rsquo;ve submitted your own.
      </p>
      <Link
        href={`/rankings?week=${weekId}`}
        className="mt-5 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong"
      >
        Enter {weekLabel} rankings
      </Link>
    </div>
  );
}
