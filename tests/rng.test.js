import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createRng, pickRandomIndex } from "../src/rng.js";

describe("createRng", () => {
    it("produces deterministic sequences for the same string seed", () => {
        const rngA = createRng("dewdney-1984");
        const rngB = createRng("dewdney-1984");

        const seqA = Array.from({ length: 20 }, () => rngA());
        const seqB = Array.from({ length: 20 }, () => rngB());

        assert.deepEqual(seqA, seqB);
    });

    it("produces deterministic sequences for the same numeric seed", () => {
        const rngA = createRng(42);
        const rngB = createRng(42);

        const seqA = Array.from({ length: 15 }, () => rngA());
        const seqB = Array.from({ length: 15 }, () => rngB());

        assert.deepEqual(seqA, seqB);
    });

    it("produces different sequences for different seeds", () => {
        const rngA = createRng("seed-alpha");
        const rngB = createRng("seed-beta");

        const seqA = Array.from({ length: 10 }, () => rngA());
        const seqB = Array.from({ length: 10 }, () => rngB());

        assert.notDeepEqual(seqA, seqB);
    });

    it("generates values in [0, 1)", () => {
        const rng = createRng("bounds-test");
        for (let i = 0; i < 1000; i += 1) {
            const value = rng();
            assert.ok(value >= 0 && value < 1, `Expected [0, 1), got ${value}`);
        }
    });

    it("returns a working RNG when seed is omitted or empty", () => {
        const rng = createRng("");
        const value = rng();
        assert.ok(typeof value === "number" && value >= 0 && value < 1);
    });
});

describe("pickRandomIndex", () => {
    it("returns an integer index within [0, length)", () => {
        const rng = createRng("pick-test");
        for (let i = 0; i < 200; i += 1) {
            const index = pickRandomIndex(4, rng);
            assert.ok(Number.isInteger(index) && index >= 0 && index < 4);
        }
    });
});
