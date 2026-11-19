import { createRng, pickRandomIndex } from "./rng.js";

const EMPTY = -1;
const MAX_HISTORY_LENGTH = 5000;

/**
 * Validates and normalizes simulation parameters.
 * @param {object} config
 * @returns {object}
 */
function validateConfig(config) {
    const width = Math.floor(Number(config.width));
    const height = Math.floor(Number(config.height));
    const nfish = Math.floor(Number(config.nfish));
    const nsharks = Math.floor(Number(config.nsharks));
    const fbreed = Math.floor(Number(config.fbreed));
    const sbreed = Math.floor(Number(config.sbreed));
    const starve = Math.floor(Number(config.starve));
    const seed = config.seed ?? "";

    if (!Number.isFinite(width) || width < 1 || !Number.isFinite(height) || height < 1) {
        throw new Error("Ocean width and height must be positive integers.");
    }
    if (!Number.isFinite(nfish) || nfish < 0 || !Number.isFinite(nsharks) || nsharks < 0) {
        throw new Error("Initial fish and shark counts must be non-negative integers.");
    }
    if (nfish + nsharks > width * height) {
        throw new Error("Initial fish + sharks exceeds grid capacity.");
    }
    if (!Number.isFinite(fbreed) || fbreed < 1 || !Number.isFinite(sbreed) || sbreed < 1) {
        throw new Error("Breeding times (fbreed, sbreed) must be at least 1 chronon.");
    }
    if (!Number.isFinite(starve) || starve < 1) {
        throw new Error("Starvation time (starve) must be at least 1 chronon.");
    }

    return { width, height, nfish, nsharks, fbreed, sbreed, starve, seed };
}

/**
 * Core Wa-Tor toroidal ecosystem simulation faithful to A. K. Dewdney (1984).
 */
export class WaTorSimulation {
    /**
     * @param {object} config
     * @param {number} config.width
     * @param {number} config.height
     * @param {number} config.nfish
     * @param {number} config.nsharks
     * @param {number} config.fbreed
     * @param {number} config.sbreed
     * @param {number} config.starve
     * @param {string | number} [config.seed]
     */
    constructor(config) {
        const params = validateConfig(config);
        this.width = params.width;
        this.height = params.height;
        this.nfish = params.nfish;
        this.nsharks = params.nsharks;
        this.fbreed = params.fbreed;
        this.sbreed = params.sbreed;
        this.starve = params.starve;
        this.seed = params.seed;

        this.rng = createRng(this.seed);

        const size = this.width * this.height;
        this.fish = new Int32Array(size).fill(EMPTY);
        this.sharks = new Int32Array(size).fill(EMPTY);
        this.starveTime = new Int32Array(size).fill(EMPTY);
        this.fishMoved = new Uint8Array(size);
        this.sharkMoved = new Uint8Array(size);

        this.chronon = 0;
        this.fishCount = 0;
        this.sharkCount = 0;
        this.history = [];

        this.neighborScratch = new Int32Array(4);

        this.populateOcean();
        this.recordHistory();
    }

    /**
     * Converts (x, y) coordinates into a flat toroidal grid index.
     * @param {number} x
     * @param {number} y
     * @returns {number}
     */
    getIndex(x, y) {
        const wx = ((x % this.width) + this.width) % this.width;
        const wy = ((y % this.height) + this.height) % this.height;
        return wy * this.width + wx;
    }

    /**
     * Places a fish at (x, y), clearing any existing occupant at that cell.
     * @param {number} x
     * @param {number} y
     * @param {number} [age=0]
     */
    placeFish(x, y, age = 0) {
        const idx = this.getIndex(x, y);
        if (this.sharks[idx] !== EMPTY) {
            this.sharks[idx] = EMPTY;
            this.starveTime[idx] = EMPTY;
            this.sharkCount -= 1;
        }
        if (this.fish[idx] === EMPTY) {
            this.fishCount += 1;
        }
        this.fish[idx] = age;
    }

