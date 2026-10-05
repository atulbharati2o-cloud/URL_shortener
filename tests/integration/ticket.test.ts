import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "../../src/db/prisma.js";
import { allocateTicket } from "../../src/modules/ticket/ticket.service.js";

describe("Ticket allocation", () => {
    beforeEach(async () => {
        await prisma.ticketRange.deleteMany();
        await prisma.ticketServer.deleteMany();

        const server1 = await prisma.ticketServer.create({
            data: {
                name: "test-server-1",
                status: "ACTIVE",
            },
        });

        const server2 = await prisma.ticketServer.create({
            data: {
                name: "test-server-2",
                status: "ACTIVE",
            },
        });

        await prisma.ticketRange.createMany({
            data: [
                {
                    startValue: 0n,
                    endValue: 9n,
                    currentValue: 0n,
                    serverId: server1.id,
                },
                {
                    startValue: 1000n,
                    endValue: 1009n,
                    currentValue: 1010n,
                    serverId: server1.id,
                },
                {
                    startValue: 100n,
                    endValue: 109n,
                    currentValue: 100n,
                    serverId: server2.id,
                },
                {
                    startValue: 2000n,
                    endValue: 2009n,
                    currentValue: 2010n,
                    serverId: server2.id,
                },
            ],
        });
    });

    it("throws when no active ticket server has an available range", async () => {
        // Deactivate server 2.
        await prisma.ticketServer.updateMany({
            where: {
                name: "test-server-2",
            },
            data: {
                status: "INACTIVE",
            },
        });

        const allocatedTickets: bigint[] = [];

        for (let i = 0; i < 10; i++) {
            const ticket = await allocateTicket();
            allocatedTickets.push(ticket);
        }

        expect(allocatedTickets).toEqual([
            0n,
            1n,
            2n,
            3n,
            4n,
            5n,
            6n,
            7n,
            8n,
            9n,
        ]);

        await expect(allocateTicket()).rejects.toThrow(
            "No active ticket server available",
        );
    });

    it("allocates unique tickets across multiple ticket servers", async () => {
        const allocatedTickets: bigint[] = [];

        for (let i = 0; i < 20; i++) {
            const ticket = await allocateTicket();
            allocatedTickets.push(ticket);
        }

        const uniqueTickets = new Set(allocatedTickets);

        expect(uniqueTickets.size).toBe(20);

        const server1Tickets = allocatedTickets.filter(
            (ticket) => ticket >= 0n && ticket <= 9n,
        );

        const server2Tickets = allocatedTickets.filter(
            (ticket) => ticket >= 100n && ticket <= 109n,
        );

        expect(server1Tickets.length).toBe(10);
        expect(server2Tickets.length).toBe(10);
    });

    it("allocates unique tickets under concurrent requests", async () => {
        // Make both servers inactive first.
        await prisma.ticketServer.updateMany({
            data: {
                status: "INACTIVE",
            },
        });

        // Create one dedicated server for this test.
        const server = await prisma.ticketServer.create({
            data: {
                name: "concurrency-test-server",
                status: "ACTIVE",
            },
        });

        // Give it exactly 100 available tickets.
        await prisma.ticketRange.create({
            data: {
                startValue: 0n,
                endValue: 99n,
                currentValue: 0n,
                serverId: server.id,
            },
        });

        // Launch 100 allocations at the same time.
        const allocatedTickets = await Promise.all(
            Array.from({ length: 100 }, () => allocateTicket()),
        );

        // We should have received exactly 100 tickets.
        expect(allocatedTickets).toHaveLength(100);

        // Every ticket must be unique.
        const uniqueTickets = new Set(allocatedTickets);

        expect(uniqueTickets.size).toBe(100);

        // Sort because concurrent execution does not guarantee order.
        const sortedTickets = [...allocatedTickets].sort(
            (a, b) => (a < b ? -1 : a > b ? 1 : 0),
        );

        // We should have received every ticket from 0 to 99.
        expect(sortedTickets).toEqual(
            Array.from({ length: 100 }, (_, index) => BigInt(index)),
        );

        // The range should now be completely consumed.
        const range = await prisma.ticketRange.findFirst({
            where: {
                serverId: server.id,
            },
        });

        expect(range?.currentValue).toBe(100n);
    });
});