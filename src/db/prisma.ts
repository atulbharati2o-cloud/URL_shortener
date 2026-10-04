import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/client.js";
import { env } from "../config/env.js";

const adapter = new PrismaMariaDb({
  host: env.databaseHost,
  user: env.databaseUser,
  password: env.databasePassword,
  database: env.databaseName,
  connectionLimit: 5,
});

export const prisma = new PrismaClient({
  adapter,
});