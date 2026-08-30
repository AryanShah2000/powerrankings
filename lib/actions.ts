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

export async function saveWeekRankings(weekId: string, teamOrder: string[]) {
  const analystId = await requireAnalystId();
  if (teamOrder.length === 0) throw new Error("No teams to rank.");

  await prisma.$transaction(
    teamOrder.map((teamId, index) =>
      prisma.ranking.upsert({
        where: { analystId_teamId_weekId: { analystId, teamId, weekId } },
        update: { rank: index + 1 },
        create: { analystId, teamId, weekId, rank: index + 1 },
      })
    )
  );

  revalidatePath("/");
  revalidatePath("/rankings");
  revalidatePath("/board");
  revalidatePath("/trends");
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
