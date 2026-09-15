import Link from "next/link";
import { auth } from "@/auth";
import { loadAllAverages, currentWeekFor, getUnlockedWeekIds } from "@/lib/rankings";
import { prisma } from "@/lib/prisma";
import { MovementBadge } from "@/components/movement-badge";
import { WeekLocked } from "@/components/week-locked";

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { weeks, teams, averages } = await loadAllAverages();

  if (teams.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
        <h1 className="text-lg font-semibold">No teams yet</h1>
        <Link href="/teams" className="mt-4 inline-block text-sm text-accent-strong hover:underline">
          Add your league&rsquo;s teams
        </Link>
      </div>
    );
  }

  const analysts = await prisma.analyst.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const analystNameById = new Map(analysts.map((a) => [a.id, a.name]));

  const session = await auth();
  const analystId = session!.user!.id!;
  const unlockedWeekIds = await getUnlockedWeekIds(analystId);

  const byTeamWeek = new Map<string, (typeof averages)[number]>();
  for (const a of averages) byTeamWeek.set(`${a.teamId}::${a.weekId}`, a);

  const params = await searchParams;
  const fallbackWeek = currentWeekFor(weeks, averages);
  const selectedWeek = weeks.find((w) => w.id === params.week) ?? fallbackWeek ?? weeks[0];
  const isSelectedWeekUnlocked = unlockedWeekIds.has(selectedWeek.id);
  const previousWeek = weeks
    .filter((w) => w.order < selectedWeek.order)
    .sort((a, b) => b.order - a.order)[0];

  const teamCount = teams.length;

  const weekComments = isSelectedWeekUnlocked
    ? await prisma.ranking.findMany({
        where: { weekId: selectedWeek.id, teamId: { in: teams.map((t) => t.id) }, NOT: { comment: null } },
        select: { teamId: true, analystId: true, comment: true },
      })
    : [];
  const commentsByTeam = new Map<string, { analystName: string; comment: string }[]>();
  for (const c of weekComments) {
    if (!c.comment || !c.comment.trim()) continue;
    const list = commentsByTeam.get(c.teamId) ?? [];
    list.push({ analystName: analystNameById.get(c.analystId) ?? "?", comment: c.comment });
    commentsByTeam.set(c.teamId, list);
  }

  const snapshotRows = teams
    .map((team) => {
      const current = byTeamWeek.get(`${team.id}::${selectedWeek.id}`);
      const previous = previousWeek ? byTeamWeek.get(`${team.id}::${previousWeek.id}`) : undefined;
      const delta =
        current?.avgRank != null && previous?.avgRank != null
          ? previous.avgRank - current.avgRank
          : null;
      const isNew = current?.avgRank != null && previous?.avgRank == null;
      return { team, current, delta, isNew };
    })
    .sort((a, b) => {
      if (a.current?.avgRank == null && b.current?.avgRank == null) return 0;
      if (a.current?.avgRank == null) return 1;
      if (b.current?.avgRank == null) return -1;
      return a.current.avgRank - b.current.avgRank;
    });

  let previousAvgRank: number | null = null;
  let currentRank = 0;
  const rankedSnapshotRows = snapshotRows.map((row, index) => {
    const avgRank = row.current?.avgRank ?? null;
    const isTie = avgRank != null && previousAvgRank != null && Math.abs(avgRank - previousAvgRank) < 1e-9;
    if (!isTie) currentRank = index + 1;
    previousAvgRank = avgRank;
    return { ...row, rank: currentRank };
  });

  const seasonRows = teams
    .map((team) => {
      const latest = fallbackWeek ? byTeamWeek.get(`${team.id}::${fallbackWeek.id}`) : undefined;
      return { team, sortKey: latest?.avgRank ?? Number.POSITIVE_INFINITY };
    })
    .sort((a, b) => a.sortKey - b.sortKey);

  function cellStyle(avgRank: number | null) {
    if (avgRank == null) return undefined;
    const normalized = teamCount > 1 ? 1 - (avgRank - 1) / (teamCount - 1) : 1;
    const alpha = 0.06 + normalized * 0.34;
    return { backgroundColor: `rgba(57, 135, 229, ${alpha.toFixed(3)})` };
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Full Board</h1>
        <p className="mt-1 text-sm text-text-secondary">
          A single week to screenshot and share, plus the full-season matrix below.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-1.5">
        {weeks.map((w) => (
          <Link
            key={w.id}
            href={`/board?week=${w.id}`}
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              w.id === selectedWeek.id
                ? "bg-accent text-white"
                : "bg-bg-surface-2 text-text-secondary hover:bg-bg-surface-hover"
            }`}
          >
            {!unlockedWeekIds.has(w.id) && <span className="text-[10px]">🔒</span>}
            {w.label}
          </Link>
        ))}
      </div>

      {!isSelectedWeekUnlocked ? (
        <div className="mb-10">
          <WeekLocked weekId={selectedWeek.id} weekLabel={selectedWeek.label} />
        </div>
      ) : (
        <div className="mb-10 flex flex-wrap items-start gap-4">
        <div className="inline-block overflow-x-auto rounded-2xl border border-border-hairline bg-bg-surface">
          <table className="border-collapse text-sm">
            <caption className="border-b border-border-hairline px-4 py-3 text-left text-base font-semibold text-text-primary">
              {selectedWeek.label} Power Rankings
            </caption>
            <thead>
              <tr>
                <th className="border-b border-border-hairline px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Team
                </th>
                <th className="border-b border-border-hairline px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Avg
                  <br />
                  Rank
                </th>
                {analysts.map((a) => (
                  <th
                    key={a.id}
                    className="border-b border-l border-border-hairline px-1.5 py-2 text-center text-xs font-semibold uppercase tracking-wide text-text-muted"
                  >
                    <span className="inline-block whitespace-nowrap [writing-mode:vertical-rl] rotate-180">
                      {a.name}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rankedSnapshotRows.map(({ team, current, delta, isNew, rank }) => (
                <tr key={team.id}>
                  <td className="border-b border-border-hairline px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="w-4 text-right text-xs font-semibold tabular-nums text-text-muted">
                        {rank}
                      </span>
                      <span
                        className="h-6 w-6 shrink-0 rounded-full text-center text-[10px] font-semibold leading-6 text-white"
                        style={{ backgroundColor: team.color }}
                      >
                        {team.shortName.slice(0, 2)}
                      </span>
                      <span className="whitespace-nowrap font-medium text-text-primary">{team.name}</span>
                    </div>
                  </td>
                  <td className="border-b border-border-hairline px-2 py-2">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="tabular-nums font-semibold text-text-primary">
                        {current?.avgRank != null ? Math.round(current.avgRank) : "–"}
                      </span>
                      <MovementBadge delta={delta} isNew={isNew} decimals={0} />
                    </div>
                  </td>
                  {analysts.map((a) => (
                    <td
                      key={a.id}
                      className="border-b border-l border-border-hairline px-2 py-2 text-center tabular-nums text-text-secondary"
                    >
                      {current?.byAnalyst[a.id] ?? <span className="text-text-muted">–</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {commentsByTeam.size > 0 && (
          <div className="w-full max-w-sm shrink-0 rounded-2xl border border-border-hairline bg-bg-surface p-4 sm:w-80">
            <h3 className="mb-3 text-sm font-semibold text-text-primary">Analyst comments</h3>
            <ul className="space-y-3">
              {rankedSnapshotRows
                .filter(({ team }) => commentsByTeam.has(team.id))
                .map(({ team }) => (
                  <li key={team.id}>
                    <div className="mb-1 flex items-center gap-2">
                      <span
                        className="h-5 w-5 shrink-0 rounded-full text-center text-[10px] font-semibold leading-5 text-white"
                        style={{ backgroundColor: team.color }}
                      >
                        {team.shortName.slice(0, 2)}
                      </span>
                      <span className="text-sm font-medium text-text-primary">{team.name}</span>
                    </div>
                    <ul className="space-y-1 pl-7">
                      {commentsByTeam.get(team.id)!.map((c, i) => (
                        <li key={i} className="text-xs text-text-secondary">
                          <span className="font-semibold text-text-muted">{c.analystName}:</span>{" "}
                          {c.comment}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
            </ul>
          </div>
        )}
        </div>
      )}

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">
        Full season
      </h2>
      <div className="overflow-x-auto rounded-2xl border border-border-hairline">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 min-w-[160px] border-b border-border-hairline bg-bg-surface px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                Team
              </th>
              {weeks.map((w) => (
                <th
                  key={w.id}
                  className="min-w-[64px] border-b border-l border-border-hairline bg-bg-surface px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-text-muted"
                >
                  {w.label.replace("Week ", "W")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {seasonRows.map(({ team }) => (
              <tr key={team.id} className="group">
                <td className="sticky left-0 z-10 border-b border-border-hairline bg-bg-page px-3 py-2 group-hover:bg-bg-surface-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-5 w-5 shrink-0 rounded-full text-[10px] font-semibold leading-5 text-white text-center"
                      style={{ backgroundColor: team.color }}
                    >
                      {team.shortName.slice(0, 1)}
                    </span>
                    <span className="truncate font-medium text-text-primary">{team.name}</span>
                  </div>
                </td>
                {weeks.map((w) => {
                  if (!unlockedWeekIds.has(w.id)) {
                    return (
                      <td
                        key={w.id}
                        title={`Submit your ${w.label} rankings to unlock`}
                        className="border-b border-l border-border-hairline px-2 py-2 text-center text-text-muted"
                      >
                        🔒
                      </td>
                    );
                  }
                  const cell = byTeamWeek.get(`${team.id}::${w.id}`);
                  const avgRank = cell?.avgRank ?? null;
                  const tooltip =
                    cell && Object.keys(cell.byAnalyst).length > 0
                      ? Object.entries(cell.byAnalyst)
                          .map(([id, rank]) => `${analystNameById.get(id) ?? "?"}: ${rank}`)
                          .join("\n")
                      : "No submissions";
                  return (
                    <td
                      key={w.id}
                      title={tooltip}
                      style={cellStyle(avgRank)}
                      className="border-b border-l border-border-hairline px-2 py-2 text-center tabular-nums text-text-primary"
                    >
                      {avgRank != null ? Math.round(avgRank) : <span className="text-text-muted">–</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
