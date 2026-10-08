import type { ConsumeMessage } from "amqplib";

import {
    connectRabbitMQ,
    QUEUE_NAME,
    DLQ_EXCHANGE_NAME,
    DLQ_ROUTING_KEY,
} from "../../config/rabbitmq.js";

const MAX_RETRIES = 3;

function getRetryCount(
    message: ConsumeMessage,
): number {
    const deaths =
        message.properties.headers?.["x-death"];

    if (!Array.isArray(deaths)) {
        return 0;
    }

    const retryDeath = deaths.find(
        (death) =>
            death &&
            typeof death === "object" &&
            "queue" in death &&
            death.queue === QUEUE_NAME,
    );

    if(!retryDeath || typeof retryDeath !== "object") {
        return 0;
    }

    const count =
        "count" in retryDeath
            ? retryDeath.count
            : 0;

    return typeof count === "number"
        ? count
        : 0;
}

export async function startAnalyticsWorker() {
    const channel = await connectRabbitMQ();

    await channel.consume(QUEUE_NAME, (message) => {
        if (!message) {
            return;
        }

        try {
            const event = JSON.parse(
                message.content.toString(),
            );

            const retryCount = getRetryCount(message);

            console.log(
                "Analytics event received:",
                event,
            );

            console.log(
                `Processing analytics event. Retry count: ${retryCount}`,
            );

            channel.ack(message);

        } catch (error) {

            const retryCount = getRetryCount(message);

            console.log(
                `Processing failed for message. Retry count: ${retryCount}`,
            );

            console.error(
                "Failed to process analytics event:",
                error,
            );

            if ( retryCount >= MAX_RETRIES) {
                console.error(
                    `Max retries reached for message. Sending to DLX: ${DLQ_EXCHANGE_NAME}`,
                );

                channel.publish(
                    DLQ_EXCHANGE_NAME,
                    DLQ_ROUTING_KEY,
                    message.content,
                    {
                        persistent: true,
                        contentType: message.properties.contentType,
                        headers: {
                            ...message.properties.headers,
                            "x-final-failure": true,
                        }
                    }
                );

                channel.ack(message);
                return;
            }


            channel.nack(message, false, false);
        }
    });

    console.log(
        `Analytics worker consuming from ${QUEUE_NAME}`,
    );
}