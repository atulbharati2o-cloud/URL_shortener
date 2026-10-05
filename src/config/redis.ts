import { createClient } from "redis";
import { env } from "./env.js";

export const redis = createClient({
  url: env.redisUrl,
  socket: {
    reconnectStrategy: false, // Disable automatic reconnection
  }
});

redis.on("error", (error) => {
  console.error("Redis Client Error:", error);
});