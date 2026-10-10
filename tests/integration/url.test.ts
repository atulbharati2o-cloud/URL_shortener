
import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "../../src/db/prisma.js";
import { shard0 } from "../../src/db/shard0.js";
import { shard1 } from "../../src/db/shard1.js";
import { createShortUrl } from "../../src/modules/url/url.service.js";

describe("URL creation", () => {
    let testUserId: bigint;

    beforeEach(async () => {
        await Promise.all([
            shard0.url.deleteMany(),
            shard1.url.deleteMany(),
        ]);

        await prisma.idempotencyKey.deleteMany();
        await prisma.ticketRange.deleteMany();
        await prisma.ticketServer.deleteMany();
        await prisma.user.deleteMany();

        const user = await prisma.user.create({
            data: {
                email: "url-test@example.com",
                passwordHash: "test-password-hash",
            },
        });

        testUserId = user.id;

        const server = await prisma.ticketServer.create({
            data: {
                name: "url-test-server",
                status: "ACTIVE",
            },
        });

        await prisma.ticketRange.create({
            data: {
                startValue: 0n,
                endValue: 99n,
                currentValue: 0n,
                serverId: server.id,
            },
        });
    });

    it(
        "creates unique short URLs under concurrent requests",
        async () => {
            const results = await Promise.allSettled(
                Array.from({ length: 100 }, (_, index) =>
                    createShortUrl(testUserId, {
                        originalUrl: `https://example.com/page/${index}`,
                    }),
                ),
            );

            const fulfilled = results
                .filter(
                    (
                        result,
                    ): result is PromiseFulfilledResult<
                        Awaited<ReturnType<typeof createShortUrl>>
                    > => result.status === "fulfilled",
                )
                .map((result) => result.value);

            const rejected = results.filter(
                (result) => result.status === "rejected",
            );

            if (rejected.length > 0) {
                console.error(
                    "URL creation failures:",
                    rejected.map((result) => result.reason),
                );
            }

            expect(fulfilled).toHaveLength(100);

            const ids = new Set(fulfilled.map((url) => url.id));
            expect(ids.size).toBe(100);

            const shortCodes = new Set(
                fulfilled.map((url) => url.shortCode),
            );
            expect(shortCodes.size).toBe(100);

            const [shard0Count, shard1Count] = await Promise.all([
                shard0.url.count(),
                shard1.url.count(),
            ]);

            expect(shard0Count + shard1Count).toBe(100);

            // Verify deterministic routing: even IDs go to shard 0,
            // odd IDs go to shard 1.
            const shard0Urls = await shard0.url.findMany({
                select: { id: true },
            });

            const shard1Urls = await shard1.url.findMany({
                select: { id: true },
            });

            expect(
                shard0Urls.every((url) => url.id % 2n === 0n),
            ).toBe(true);

            expect(
                shard1Urls.every((url) => url.id % 2n === 1n),
            ).toBe(true);

            const range = await prisma.ticketRange.findFirst();

            expect(range?.currentValue).toBe(100n);
        },
        15_000,
    );
});
