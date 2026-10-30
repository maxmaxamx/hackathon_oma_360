import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const foremen = [
  { name: "Алексей Кузнецов", email: "pro@oma.by" },
  { name: "Дмитрий Семенов", email: "dmitry@oma.by" },
  { name: "Вадим Ковалев", email: "vadim@oma.by" },
  { name: "Марина Волкова", email: "marina@oma.by" },
];

async function main() {
  const passwordHash = await bcrypt.hash("oma360demo", 10);

  if (process.argv.includes("--if-empty")) {
    const users = await prisma.user.count();
    if (users > 0) {
      console.log("Database already has users, seeding skipped.");
      return;
    }
  }

  for (const foreman of foremen) {
    await prisma.user.upsert({
      where: { email: foreman.email },
      create: {
        name: foreman.name,
        email: foreman.email,
        passwordHash,
        role: "FOREMAN",
      },
      update: {
        name: foreman.name,
        role: "FOREMAN",
        passwordHash,
      },
    });
  }
  console.log(`Seeded ${foremen.length} foremen.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
