import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { seedDatabase } from "@/lib/seed";

export async function GET(request: Request) {
  const secret = new URL(request.url).searchParams.get("secret");
  const expected = process.env.SEED_SECRET;

  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const log = await seedDatabase(prisma);
  return NextResponse.json({ ok: true, log });
}
