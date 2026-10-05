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
  
  jwtSecret: getEnv("JWT_SECRET"),
  jwtExpiresInSeconds: Number(getEnv("JWT_EXPIRES_IN_SECONDS")),

  redisUrl: getEnv("REDIS_URL"),
};