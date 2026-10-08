import {
    EXCHANGE_NAME,
    ROUTING_KEY,
    getRabbitChannel,
} from "../../config/rabbitmq.js";

export interface UrlRedirectEvent {
    shortCode: string;
    timestamp: string;
    ip: string | null;
    userAgent: string | null;
    referer: string | null;
    path: string;
    statusCode: number;
}

export function publishRedirectEvent(
    event: UrlRedirectEvent,
): boolean {
    const channel = getRabbitChannel();

    if (!channel) {
        console.warn(
            "RabbitMQ unavailable. Analytics event was not published.",
        );

        return false;
    }

    try {
        const message = Buffer.from(
            JSON.stringify(event),
        );

        return channel.publish(
            EXCHANGE_NAME,
            ROUTING_KEY,
            message,
            {
                persistent: true,
            }
        );
    } catch (error) {
        console.error(
            "Failed to publish analytics event:",
            error,
        );

        return false;
    }
}