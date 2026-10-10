import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
    schema: "prisma-shards/shard-0/schema.prisma",
    datasource: {
        url: process.env.SHARD_0_DATABASE_URL,
    },
});
