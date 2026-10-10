import { prisma } from "../../db/prisma.js";

type TicketRangeRow = {
  id: bigint;
  startValue: bigint;
  endValue: bigint;
  currentValue: bigint;
};

type TicketServerRow = {
  id: bigint;
};

export async function allocateTicket(): Promise<bigint> {
  return prisma.$transaction(async (tx) => {
    while (true) {
      const servers = await tx.$queryRaw<TicketServerRow[]>`
        SELECT DISTINCT ts.id
        FROM TicketServer ts
        INNER JOIN TicketRange tr
          ON tr.serverId = ts.id
        WHERE ts.status = 'ACTIVE'
          AND tr.currentValue <= tr.endValue
      `;

      if (servers.length === 0) {
        throw new Error("No active ticket server available");
      }

      const server = servers[
        Math.floor(Math.random() * servers.length)
      ];

      if (!server) {
        throw new Error("No active ticket server available");
      }

      const ranges = await tx.$queryRaw<TicketRangeRow[]>`
        SELECT
          tr.id,
          tr.startValue,
          tr.endValue,
          tr.currentValue
        FROM TicketRange tr
        WHERE tr.serverId = ${server.id}
          AND tr.currentValue <= tr.endValue
        ORDER BY RAND()
        LIMIT 1
        FOR UPDATE
      `;

      if (ranges.length === 0) {
        continue;
      }

      const range = ranges[0];

      if (!range) {
        continue;
      }

      await tx.ticketRange.update({
        where: {
          id: range.id,
        },
        data: {
          currentValue: {
            increment: 1,
          },
        },
      });

      return range.currentValue;
    }
  }, {
    maxWait: 10_000,
    timeout: 10_000,
  });
}