    /**
     * Places a shark at (x, y), clearing any existing occupant at that cell.
     * @param {number} x
     * @param {number} y
     * @param {number} [age=0]
     * @param {number} [starve=0]
     */
    placeShark(x, y, age = 0, starve = 0) {
        const idx = this.getIndex(x, y);
        if (this.fish[idx] !== EMPTY) {
            this.fish[idx] = EMPTY;
            this.fishCount -= 1;
        }
        if (this.sharks[idx] === EMPTY) {
            this.sharkCount += 1;
        }
        this.sharks[idx] = age;
        this.starveTime[idx] = starve;
    }

    /**
     * Returns the fish age at (x, y), or -1 if no fish is present.
     * @param {number} x
     * @param {number} y
     * @returns {number}
     */
    getFishAge(x, y) {
        return this.fish[this.getIndex(x, y)];
    }

    /**
     * Returns the shark age at (x, y), or -1 if no shark is present.
     * @param {number} x
     * @param {number} y
     * @returns {number}
     */
    getSharkAge(x, y) {
        return this.sharks[this.getIndex(x, y)];
    }

    /**
     * Returns the shark starvation counter at (x, y), or -1 if no shark is present.
     * @param {number} x
     * @param {number} y
     * @returns {number}
     */
    getSharkStarve(x, y) {
        return this.starveTime[this.getIndex(x, y)];
    }

    /**
     * Populates the ocean with uniformly distributed fish and sharks using a partial shuffle.
     */
    populateOcean() {
        const totalCells = this.width * this.height;
        const totalCreatures = this.nfish + this.nsharks;
        if (totalCreatures === 0) {
            return;
        }

        const indices = new Int32Array(totalCells);
        for (let i = 0; i < totalCells; i += 1) {
            indices[i] = i;
        }

        for (let i = 0; i < totalCreatures; i += 1) {
            const swapOffset = pickRandomIndex(totalCells - i, this.rng);
            const swapIdx = i + swapOffset;
            const temp = indices[i];
            indices[i] = indices[swapIdx];
            indices[swapIdx] = temp;
        }

        for (let i = 0; i < this.nfish; i += 1) {
            const cellIdx = indices[i];
            this.fish[cellIdx] = pickRandomIndex(this.fbreed + 1, this.rng);
            this.fishCount += 1;
        }

        for (let i = 0; i < this.nsharks; i += 1) {
            const cellIdx = indices[this.nfish + i];
            this.sharks[cellIdx] = pickRandomIndex(this.sbreed + 1, this.rng);
            this.starveTime[cellIdx] = 0;
            this.sharkCount += 1;
        }
    }

    /**
     * Advances the simulation by one chronon: fish swim/breed, then sharks hunt/breed/starve.
     */
    step() {
        this.fishMoved.fill(0);
        this.sharkMoved.fill(0);

        this.stepFish();
        this.stepSharks();

        this.chronon += 1;
        this.recordHistory();
    }

    stepFish() {
        const w = this.width;
        const h = this.height;

        for (let y = 0; y < h; y += 1) {
            const rowOffset = y * w;
            const northRow = ((y - 1 + h) % h) * w;
            const southRow = ((y + 1) % h) * w;

            for (let x = 0; x < w; x += 1) {
                const idx = rowOffset + x;
                if (this.fish[idx] === EMPTY || this.fishMoved[idx] === 1) {
                    continue;
                }

                const eastX = (x + 1) % w;
                const westX = (x - 1 + w) % w;

                const count = this.collectEmptyNeighbors(
                    idx,
                    northRow + x,
                    rowOffset + eastX,
                    southRow + x,
                    rowOffset + westX
                );

                const nextAge = this.fish[idx] + 1;

                if (count > 0) {
                    const targetIdx = this.neighborScratch[pickRandomIndex(count, this.rng)];
                    if (nextAge >= this.fbreed) {
                        this.fish[targetIdx] = 0;
                        this.fishMoved[targetIdx] = 1;
                        this.fish[idx] = 0;
                        this.fishMoved[idx] = 1;
                        this.fishCount += 1;
                    } else {
                        this.fish[targetIdx] = nextAge;
                        this.fishMoved[targetIdx] = 1;
                        this.fish[idx] = EMPTY;
                    }
                } else {
                    this.fish[idx] = nextAge;
                    this.fishMoved[idx] = 1;
                }
            }
        }
    }

