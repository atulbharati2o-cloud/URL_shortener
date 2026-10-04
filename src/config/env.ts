import "dotenv/config";

function getEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const env = {
  databaseHost: getEnv("DATABASE_HOST"),
  databaseUser: getEnv("DATABASE_USER"),
  databasePassword: getEnv("DATABASE_PASSWORD"),
  databaseName: getEnv("DATABASE_NAME"),
};