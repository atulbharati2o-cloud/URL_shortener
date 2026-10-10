import "dotenv/config";

function getEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const env = {
  port: Number(getEnv("PORT")),
  
  databaseHost: getEnv("DATABASE_HOST"),
  databaseUser: getEnv("DATABASE_USER"),
  databasePassword: getEnv("DATABASE_PASSWORD"),
  databaseName: getEnv("DATABASE_NAME"),

  shard0DatabaseHost: getEnv("SHARD_0_DATABASE_HOST"),
  shard0DatabasePort: Number(getEnv("SHARD_0_DATABASE_PORT")),
  shard0DatabaseUser: getEnv("SHARD_0_DATABASE_USER"),
  shard0DatabasePassword: getEnv("SHARD_0_DATABASE_PASSWORD"),
  shard0DatabaseName: getEnv("SHARD_0_DATABASE_NAME"),

  shard1DatabaseHost: getEnv("SHARD_1_DATABASE_HOST"),
  shard1DatabasePort: Number(getEnv("SHARD_1_DATABASE_PORT")),
  shard1DatabaseUser: getEnv("SHARD_1_DATABASE_USER"),
  shard1DatabasePassword: getEnv("SHARD_1_DATABASE_PASSWORD"),
  shard1DatabaseName: getEnv("SHARD_1_DATABASE_NAME"),
  
  jwtSecret: getEnv("JWT_SECRET"),
  jwtExpiresInSeconds: Number(getEnv("JWT_EXPIRES_IN_SECONDS")),

  redisUrl: getEnv("REDIS_URL"),

  rabbitmqUrl: getEnv("RABBITMQ_URL"),

  mongodbUrl: getEnv("MONGODB_URL"),
  mongodbDatabase: getEnv("MONGODB_DATABASE"),
};