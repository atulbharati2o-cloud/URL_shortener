import amqp, {
    type Channel,
    type ChannelModel,
} from "amqplib";

import { env } from "./env.js";

const EXCHANGE_NAME = "url.analytics";
const QUEUE_NAME = "url.analytics.queue";
const ROUTING_KEY = "url.redirect";

const RETRY_EXCHANGE_NAME = "url.analytics.retry";
const RETRY_QUEUE_NAME = "url.analytics.retry.queue";
const RETRY_ROUTING_KEY = "url.analytics.retry";

const DLQ_EXCHANGE_NAME = "url.analytics.dlx";
const DLQ_QUEUE_NAME = "url.analytics.dlq";
const DLQ_ROUTING_KEY = "url.analytics.failed";

const RETRY_DELAY_MS = 5000; // 5 seconds

let connection: ChannelModel | null = null;
let channel: Channel | null = null;

export async function connectRabbitMQ() {
    if (connection && channel) {
        return channel;
    }

    connection = await amqp.connect(env.rabbitmqUrl);

    connection.on("error", (error) => {
        console.error("RabbitMQ connection error:", error);
    });
+
    connection.on("close", () => {
        console.warn("RabbitMQ connection closed");
        connection = null;
        channel = null;
    });

    channel = await connection.createChannel();

    // Main analytics exchange
    await channel.assertExchange(EXCHANGE_NAME, "direct", {
        durable: true,
    });

    // Retry exchange
    await channel.assertExchange(RETRY_EXCHANGE_NAME, "direct", {
        durable: true,
    });

    // Dead-letter exchange
    await channel.assertExchange(DLQ_EXCHANGE_NAME, "direct", {
        durable: true,
    });

    // Main analytics queue, failed messages sent to retry exchange
    await channel.assertQueue(QUEUE_NAME, {
        durable: true,
        arguments: {
            "x-dead-letter-exchange": RETRY_EXCHANGE_NAME,
            "x-dead-letter-routing-key": RETRY_ROUTING_KEY,
        }
    });

    // Retry queue, Messages wait here for 5 seconds. After TTL expires, RabbitMQ sends them to the main analytics queue
    await channel.assertQueue(RETRY_QUEUE_NAME, {
        durable: true,
        arguments: {
            "x-message-ttl": RETRY_DELAY_MS,
            "x-dead-letter-exchange": EXCHANGE_NAME,
            "x-dead-letter-routing-key": ROUTING_KEY,
        }
    });

    // Final dead-letter queue for messages that fail after retries
    await channel.assertQueue(DLQ_QUEUE_NAME, {
        durable: true,
    });

    // Main exhange -> Main queue
    await channel.bindQueue(
        QUEUE_NAME,
        EXCHANGE_NAME,
        ROUTING_KEY,
    );

    // Retry exchange -> Retry queue
    await channel.bindQueue(
        RETRY_QUEUE_NAME,
        RETRY_EXCHANGE_NAME,
        RETRY_ROUTING_KEY,
    );

    // Dead-letter exchange -> Dead-letter queue
    await channel.bindQueue(
        DLQ_QUEUE_NAME,
        DLQ_EXCHANGE_NAME,
        DLQ_ROUTING_KEY,
    );

    console.log("RabbitMQ connected");

    return channel;
}

export function getRabbitChannel() {
    return channel;
}

export {
    EXCHANGE_NAME,
    QUEUE_NAME,
    ROUTING_KEY,

    RETRY_EXCHANGE_NAME,
    RETRY_QUEUE_NAME,
    RETRY_ROUTING_KEY,

    DLQ_EXCHANGE_NAME,
    DLQ_QUEUE_NAME,
    DLQ_ROUTING_KEY,
};