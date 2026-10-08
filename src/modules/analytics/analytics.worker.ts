import {
    connectRabbitMQ,
    QUEUE_NAME,
} from "../../config/rabbitmq.js";

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

            console.log(
                "Analytics event received:",
                event,
            );

            channel.ack(message);
        } catch (error) {
            console.error(
                "Failed to process analytics event:",
                error,
            );

            channel.nack(message, false, false);
        }
    });

    console.log(
        `Analytics worker consuming from ${QUEUE_NAME}`,
    );
}