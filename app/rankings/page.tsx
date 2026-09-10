import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getWeekAverageRanks, orderTeamsByAvgRank } from "@/lib/rankings";
import { RankingBoard } from "./ranking-board";

export default async function RankingsPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const session = await auth();
  const analystId = session!.user!.id!;

  const [weeks, teams, analysts] = await Promise.all([
    prisma.week.findMany({ orderBy: { order: "asc" } }),
    prisma.team.findMany({ where: { archived: false }, orderBy: { order: "asc" } }),
    prisma.analyst.findMany({ select: { id: true, name: true } }),
  ]);

  if (teams.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
        <h1 className="text-lg font-semibold">No teams yet</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Add your league&rsquo;s teams before entering rankings.
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
  const selectedWeek = weeks.find((w) => w.id === params.week) ?? weeks[0];

  const [myRankings, weekRankings] = await Promise.all([
    prisma.ranking.findMany({
      where: { analystId, weekId: selectedWeek.id },
      orderBy: { rank: "asc" },
    }),
    prisma.ranking.findMany({
      where: { weekId: selectedWeek.id },
      select: { analystId: true },
      distinct: ["analystId"],
    }),
  ]);

  const previousWeek = weeks
    .filter((w) => w.order < selectedWeek.order)
    .sort((a, b) => b.order - a.order)[0];
  const priorWeekAverages = previousWeek
    ? await getWeekAverageRanks(previousWeek.id)
    : new Map<string, number>();

  const orderedTeamIds =
    myRankings.length > 0
      ? myRankings.map((r) => r.teamId)
      : orderTeamsByAvgRank(teams, priorWeekAverages);

  const initialComments = Object.fromEntries(
    myRankings.filter((r) => r.comment).map((r) => [r.teamId, r.comment as string])
  );

  // Include any team not yet in the analyst's saved order (newly added teams).
  const knownIds = new Set(orderedTeamIds);
  const fullOrder = [...orderedTeamIds, ...teams.filter((t) => !knownIds.has(t.id)).map((t) => t.id)];

  const submittedAnalystIds = new Set(weekRankings.map((r) => r.analystId));

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Enter Rankings</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Drag to reorder — 1 is your best team this week.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-1.5">
        {weeks.map((w) => (
          <Link
            key={w.id}
            href={`/rankings?week=${w.id}`}
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

      <div className="mb-5 flex flex-wrap gap-2 text-xs text-text-secondary">
        {analysts.map((a) => (
          <span
            key={a.id}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${
              submittedAnalystIds.has(a.id)
                ? "border-status-good/30 bg-status-good/10 text-status-good"
                : "border-border-hairline bg-bg-surface-2 text-text-muted"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${submittedAnalystIds.has(a.id) ? "bg-status-good" : "bg-text-muted"}`} />
            {a.name} {submittedAnalystIds.has(a.id) ? "submitted" : "not yet"}
          </span>
        ))}
      </div>

      <RankingBoard
        key={`${selectedWeek.id}:${teams.map((t) => t.id).join(",")}`}
        weekId={selectedWeek.id}
        teams={teams}
        initialOrder={fullOrder}
        initialComments={initialComments}
      />
    </div>
  );
}
