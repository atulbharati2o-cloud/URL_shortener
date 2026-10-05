import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "../../src/db/prisma.js";
import { createShortUrl } from "../../src/modules/url/url.service.js";

describe("URL creation", () => {
    let testUserId: bigint;

    beforeEach(async () => {
        await prisma.url.deleteMany();
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


    it("creates unique short URLs under concurrent requests", async () => {
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

        console.log("fulfilled:", fulfilled.length);
        console.log("rejected:", rejected.length);

        if (rejected.length > 0) {
            console.log(
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

        const urlCount = await prisma.url.count();
        expect(urlCount).toBe(100);

        const range = await prisma.ticketRange.findFirst();

        expect(range?.currentValue).toBe(100n);
    });
});