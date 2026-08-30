import Link from "next/link";
import { loadAllAverages, currentWeekFor } from "@/lib/rankings";
import { Sparkline } from "@/components/sparkline";
import { MovementBadge } from "@/components/movement-badge";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { weeks, teams, analystCount, averages } = await loadAllAverages();

  if (teams.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
        <h1 className="text-lg font-semibold">Welcome to your league&rsquo;s power rankings</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Start by adding your teams, then head to Enter Rankings to submit Pre-Draft rankings.
        </p>
        <Link
          href="/teams"
          className="mt-5 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong"
        >
          Add teams
        </Link>
      </div>
    );
  }

  const params = await searchParams;
  const fallbackWeek = currentWeekFor(weeks, averages);
  const selectedWeek = weeks.find((w) => w.id === params.week) ?? fallbackWeek ?? weeks[0];

  // teamId -> weekOrder -> avgRank, for sparklines
  const historyByTeam = new Map<string, Map<number, number | null>>();
  for (const a of averages) {
    const m = historyByTeam.get(a.teamId) ?? new Map();
    m.set(a.weekOrder, a.avgRank);
    historyByTeam.set(a.teamId, m);
  }

  const weeksUpToSelected = weeks.filter((w) => w.order <= selectedWeek.order).slice(-6);
  const previousWeek = weeks
    .filter((w) => w.order < selectedWeek.order)
    .sort((a, b) => b.order - a.order)[0];

  const rows = teams
    .map((team) => {
      const current = averages.find((a) => a.teamId === team.id && a.weekId === selectedWeek.id);
      const previous = previousWeek
        ? averages.find((a) => a.teamId === team.id && a.weekId === previousWeek.id)
        : undefined;

      const history = historyByTeam.get(team.id) ?? new Map();
      const sparkValues = weeksUpToSelected.map((w) => history.get(w.order) ?? null);

      const delta =
        current?.avgRank != null && previous?.avgRank != null
          ? previous.avgRank - current.avgRank
          : null;
      const isNew = current?.avgRank != null && previous?.avgRank == null;

      return { team, current, delta, isNew, sparkValues };
    })
    .sort((a, b) => {
      if (a.current?.avgRank == null && b.current?.avgRank == null) return 0;
      if (a.current?.avgRank == null) return 1;
      if (b.current?.avgRank == null) return -1;
      return a.current.avgRank - b.current.avgRank;
    });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Power Rankings</h1>
          <p className="mt-1 text-sm text-text-secondary">
            {selectedWeek.label} · averaged across {analystCount} analysts
          </p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-1.5">
        {weeks.map((w) => (
          <Link
            key={w.id}
            href={`/?week=${w.id}`}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              w.id === selectedWeek.id
                ? "bg-accent text-white"
                : "bg-bg-surface-2 text-text-secondary hover:bg-bg-surface-hover"
            }`}
          >
            {w.label}
          </Link>
        ))}
      </div>

      {rows.every((r) => r.current?.avgRank == null) ? (
        <div className="rounded-2xl border border-dashed border-border-hairline p-8 text-center text-sm text-text-secondary">
          No rankings submitted for {selectedWeek.label} yet.{" "}
          <Link href={`/rankings?week=${selectedWeek.id}`} className="text-accent-strong hover:underline">
            Enter rankings
          </Link>
        </div>
      ) : (
        <ol className="space-y-2">
          {rows.map(({ team, current, delta, isNew, sparkValues }, index) => (
            <li
              key={team.id}
              className="animate-fade-up flex items-center gap-4 rounded-2xl border border-border-hairline bg-bg-surface px-4 py-3"
              style={{ animationDelay: `${index * 25}ms` }}
            >
              <span className="w-7 shrink-0 text-center text-lg font-bold tabular-nums text-text-primary">
                {index + 1}
              </span>
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                style={{ backgroundColor: team.color }}
              >
                {team.shortName.slice(0, 2)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-text-primary">{team.name}</div>
                <div className="text-xs text-text-muted">
                  {current?.avgRank != null
                    ? `avg rank ${current.avgRank.toFixed(1)} · ${current.submittedCount}/${analystCount} in`
                    : "no submissions yet"}
                </div>
              </div>
              <div className="hidden sm:block">
                <Sparkline values={sparkValues} color={team.color} />
              </div>
              <MovementBadge delta={delta} isNew={isNew} />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
