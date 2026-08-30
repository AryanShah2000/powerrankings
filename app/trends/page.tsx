import Link from "next/link";
import { loadAllAverages } from "@/lib/rankings";
import { TrendsChart } from "./trends-chart";

export default async function TrendsPage() {
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

  const byTeamWeek = new Map<string, number | null>();
  for (const a of averages) byTeamWeek.set(`${a.teamId}::${a.weekId}`, a.avgRank);

  const data = weeks.map((w) => {
    const point: Record<string, string | number | null> = { week: w.label };
    for (const team of teams) {
      point[team.id] = byTeamWeek.get(`${team.id}::${w.id}`) ?? null;
    }
    return point;
  });

  const hasAnyData = averages.some((a) => a.avgRank != null);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Trends</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Average rank across the season, Pre-Draft through Week 17. Select up to 3 teams to compare.
        </p>
      </div>

      {hasAnyData ? (
        <TrendsChart
          data={data}
          teams={teams.map((t) => ({ id: t.id, name: t.name, shortName: t.shortName, color: t.color }))}
          teamCount={teams.length}
        />
      ) : (
        <div className="rounded-2xl border border-dashed border-border-hairline p-8 text-center text-sm text-text-secondary">
          No rankings submitted yet.
        </div>
      )}
    </div>
  );
}