    stepSharks() {
        const w = this.width;
        const h = this.height;

        for (let y = 0; y < h; y += 1) {
            const rowOffset = y * w;
            const northRow = ((y - 1 + h) % h) * w;
            const southRow = ((y + 1) % h) * w;

            for (let x = 0; x < w; x += 1) {
                const idx = rowOffset + x;
                if (this.sharks[idx] === EMPTY || this.sharkMoved[idx] === 1) {
                    continue;
                }

                const eastX = (x + 1) % w;
                const westX = (x - 1 + w) % w;

                const nIdx = northRow + x;
                const eIdx = rowOffset + eastX;
                const sIdx = southRow + x;
                const wIdx = rowOffset + westX;

                const nextAge = this.sharks[idx] + 1;
                const nextStarve = this.starveTime[idx] + 1;

                // Hunting fish takes priority over moving into empty water.
                const fishNeighbors = this.collectFishNeighbors(idx, nIdx, eIdx, sIdx, wIdx);
                if (fishNeighbors > 0) {
                    const targetIdx = this.neighborScratch[pickRandomIndex(fishNeighbors, this.rng)];
                    this.fish[targetIdx] = EMPTY;
                    this.fishCount -= 1;

                    this.starveTime[targetIdx] = 0;
                    this.sharkMoved[targetIdx] = 1;

                    if (nextAge >= this.sbreed) {
                        this.sharks[targetIdx] = 0;
                        this.sharks[idx] = 0;
                        this.starveTime[idx] = 0;
                        this.sharkMoved[idx] = 1;
                        this.sharkCount += 1;
                    } else {
                        this.sharks[targetIdx] = nextAge;
                        this.sharks[idx] = EMPTY;
                        this.starveTime[idx] = EMPTY;
                    }
                    continue;
                }

                if (nextStarve >= this.starve) {
                    this.sharks[idx] = EMPTY;
                    this.starveTime[idx] = EMPTY;
                    this.sharkCount -= 1;
                    continue;
                }

                const emptyNeighbors = this.collectEmptyNeighbors(idx, nIdx, eIdx, sIdx, wIdx);
                if (emptyNeighbors > 0) {
                    const targetIdx = this.neighborScratch[pickRandomIndex(emptyNeighbors, this.rng)];
                    this.starveTime[targetIdx] = nextStarve;
                    this.sharkMoved[targetIdx] = 1;

                    if (nextAge >= this.sbreed) {
                        this.sharks[targetIdx] = 0;
                        this.sharks[idx] = 0;
                        this.starveTime[idx] = 0;
                        this.sharkMoved[idx] = 1;
                        this.sharkCount += 1;
                    } else {
                        this.sharks[targetIdx] = nextAge;
                        this.sharks[idx] = EMPTY;
                        this.starveTime[idx] = EMPTY;
                    }
                } else {
                    this.sharks[idx] = nextAge;
                    this.starveTime[idx] = nextStarve;
                    this.sharkMoved[idx] = 1;
                }
            }
        }
    }

    collectEmptyNeighbors(selfIdx, nIdx, eIdx, sIdx, wIdx) {
        let count = 0;
        const candidates = [nIdx, eIdx, sIdx, wIdx];
        for (let i = 0; i < 4; i += 1) {
            const c = candidates[i];
            if (c !== selfIdx && this.fish[c] === EMPTY && this.sharks[c] === EMPTY) {
                this.neighborScratch[count] = c;
                count += 1;
            }
        }
        return count;
    }

    collectFishNeighbors(selfIdx, nIdx, eIdx, sIdx, wIdx) {
        let count = 0;
        const candidates = [nIdx, eIdx, sIdx, wIdx];
        for (let i = 0; i < 4; i += 1) {
            const c = candidates[i];
            if (c !== selfIdx && this.fish[c] !== EMPTY) {
                this.neighborScratch[count] = c;
                count += 1;
            }
        }
        return count;
    }

    recordHistory() {
        this.history.push({
            chronon: this.chronon,
            fish: this.fishCount,
            sharks: this.sharkCount
        });
        if (this.history.length > MAX_HISTORY_LENGTH) {
            this.history.shift();
        }
    }
}
