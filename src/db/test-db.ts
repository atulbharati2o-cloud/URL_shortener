import "dotenv/config";
import { prisma } from "./prisma.js";

async function main() {
    await prisma.$queryRaw`SELECT 1`;

    console.log("Database connection successful");
}

main()
    .catch((error) => {
        console.error("Database connection failed:", error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });