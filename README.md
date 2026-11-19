# Wa-Tor

A zero-build, browser-based implementation of the **Wa-Tor** predator-prey ecosystem simulation described by A. K. Dewdney in the December 1984 *Scientific American* "Computer Recreations" column (*"Sharks and fish wage an ecological war on the toroidal planet Wa-Tor"*, included in [specification/wator_dewdney.pdf](specification/wator_dewdney.pdf)).

---

## Project & Simulation Description

Wa-Tor models a discrete-time ecological simulation on a doughnut-shaped (**toroidal**) 2D ocean grid populated by two species: **fish** (prey) and **sharks** (predators). Because the surface wraps around both horizontally (east/west) and vertically (north/south), the ocean has no boundaries or corners.

### Simulation Rules

Time advances in discrete steps called **chronons**. At the start of a run, `nfish` fish and `nsharks` sharks are placed uniformly at random on unoccupied cells with random initial ages (`0..fbreed` for fish, `0..sbreed` for sharks) to stagger reproduction naturally.

During each chronon, every creature moves at most once in two sequential phases:

1. **Fish Swim and Breed**
   - Each fish inspects its 4 orthogonal neighbors (North, East, South, West, wrapping toroidally) for unoccupied cells.
   - If one or more empty neighbors exist, the fish moves to one chosen at random and ages by 1 chronon.
   - If its age reaches `fbreed`, it leaves a new fish (age `0`) in the cell it vacated and resets its own age to `0`.
   - If all 4 adjacent cells are occupied, the fish stays in place (aging by 1) and does not breed.

2. **Sharks Hunt, Starve, and Breed**
   - Hunting takes priority over swimming into empty water. Each shark inspects its 4 orthogonal neighbors for fish.
   - **If adjacent fish exist:** the shark moves onto a randomly chosen adjacent fish, eats it, and resets its starvation timer to `0`.
   - **If no adjacent fish exist:** the shark's starvation counter increments by 1. If it reaches `starve` chronons without eating, the shark dies and is removed from the ocean. Otherwise, it moves to a randomly chosen empty neighbor (or stays put if surrounded by other sharks).
   - **Breeding:** if a surviving shark moves and its age reaches `sbreed`, it leaves a new shark (age `0`, starvation `0`) in the cell it vacated and resets its own age to `0`.

### Core Parameters

| Parameter | Description |
| --- | --- |
| `width`, `height` | Dimensions of the toroidal ocean grid. |
| `nfish` | Initial number of fish placed at chronon `0`. |
| `nsharks` | Initial number of sharks placed at chronon `0`. |
| `fbreed` | Chronons a fish must exist before reproducing when it moves. |
| `sbreed` | Chronons a shark must exist before reproducing when it moves. |
| `starve` | Chronons a shark can go without eating before dying. |
| `seed` | Optional string/number seed for a deterministic Mulberry32 PRNG. |

### Architecture

The client runs entirely in the browser using native ES modules and HTML5 Canvas with zero build steps or third-party dependencies:

- `src/simulation.js` — Pure `WaTorSimulation` engine backed by typed arrays (`fish`, `sharks`, `starveTime`, `fishMoved`, `sharkMoved`).
- `src/rng.js` — Deterministic seedable PRNG (FNV-1a hash + Mulberry32) with `Math.random` fallback.
- `src/presets.js` — Built-in parameter presets from Dewdney's article and larger ocean configurations.
- `src/renderer.js` — HiDPI HTML5 Canvas ocean renderer with three view modes.
- `src/charts.js` — HiDPI HTML5 Canvas charts for population history and predator-prey phase space.
- `src/main.js`, `index.html`, `styles.css` — Interactive browser UI and animation loop.
- `tests/` — Automated unit and integration tests using Node's built-in test runner (`node --test`).

---

## Requirements

