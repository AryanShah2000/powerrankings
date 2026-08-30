import { PrismaClient } from "@prisma/client";
import { seedDatabase } from "../lib/seed";

const prisma = new PrismaClient();

seedDatabase(prisma)
  .then((log) => log.forEach((line) => console.log(line)))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
