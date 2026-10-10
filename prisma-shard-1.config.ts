import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
    schema: "prisma-shards/shard-1/schema.prisma",
    datasource: {
        url: process.env.SHARD_1_DATABASE_URL,
    },
});
