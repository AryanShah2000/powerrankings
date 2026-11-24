"use server";

import { revalidatePath } from "next/cache";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { colorForIndex } from "@/lib/team-colors";

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}

async function requireAnalystId() {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw new Error("Not signed in.");
  return id;
}

export async function saveWeekRankings(
  weekId: string,
  teamOrder: string[],
  comments: Record<string, string> = {}
) {
  const analystId = await requireAnalystId();
  if (teamOrder.length === 0) throw new Error("No teams to rank.");

  await prisma.$transaction(
    teamOrder.map((teamId, index) => {
      const comment = comments[teamId]?.trim() || null;
      return prisma.ranking.upsert({
        where: { analystId_teamId_weekId: { analystId, teamId, weekId } },
        update: { rank: index + 1, comment },
        create: { analystId, teamId, weekId, rank: index + 1, comment },
      });
    })
  );

  revalidatePath("/");
  revalidatePath("/rankings");
  revalidatePath("/board");
  revalidatePath("/trends");
}

/**
 * Carries this analyst's most recent earlier ranked week forward into
 * `weekId` and saves it immediately — the "we missed a week" escape hatch.
 * Walks back past any skipped weeks to find the last one they actually
 * ranked, rather than only the immediately preceding week.
 */
export async function copyFromPreviousWeek(weekId: string) {
  const analystId = await requireAnalystId();
  const targetWeek = await prisma.week.findUniqueOrThrow({ where: { id: weekId } });

  const sourceRanking = await prisma.ranking.findFirst({
    where: { analystId, week: { order: { lt: targetWeek.order } } },
    orderBy: { week: { order: "desc" } },
    select: { weekId: true, week: { select: { label: true } } },
  });

  if (!sourceRanking) {
    throw new Error("No earlier week to copy from yet.");
  }

  const [sourceRows, activeTeams] = await Promise.all([
    prisma.ranking.findMany({
      where: { analystId, weekId: sourceRanking.weekId },
      orderBy: { rank: "asc" },
    }),
    prisma.team.findMany({ where: { archived: false }, orderBy: { order: "asc" } }),
  ]);

  const teamOrder = sourceRows.map((r) => r.teamId);
  const comments = Object.fromEntries(
    sourceRows.filter((r) => r.comment).map((r) => [r.teamId, r.comment as string])
  );

  // Include any team not covered by the copied week (newly added since then).
  const known = new Set(teamOrder);
  const fullOrder = [...teamOrder, ...activeTeams.filter((t) => !known.has(t.id)).map((t) => t.id)];

  await saveWeekRankings(weekId, fullOrder, comments);

  return { teamOrder: fullOrder, comments, sourceWeekLabel: sourceRanking.week.label };
}

export async function createTeam(name: string, shortName: string) {
  await requireAnalystId();
  const trimmedName = name.trim();
  const trimmedShort = shortName.trim().toUpperCase().slice(0, 4);
  if (!trimmedName) throw new Error("Team name is required.");

  const count = await prisma.team.count();
  await prisma.team.create({
    data: {
      name: trimmedName,
      shortName: trimmedShort || trimmedName.slice(0, 3).toUpperCase(),
      color: colorForIndex(count),
      order: count,
    },
  });

  revalidatePath("/");
  revalidatePath("/teams");
  revalidatePath("/rankings");
  revalidatePath("/board");
  revalidatePath("/trends");
}

export async function renameTeam(teamId: string, name: string, shortName: string) {
  await requireAnalystId();
  const trimmedName = name.trim();
  const trimmedShort = shortName.trim().toUpperCase().slice(0, 4);
  if (!trimmedName) throw new Error("Team name is required.");

  await prisma.team.update({
    where: { id: teamId },
    data: { name: trimmedName, shortName: trimmedShort || trimmedName.slice(0, 3).toUpperCase() },
  });

  revalidatePath("/");
  revalidatePath("/teams");
  revalidatePath("/rankings");
  revalidatePath("/board");
  revalidatePath("/trends");
}

export async function archiveTeam(teamId: string) {
  await requireAnalystId();
  await prisma.team.update({ where: { id: teamId }, data: { archived: true } });

  revalidatePath("/");
  revalidatePath("/teams");
  revalidatePath("/rankings");
  revalidatePath("/board");
  revalidatePath("/trends");
}

export async function restoreTeam(teamId: string) {
  await requireAnalystId();
  await prisma.team.update({ where: { id: teamId }, data: { archived: false } });

  revalidatePath("/");
  revalidatePath("/teams");
  revalidatePath("/rankings");
  revalidatePath("/board");
  revalidatePath("/trends");
}

export async function reorderTeams(orderedIds: string[]) {
  await requireAnalystId();
  await prisma.$transaction(
    orderedIds.map((id, index) => prisma.team.update({ where: { id }, data: { order: index } }))
  );

  revalidatePath("/teams");
  revalidatePath("/rankings");
}
