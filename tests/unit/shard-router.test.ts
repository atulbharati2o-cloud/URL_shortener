import { describe, expect, it } from "vitest";
import { getShardById, getShardByShortCode } from "../../src/db/shard-router.js";
import { shard0 } from "../../src/db/shard0.js";
import { shard1 } from "../../src/db/shard1.js";
import { encode } from "../../src/utils/encoder.js";

describe("Shard router", () => {
    it("routes even IDs to shard0 and odd IDs to shard1", () => {
        expect(getShardById(0n)).toBe(shard0);
        expect(getShardById(2n)).toBe(shard0);
        expect(getShardById(100n)).toBe(shard0);
        expect(getShardById(9999998n)).toBe(shard0);

        expect(getShardById(1n)).toBe(shard1);
        expect(getShardById(3n)).toBe(shard1);
        expect(getShardById(101n)).toBe(shard1);
        expect(getShardById(9999999n)).toBe(shard1);
    });

    it("routes short codes to the corresponding shard based on decoded ID", () => {
        const evenCode = encode(42n);
        const oddCode = encode(43n);

        expect(getShardByShortCode(evenCode)).toBe(shard0);
        expect(getShardByShortCode(oddCode)).toBe(shard1);
    });
});
