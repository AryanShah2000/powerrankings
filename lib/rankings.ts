import { prisma } from "@/lib/prisma";

export type WeekRow = { id: string; label: string; order: number };
export type TeamRow = { id: string; name: string; shortName: string; color: string; order: number };

export type WeekAverage = {
  teamId: string;
  weekId: string;
  weekOrder: number;
  avgRank: number | null;
  submittedCount: number;
  byAnalyst: Record<string, number>;
};

/**
 * Loads every ranking in the league and reduces it to a per-team, per-week
 * average (mean of however many analysts have submitted that week).
 */
export async function loadAllAverages(): Promise<{
  weeks: WeekRow[];
  teams: TeamRow[];
  analystCount: number;
  averages: WeekAverage[];
}> {
  const [weeks, teams, analystCount, rankings] = await Promise.all([
    prisma.week.findMany({ orderBy: { order: "asc" } }),
    prisma.team.findMany({ where: { archived: false }, orderBy: { order: "asc" } }),
    prisma.analyst.count(),
    prisma.ranking.findMany({
      include: { week: true },
    }),
  ]);

  const key = (teamId: string, weekId: string) => `${teamId}::${weekId}`;
  const grouped = new Map<string, { total: number; count: number; byAnalyst: Record<string, number> }>();

  for (const r of rankings) {
    const k = key(r.teamId, r.weekId);
    const entry = grouped.get(k) ?? { total: 0, count: 0, byAnalyst: {} };
    entry.total += r.rank;
    entry.count += 1;
    entry.byAnalyst[r.analystId] = r.rank;
    grouped.set(k, entry);
  }

  const averages: WeekAverage[] = [];
  for (const team of teams) {
    for (const week of weeks) {
      const entry = grouped.get(key(team.id, week.id));
      averages.push({
        teamId: team.id,
        weekId: week.id,
        weekOrder: week.order,
        avgRank: entry ? entry.total / entry.count : null,
        submittedCount: entry?.count ?? 0,
        byAnalyst: entry?.byAnalyst ?? {},
      });
    }
  }

  return { weeks, teams, analystCount, averages };
}

/**
 * Weeks this analyst has submitted their own rankings for — results for any
 * other week stay hidden from them until they do, so nobody's picks are
 * biased by seeing the rest of the committee first.
 */
export async function getUnlockedWeekIds(analystId: string): Promise<Set<string>> {
  const rows = await prisma.ranking.findMany({
    where: { analystId },
    select: { weekId: true },
    distinct: ["weekId"],
  });
  return new Set(rows.map((r) => r.weekId));
}

/**
 * Aggregated (mean) rank per team for a single week, from every analyst's
 * submission that week.
 */
export async function getWeekAverageRanks(weekId: string): Promise<Map<string, number>> {
  const rankings = await prisma.ranking.findMany({
    where: { weekId },
    select: { teamId: true, rank: true },
  });

  const totals = new Map<string, { total: number; count: number }>();
  for (const r of rankings) {
    const entry = totals.get(r.teamId) ?? { total: 0, count: 0 };
    entry.total += r.rank;
    entry.count += 1;
    totals.set(r.teamId, entry);
  }

  return new Map([...totals].map(([teamId, { total, count }]) => [teamId, total / count]));
}

/**
 * Team order sorted by aggregated rank (teams with no data fall to the end,
 * in their configured order) — used as the default order for a week an
 * analyst hasn't ranked yet, seeded from the prior week's results.
 */
export function orderTeamsByAvgRank(teams: TeamRow[], avgRanks: Map<string, number>): string[] {
  return [...teams]
    .sort((a, b) => {
      const rankA = avgRanks.get(a.id) ?? Number.POSITIVE_INFINITY;
      const rankB = avgRanks.get(b.id) ?? Number.POSITIVE_INFINITY;
      if (rankA !== rankB) return rankA - rankB;
      return a.order - b.order;
    })
    .map((t) => t.id);
}

export function currentWeekFor(weeks: WeekRow[], averages: WeekAverage[]): WeekRow | null {
  if (weeks.length === 0) return null;
  const withData = new Set(
    averages.filter((a) => a.submittedCount > 0).map((a) => a.weekId)
  );
  const sorted = [...weeks].sort((a, b) => b.order - a.order);
  const latest = sorted.find((w) => withData.has(w.id));
  return latest ?? weeks[0];
}
