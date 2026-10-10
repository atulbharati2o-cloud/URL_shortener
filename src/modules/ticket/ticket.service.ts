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
  return prisma.$transaction(
    async (tx) => {
      while (true) {
        // Randomly select from servers that currently have
        // at least one available ticket range.
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

        const server =
          servers[Math.floor(Math.random() * servers.length)];

        if (!server) {
          throw new Error("No active ticket server available");
        }

        // Randomly select and lock an available range
        // belonging to the chosen server.
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

        // Another transaction may have consumed the last
        // ticket in this server's available range.
        // Refresh server eligibility and try again.
        const range = ranges[0];

        if (!range) {
          continue;
        }

        // FOR UPDATE protects the selected range until
        // this transaction commits or rolls back.
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

        // Return the ticket allocated before incrementing.
        return range.currentValue;
      }
    },
    {
      maxWait: 10_000,
      timeout: 20_000,
      isolationLevel: "ReadCommitted",
    },
  );
}