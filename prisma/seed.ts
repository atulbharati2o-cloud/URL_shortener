import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client.js";

const adapter = new PrismaMariaDb({
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  connectionLimit: 5,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  const ticketServer = await prisma.ticketServer.create({
    data: {
      name: "ticket-server-1",
      status: "ACTIVE",
    },
  });

  await prisma.ticketRange.create({
    data: {
      startValue: 1_000_000n,
      endValue: 1_000_999n,
      currentValue: 1_000_000n,
      serverId: ticketServer.id,
    },
  });

  console.log("Seed completed");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });