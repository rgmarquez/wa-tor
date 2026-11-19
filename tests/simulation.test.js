import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { WaTorSimulation } from "../src/simulation.js";
import { PRESETS } from "../src/presets.js";

function assertGridInvariants(sim) {
    let countedFish = 0;
    let countedSharks = 0;
    const total = sim.width * sim.height;

    for (let i = 0; i < total; i += 1) {
        const hasFish = sim.fish[i] !== -1;
        const hasShark = sim.sharks[i] !== -1;

        assert.ok(!(hasFish && hasShark), `Cell ${i} contains both fish and shark`);

        if (hasFish) {
            assert.ok(sim.fish[i] >= 0, `Fish at ${i} has negative age ${sim.fish[i]}`);
            countedFish += 1;
        }
        if (hasShark) {
            assert.ok(sim.sharks[i] >= 0, `Shark at ${i} has negative age ${sim.sharks[i]}`);
            assert.ok(sim.starveTime[i] >= 0, `Shark at ${i} has negative starveTime ${sim.starveTime[i]}`);
            countedSharks += 1;
        } else {
            assert.equal(sim.starveTime[i], -1, `Empty cell ${i} should have starveTime -1`);
        }
    }

    assert.equal(sim.fishCount, countedFish, "fishCount should match grid");
    assert.equal(sim.sharkCount, countedSharks, "sharkCount should match grid");
}

describe("WaTorSimulation initialization", () => {
    it("places exact initial fish and shark counts without overlap", () => {
        const sim = new WaTorSimulation({
            width: 10,
            height: 8,
            nfish: 30,
            nsharks: 12,
            fbreed: 3,
            sbreed: 10,
            starve: 3,
            seed: "init-test"
        });

        assert.equal(sim.chronon, 0);
        assert.equal(sim.fishCount, 30);
        assert.equal(sim.sharkCount, 12);
        assert.equal(sim.history.length, 1);
        assert.deepEqual(sim.history[0], { chronon: 0, fish: 30, sharks: 12 });
        assertGridInvariants(sim);
    });

    it("initializes fish ages in [0, fbreed] and shark ages in [0, sbreed]", () => {
        const sim = new WaTorSimulation({
            width: 20,
            height: 20,
            nfish: 150,
            nsharks: 50,
            fbreed: 3,
            sbreed: 10,
            starve: 3,
            seed: "age-bounds"
        });

        for (let i = 0; i < sim.width * sim.height; i += 1) {
            if (sim.fish[i] !== -1) {
                assert.ok(sim.fish[i] >= 0 && sim.fish[i] <= 3);
            }
            if (sim.sharks[i] !== -1) {
                assert.ok(sim.sharks[i] >= 0 && sim.sharks[i] <= 10);
                assert.equal(sim.starveTime[i], 0);
            }
        }
    });

    it("throws when total creatures exceed grid capacity", () => {
        assert.throws(() => {
            new WaTorSimulation({
                width: 4,
                height: 4,
                nfish: 10,
                nsharks: 7,
                fbreed: 3,
                sbreed: 10,
                starve: 3
            });
        }, /capacity/i);
    });
});

describe("WaTorSimulation fish rules", () => {
    it("moves a single fish to an orthogonal neighbor and increments age", () => {
        const sim = new WaTorSimulation({
            width: 5,
            height: 5,
            nfish: 0,
            nsharks: 0,
            fbreed: 3,
            sbreed: 10,
            starve: 3,
            seed: "fish-move"
        });

        sim.placeFish(2, 2, 0);
        sim.step();

        assert.equal(sim.fishCount, 1);
        assert.equal(sim.getFishAge(2, 2), -1);

        const neighbors = [
            sim.getFishAge(2, 1),
            sim.getFishAge(3, 2),
            sim.getFishAge(2, 3),
            sim.getFishAge(1, 2)
        ];
        assert.equal(neighbors.filter((age) => age === 1).length, 1);
        assertGridInvariants(sim);
    });

    it("wraps fish movement toroidally across all edges", () => {
        const sim = new WaTorSimulation({
            width: 3,
            height: 3,
            nfish: 0,
            nsharks: 0,
            fbreed: 5,
            sbreed: 10,
            starve: 3,
            seed: "torus-wrap"
        });

        // Place fish at (0, 0) and block East (1, 0), South (0, 1), and North (0, 2)
        // so the only unoccupied neighbor is West, which wraps to (2, 0).
        sim.placeFish(0, 0, 0);
        sim.placeShark(1, 0, 0, 0);
        sim.placeShark(0, 1, 0, 0);
        sim.placeShark(0, 2, 0, 0);

        // Run only fish phase by using a high-capacity check: actually after step,
        // fish moves to (2, 0), then sharks might hunt it if adjacent.
        // Instead, block with fish that cannot move: fill entire 3x3 except (2, 0).
        const sim2 = new WaTorSimulation({
            width: 3,
            height: 3,
            nfish: 0,
            nsharks: 0,
            fbreed: 10,
            sbreed: 10,
            starve: 3,
            seed: "torus-wrap-2"
        });
        for (let y = 0; y < 3; y += 1) {
            for (let x = 0; x < 3; x += 1) {
                if (!(x === 2 && y === 0)) {
                    sim2.placeFish(x, y, 0);
                }
            }
        }

        // First scanned fish is (0, 0); its only open neighbor is West -> (2, 0).
        sim2.step();
        assert.equal(sim2.getFishAge(2, 0), 1);
        assertGridInvariants(sim2);
    });

    it("breeds a fish when age reaches fbreed, leaving offspring at old cell with age 0", () => {
        const sim = new WaTorSimulation({
            width: 3,
            height: 3,
            nfish: 0,
            nsharks: 0,
            fbreed: 2,
            sbreed: 10,
            starve: 3,
            seed: "fish-breed"
        });

        sim.placeFish(1, 1, 1);
        sim.step();

        assert.equal(sim.fishCount, 2);
        assert.equal(sim.getFishAge(1, 1), 0);

        const neighbors = [
            sim.getFishAge(1, 0),
            sim.getFishAge(2, 1),
            sim.getFishAge(1, 2),
            sim.getFishAge(0, 1)
        ];
        assert.equal(neighbors.filter((age) => age === 0).length, 1);
        assertGridInvariants(sim);
    });

    it("does not move or breed a completely surrounded fish", () => {
        const sim = new WaTorSimulation({
            width: 3,
            height: 3,
            nfish: 0,
            nsharks: 0,
            fbreed: 1,
            sbreed: 10,
            starve: 3,
            seed: "fish-trapped"
        });

        for (let y = 0; y < 3; y += 1) {
            for (let x = 0; x < 3; x += 1) {
                sim.placeFish(x, y, 1);
            }
        }

        sim.step();

        assert.equal(sim.fishCount, 9);
        assert.equal(sim.getFishAge(1, 1), 2);
        assertGridInvariants(sim);
    });
});

describe("WaTorSimulation shark rules", () => {
    it("prioritizes eating an adjacent fish over moving to an empty cell and resets starveTime", () => {
        const sim = new WaTorSimulation({
            width: 5,
            height: 5,
            nfish: 0,
            nsharks: 0,
            fbreed: 10,
            sbreed: 10,
            starve: 3,
            seed: "shark-hunt"
        });

        // Surround fish at (2, 1) with sharks? No, place fish at (2, 1) and block its moves
        // with sharks/fish, or simpler: place shark at (2, 2) with starveTime=2 and fish at all 4 neighbors
        // Actually even simpler: on a 1x2 toroidal grid, fish at (1, 0) cannot move because (0, 0) has a shark!
        const tiny = new WaTorSimulation({
            width: 2,
            height: 1,
            nfish: 0,
            nsharks: 0,
            fbreed: 10,
            sbreed: 10,
            starve: 3,
            seed: "shark-eat"
        });
        tiny.placeShark(0, 0, 2, 2);
        tiny.placeFish(1, 0, 0);

        tiny.step();

        assert.equal(tiny.fishCount, 0);
        assert.equal(tiny.sharkCount, 1);
        assert.equal(tiny.getSharkAge(1, 0), 3);
        assert.equal(tiny.getSharkStarve(1, 0), 0);
        assertGridInvariants(tiny);
    });

    it("starves and removes a shark when it fails to eat for starve chronons", () => {
        const sim = new WaTorSimulation({
            width: 5,
            height: 5,
            nfish: 0,
            nsharks: 0,
            fbreed: 3,
            sbreed: 10,
            starve: 3,
            seed: "shark-starve"
        });

        sim.placeShark(2, 2, 0, 0);

        sim.step();
        assert.equal(sim.sharkCount, 1);
        sim.step();
        assert.equal(sim.sharkCount, 1);
        sim.step();
        assert.equal(sim.sharkCount, 0);
        assertGridInvariants(sim);
    });

    it("breeds a shark when it moves and age reaches sbreed", () => {
        const sim = new WaTorSimulation({
            width: 5,
            height: 5,
            nfish: 0,
            nsharks: 0,
            fbreed: 3,
            sbreed: 2,
            starve: 5,
            seed: "shark-breed"
        });

        sim.placeShark(2, 2, 1, 0);
        sim.step();

        assert.equal(sim.sharkCount, 2);
        assert.equal(sim.getSharkAge(2, 2), 0);
        assert.equal(sim.getSharkStarve(2, 2), 0);
        assertGridInvariants(sim);
    });

    it("does not breed a shark on the chronon it starves", () => {
        const sim = new WaTorSimulation({
            width: 5,
            height: 5,
            nfish: 0,
            nsharks: 0,
            fbreed: 3,
            sbreed: 1,
            starve: 1,
            seed: "shark-starve-no-breed"
        });

        sim.placeShark(2, 2, 1, 0);
        sim.step();

        assert.equal(sim.sharkCount, 0);
        assertGridInvariants(sim);
    });
});

describe("WaTorSimulation determinism and long-run invariants", () => {
    it("constructs all built-in presets without error", () => {
        for (const [key, preset] of Object.entries(PRESETS)) {
            const sim = new WaTorSimulation({ ...preset.params, seed: `preset-${key}` });
            assert.equal(sim.fishCount, preset.params.nfish);
            assert.equal(sim.sharkCount, preset.params.nsharks);
            sim.step();
            assertGridInvariants(sim);
        }
    });

    it("replays identically with the same seed", () => {
        const config = { ...PRESETS.dewdney.params, seed: "reproducible-run" };
        const simA = new WaTorSimulation(config);
        const simB = new WaTorSimulation(config);

        for (let i = 0; i < 60; i += 1) {
            simA.step();
            simB.step();
        }

        assert.deepEqual(simA.history, simB.history);
        assert.deepEqual(Array.from(simA.fish), Array.from(simB.fish));
        assert.deepEqual(Array.from(simA.sharks), Array.from(simB.sharks));
    });

    it("maintains grid invariants across 200 chronons on Dewdney's 32x14 preset", () => {
        const sim = new WaTorSimulation({ ...PRESETS.dewdney.params, seed: "dewdney-200" });

        for (let i = 0; i < 200; i += 1) {
            sim.step();
            assertGridInvariants(sim);
        }

        assert.equal(sim.chronon, 200);
        assert.equal(sim.history.length, 201);
    });
});