- **Web Browser:** Any modern browser with ES module and HTML5 Canvas support (Chrome, Safari, Firefox, Edge).
- **Local Static HTTP Server:** Required to serve ES modules (browsers block `<script type="module">` over `file://`). The default `npm start` script uses **Python 3** (`python3 -m http.server`), though any static file server works.
- **Node.js (v18+):** Required only for running the automated test suite (`npm test`) or invoking `npm` scripts.
- **No build tools or runtime packages** are required.

---

## Installing from a Fresh Clone

1. Clone the repository and enter the project directory:

   ```bash
   git clone <repository-url> wa-tor
   cd wa-tor
   ```

2. No `npm install` step is needed because the project has zero external dependencies.

3. (Optional) Verify the simulation engine with the test suite:

   ```bash
   npm test
   ```

---

## Running and Viewing the Project

Start a local static server from the repository root:

```bash
npm start
```

This runs `python3 -m http.server 8000`. You can also use any other static server (for example, `npx serve .` or `python3 -m http.server 3000`).

Open your browser to:

```text
http://localhost:8000
```

To run the automated tests at any time:

```bash
npm test
```

---

## Operating the UI

### Header & Live Status Bar
- **Chronon:** Total elapsed time steps since the last reset.
- **Fish / Sharks:** Live population counts updated on every step.
- **Status Badge:** Displays the current ecological state:
  - `Active` — Both species are present.
  - `Sharks Extinct` or `Fish Extinct` — One species has died out.
  - `Ocean Empty` — Both populations have reached zero.

### Transport & Speed Controls
- **Play / Pause:** Starts or pauses continuous simulation playback. You can also press **`Space`** anywhere outside a form input to toggle Play/Pause.
- **Step:** Pauses playback (if running) and advances the simulation by exactly 1 chronon.
- **Reset:** Rebuilds the ocean at chronon `0` using the current form parameters and seed.
- **Speed Slider (`1 / s` to `60 / s`):** Controls the target simulation rate in chronons per second.

### Ocean View Modes
Switch visualization styles at any time without interrupting the simulation:
- **Cells:** Dark ocean grid with cyan cells for fish and coral cells for sharks.
- **Dots & Circles:** High-contrast light grid faithful to Dewdney's diagram style (solid dots for fish, open circles for sharks).
- **ASCII:** Retro terminal display faithful to Dewdney's original text output (`.` for fish, `0` for sharks).

### Live Charts
- **Population vs. Chronons:** Dual-series line chart tracking fish (cyan) and shark (coral) counts over the recent history window, illustrating Lotka-Volterra-style predator-prey oscillations.
- **Phase Space (Sharks vs. Fish):** Plots shark population (Y-axis) against fish population (X-axis) as a fading trajectory with a bright marker at the current state, making cyclic orbits easy to observe.

### Presets & Parameters Sidebar
- **Preset Dropdown:** Immediately loads and resets to one of four configurations:
  - *Dewdney's IBM PC (32x14)* — 200 fish, 20 sharks, `fbreed=3`, `sbreed=10`, `starve=3`.
  - *Magi's VAX (80x23)* — 500 fish, 50 sharks, `fbreed=3`, `sbreed=10`, `starve=3`.
  - *Large Ocean (100x60)* — 1500 fish, 150 sharks, `fbreed=3`, `sbreed=10`, `starve=3`.
  - *Boom & Bust (60x40)* — 400 fish, 40 sharks, `fbreed=2`, `sbreed=5`, `starve=4`.
- **Parameters Form:** Edit grid dimensions (`Width`, `Height`), initial populations (`nfish`, `nsharks`), breeding thresholds (`fbreed`, `sbreed`), and `starve`, then click **Apply & Reset**. Invalid configurations (such as `nfish + nsharks > width * height`) display an inline error without disrupting the current run.
- **RNG Seed & Roll:** Enter any string or number to make runs 100% reproducible across resets, leave blank for non-deterministic runs, or click **Roll** to generate a new random seed and reset immediately.
