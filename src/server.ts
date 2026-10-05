import { env } from "./config/env.js";
import { redis } from "./config/redis.js";
import app from "./app.js";

const startServer = async () => {
  try {
    if (!redis.isOpen) {
      await redis.connect();
      console.log("Redis connected");
    }
  } catch (error) {
    console.warn("Redis unavailable. Starting server without Redis.");
  }

  app.listen(env.port, () => {
    console.log(`Server running on http://localhost:${env.port}`);
  });
};

startServer();
