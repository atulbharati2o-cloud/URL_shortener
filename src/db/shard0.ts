
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/shard0/client.js";
import { env } from "../config/env.js";

const adapter = new PrismaMariaDb({
  host: env.shard0DatabaseHost,
  port: env.shard0DatabasePort,
  user: env.shard0DatabaseUser,
  password: env.shard0DatabasePassword,
  database: env.shard0DatabaseName,
  connectionLimit: 5,
});

export const shard0 = new PrismaClient({ adapter });
