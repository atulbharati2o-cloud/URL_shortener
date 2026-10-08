import { env } from "./config/env.js";
import { redis } from "./config/redis.js";
import app from "./app.js";
import { connectRabbitMQ } from "./config/rabbitmq.js";

const startServer = async () => {
  try {
    if (!redis.isOpen) {
      await redis.connect();
      console.log("Redis connected");
    }
  } catch (error) {
    console.warn("Redis unavailable. Starting server without Redis.");
  }

  try {
    await connectRabbitMQ();
  } catch (error) {
    console.warn("RabbitMQ unavailable. Starting server without RabbitMQ.");
  }

  app.listen(env.port, () => {
    console.log(`Server running on http://localhost:${env.port}`);
  });
};

startServer();
