export const PRESETS = {
    dewdney: {
        name: "Dewdney's IBM PC (32x14)",
        description: "A. K. Dewdney's stable cyclic ocean from the 1984 article.",
        params: {
            width: 32,
            height: 14,
            nfish: 200,
            nsharks: 20,
            fbreed: 3,
            sbreed: 10,
            starve: 3
        }
    },
    magi: {
        name: "Magi's VAX (80x23)",
        description: "David Wiseman's VAX terminal ocean dimensions.",
        params: {
            width: 80,
            height: 23,
            nfish: 500,
            nsharks: 50,
            fbreed: 3,
            sbreed: 10,
            starve: 3
        }
    },
    ocean: {
        name: "Large Ocean (100x60)",
        description: "Expansive torus showing schools, waves, and sustained cycles.",
        params: {
            width: 100,
            height: 60,
            nfish: 1500,
            nsharks: 150,
            fbreed: 3,
            sbreed: 10,
            starve: 3
        }
    },
    boomBust: {
        name: "Boom & Bust (60x40)",
        description: "Faster breeding rates producing sharper ecological oscillations.",
        params: {
            width: 60,
            height: 40,
            nfish: 400,
            nsharks: 40,
            fbreed: 2,
            sbreed: 5,
            starve: 4
        }
    }
};
