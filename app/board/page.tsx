import Link from "next/link";
import { loadAllAverages, currentWeekFor } from "@/lib/rankings";
import { prisma } from "@/lib/prisma";

export default async function BoardPage() {
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

  const analysts = await prisma.analyst.findMany({ select: { id: true, name: true } });
  const analystNameById = new Map(analysts.map((a) => [a.id, a.name]));

  const byTeamWeek = new Map<string, (typeof averages)[number]>();
  for (const a of averages) byTeamWeek.set(`${a.teamId}::${a.weekId}`, a);

  const latestWeek = currentWeekFor(weeks, averages);
  const teamCount = teams.length;

  const rows = teams
    .map((team) => {
      const latest = latestWeek ? byTeamWeek.get(`${team.id}::${latestWeek.id}`) : undefined;
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
          Average rank by team and week — darker means a better (lower) average rank. Hover a cell for the analyst breakdown.
        </p>
      </div>

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
            {rows.map(({ team }) => (
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
                  const cell = byTeamWeek.get(`${team.id}::${w.id}`);
                  const avgRank = cell?.avgRank ?? null;
                  const tooltip =
                    cell && Object.keys(cell.byAnalyst).length > 0
                      ? Object.entries(cell.byAnalyst)
                          .map(([analystId, rank]) => `${analystNameById.get(analystId) ?? "?"}: ${rank}`)
                          .join("\n")
                      : "No submissions";
                  return (
                    <td
                      key={w.id}
                      title={tooltip}
                      style={cellStyle(avgRank)}
                      className="border-b border-l border-border-hairline px-2 py-2 text-center tabular-nums text-text-primary"
                    >
                      {avgRank != null ? avgRank.toFixed(1) : <span className="text-text-muted">–</span>}
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
