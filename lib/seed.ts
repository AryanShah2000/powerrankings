import type { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const WEEKS = ["Pre-Draft", ...Array.from({ length: 17 }, (_, i) => `Week ${i + 1}`)];

const ANALYSTS = [
  { username: "aryan", name: "Aryan", envVar: "ANALYST_ARYAN_PASSWORD" },
  { username: "dev", name: "Dev", envVar: "ANALYST_DEV_PASSWORD" },
  { username: "manit", name: "Manit", envVar: "ANALYST_MANIT_PASSWORD" },
];

function randomPassword() {
  return Math.random().toString(36).slice(2, 10);
}

export async function seedDatabase(prisma: PrismaClient): Promise<string[]> {
  const log: string[] = [];

  for (const [order, label] of WEEKS.entries()) {
    await prisma.week.upsert({
      where: { label },
      update: { order },
      create: { label, order },
    });
  }
  log.push(`Seeded ${WEEKS.length} weeks (Pre-Draft → Week 17).`);

  for (const a of ANALYSTS) {
    const existing = await prisma.analyst.findUnique({ where: { username: a.username } });
    if (existing) {
      log.push(`Analyst "${a.name}" already exists, skipped.`);
      continue;
    }

    const password = process.env[a.envVar] ?? randomPassword();
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.analyst.create({
      data: { username: a.username, name: a.name, passwordHash },
    });

    log.push(
      process.env[a.envVar]
        ? `Created analyst "${a.name}" with the password from ${a.envVar}.`
        : `Created analyst "${a.name}" with a GENERATED password: ${password} (set ${a.envVar} to control this next time).`
    );
  }

  return log;
}
