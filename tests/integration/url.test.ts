
import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "../../src/db/prisma.js";
import { shard0 } from "../../src/db/shard0.js";
import { shard1 } from "../../src/db/shard1.js";
import {
    createShortUrl,
    getOriginalUrl,
    updateShortUrl,
    deleteShortUrl,
} from "../../src/modules/url/url.service.js";

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

    it("routes reads, updates, and deletes to the correct shard with strict data isolation", async () => {
        const url0 = await createShortUrl(testUserId, {
            originalUrl: "https://example.com/shard0-entry",
        });
        const url1 = await createShortUrl(testUserId, {
            originalUrl: "https://example.com/shard1-entry",
        });

        const id0 = BigInt(url0.id);
        const id1 = BigInt(url1.id);

        const [evenUrl, oddUrl] = id0 % 2n === 0n ? [url0, url1] : [url1, url0];
        const evenId = BigInt(evenUrl.id);
        const oddId = BigInt(oddUrl.id);

        // Verify data isolation: even ID only in shard0, odd ID only in shard1
        const shard0Even = await shard0.url.findUnique({ where: { id: evenId } });
        const shard1Even = await shard1.url.findUnique({ where: { id: evenId } });
        expect(shard0Even).not.toBeNull();
        expect(shard1Even).toBeNull();

        const shard0Odd = await shard0.url.findUnique({ where: { id: oddId } });
        const shard1Odd = await shard1.url.findUnique({ where: { id: oddId } });
        expect(shard0Odd).toBeNull();
        expect(shard1Odd).not.toBeNull();

        // Verify reading resolves the correct original URLs from respective shards
        const fetchedEven = await getOriginalUrl(evenUrl.shortCode);
        const fetchedOdd = await getOriginalUrl(oddUrl.shortCode);
        expect(fetchedEven).toBe(evenUrl.originalUrl);
        expect(fetchedOdd).toBe(oddUrl.originalUrl);

        // Verify updating even URL modifies only shard0
        const updatedEven = await updateShortUrl(testUserId, evenUrl.shortCode, {
            originalUrl: "https://example.com/shard0-updated",
        });
        expect(updatedEven.originalUrl).toBe("https://example.com/shard0-updated");
        const freshShard0Even = await shard0.url.findUnique({ where: { id: evenId } });
        expect(freshShard0Even?.originalUrl).toBe("https://example.com/shard0-updated");

        // Verify deleting odd URL marks deletedAt on shard1
        const deletedOdd = await deleteShortUrl(testUserId, oddUrl.shortCode);
        expect(deletedOdd.deletedAt).not.toBeNull();
        const freshShard1Odd = await shard1.url.findUnique({ where: { id: oddId } });
        expect(freshShard1Odd?.deletedAt).not.toBeNull();

        // Reading deleted URL throws "URL deleted"
        await expect(getOriginalUrl(oddUrl.shortCode)).rejects.toThrow("URL deleted");
    });

    it("supports idempotent URL creation across shards", async () => {
        const idempotencyKey = "test-idem-key-shard";

        const firstResult = await createShortUrl(
            testUserId,
            { originalUrl: "https://example.com/idempotent" },
            idempotencyKey,
        );

        // Second call with same idempotency key and body returns same URL
        const secondResult = await createShortUrl(
            testUserId,
            { originalUrl: "https://example.com/idempotent" },
            idempotencyKey,
        );

        expect(secondResult.id).toBe(firstResult.id);
        expect(secondResult.shortCode).toBe(firstResult.shortCode);

        // Different body with same idempotency key throws conflict
        await expect(
            createShortUrl(
                testUserId,
                { originalUrl: "https://example.com/different" },
                idempotencyKey,
            ),
        ).rejects.toThrow("IDEMPOTENCY_KEY_CONFLICT");
    });
});
