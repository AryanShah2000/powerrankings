import Link from "next/link";
import { auth } from "@/auth";
import { loadAllAverages, getUnlockedWeekIds } from "@/lib/rankings";
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

  const session = await auth();
  const analystId = session!.user!.id!;
  const unlockedWeekIds = await getUnlockedWeekIds(analystId);

  const byTeamWeek = new Map<string, number | null>();
  for (const a of averages) byTeamWeek.set(`${a.teamId}::${a.weekId}`, a.avgRank);

  const data = weeks.map((w) => {
    const point: Record<string, string | number | null> = { week: w.label };
    const isUnlocked = unlockedWeekIds.has(w.id);
    for (const team of teams) {
      point[team.id] = isUnlocked ? byTeamWeek.get(`${team.id}::${w.id}`) ?? null : null;
    }
    return point;
  });

  const hasAnyUnlockedData = weeks.some(
    (w) => unlockedWeekIds.has(w.id) && teams.some((t) => byTeamWeek.get(`${t.id}::${w.id}`) != null)
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Trends</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Average rank across the season, Pre-Draft through Week 17. Select up to 3 teams to compare.
          Weeks you haven&rsquo;t submitted your own rankings for stay hidden.
        </p>
      </div>

      {hasAnyUnlockedData ? (
        <TrendsChart
          data={data}
          teams={teams.map((t) => ({ id: t.id, name: t.name, shortName: t.shortName, color: t.color }))}
          teamCount={teams.length}
        />
      ) : (
        <div className="rounded-2xl border border-dashed border-border-hairline p-8 text-center text-sm text-text-secondary">
          Submit your rankings for at least one week to see trends.
        </div>
      )}
    </div>
  );
}
