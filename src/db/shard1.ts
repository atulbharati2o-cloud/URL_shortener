
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/shard1/client.js";
import { env } from "../config/env.js";

const adapter = new PrismaMariaDb({
  host: env.shard1DatabaseHost,
  port: env.shard1DatabasePort,
  user: env.shard1DatabaseUser,
  password: env.shard1DatabasePassword,
  database: env.shard1DatabaseName,
  connectionLimit: 5,
});

export const shard1 = new PrismaClient({ adapter });
