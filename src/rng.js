/**
 * Hashes a string or number seed into an unsigned 32-bit integer using FNV-1a.
 * @param {string | number} seed
 * @returns {number}
 */
function hashSeed(seed) {
    const text = String(seed);
    let hash = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

/**
 * Creates a deterministic Mulberry32 PRNG when a non-empty seed is given,
 * or falls back to Math.random when seed is empty/omitted.
 * @param {string | number | null | undefined} seed
 * @returns {() => number}
 */
export function createRng(seed) {
    if (seed === undefined || seed === null || String(seed).trim() === "") {
        return Math.random;
    }

    let state = hashSeed(seed) || 1;
    return function nextRandom() {
        state = (state + 0x6d2b79f5) | 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * Picks a uniform random integer index in [0, length).
 * @param {number} length
 * @param {() => number} rng
 * @returns {number}
 */
export function pickRandomIndex(length, rng) {
    return Math.floor(rng() * length);
}
