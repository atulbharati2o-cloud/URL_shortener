import dns from "node:dns";

dns.setServers([
  "8.8.8.8",
]);

dns.setDefaultResultOrder("ipv4first");

import { env } from "./config/env.js";
import { redis } from "./config/redis.js";
import app from "./app.js";
import { connectRabbitMQ } from "./config/rabbitmq.js";
import { connectMongoDB } from "./config/mongodb.js";

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

  try {
    await connectMongoDB();
  } catch (error) {
    console.warn("MongoDB unavailable. Starting server without MongoDB.");
  }

  app.listen(env.port, () => {
    console.log(`Server running on http://localhost:${env.port}`);
  });
};

startServer();
