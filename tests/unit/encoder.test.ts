import { describe, expect, it } from "vitest";
import { decode, encode } from "../../src/utils/encoder.js";

describe("Encoder", () => {
    it("encodes zero", () => {
        expect(encode(0n)).toBe("a");
    });

    it("encodes a positive integer", () => {
        expect(encode(79n)).toBe("br");
    });

    it("decodes a short code", () => {
        expect(decode("br")).toBe(79n);
    });

    it("round trips correctly", () => {
        const values = [
            0n,
            1n,
            10n,
            61n,
            62n,
            79n,
            100n,
            1000n,
            999999n,
            123456789n,
        ];

        for (const value of values) {
            expect(decode(encode(value))).toBe(value);
        }
    });

    it("rejects negative values", () => {
        expect(() => encode(-1n)).toThrow();
    });

    it("rejects an empty string", () => {
        expect(() => decode("")).toThrow();
    });

    it("rejects invalid characters", () => {
        expect(() => decode("abc!")).toThrow();
    });
    
    it("round trips many consecutive values", () => {
        for (let value = 0n; value < 100000n; value++) {
            expect(decode(encode(value))).toBe(value);
        }
    });
});