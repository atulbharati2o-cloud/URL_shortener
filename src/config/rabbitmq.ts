import amqp, {
    type Channel,
    type ChannelModel,
} from "amqplib";

import { env } from "./env.js";

const EXCHANGE_NAME = "url.analytics";
const QUEUE_NAME = "url.analytics.queue";
const ROUTING_KEY = "url.redirect";

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

    connection.on("close", () => {
        console.warn("RabbitMQ connection closed");
        connection = null;
        channel = null;
    });

    channel = await connection.createChannel();

    await channel.assertExchange(EXCHANGE_NAME, "direct", {
        durable: true,
    });

    await channel.assertQueue(QUEUE_NAME, {
        durable: true,
    });

    await channel.bindQueue(
        QUEUE_NAME,
        EXCHANGE_NAME,
        ROUTING_KEY,
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
};