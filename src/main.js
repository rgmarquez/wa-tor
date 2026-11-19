import { WaTorSimulation } from "./simulation.js";
import { PRESETS } from "./presets.js";
import { OceanRenderer } from "./renderer.js";
import { PopulationChart, PhaseSpaceChart } from "./charts.js";

const elements = {
    oceanCanvas: document.getElementById("ocean-canvas"),
    populationCanvas: document.getElementById("population-canvas"),
    phaseCanvas: document.getElementById("phase-canvas"),
    presetSelect: document.getElementById("preset-select"),
    presetDesc: document.getElementById("preset-description"),
    playPauseBtn: document.getElementById("play-pause-btn"),
    stepBtn: document.getElementById("step-btn"),
    resetBtn: document.getElementById("reset-btn"),
    speedSlider: document.getElementById("speed-slider"),
    speedValue: document.getElementById("speed-value"),
    viewModeButtons: Array.from(document.querySelectorAll("[data-view-mode]")),
    statChronon: document.getElementById("stat-chronon"),
    statFish: document.getElementById("stat-fish"),
    statSharks: document.getElementById("stat-sharks"),
    statStatus: document.getElementById("stat-status"),
    form: document.getElementById("params-form"),
    formError: document.getElementById("form-error"),
    inputWidth: document.getElementById("param-width"),
    inputHeight: document.getElementById("param-height"),
    inputNFish: document.getElementById("param-nfish"),
    inputNSharks: document.getElementById("param-nsharks"),
    inputFBreed: document.getElementById("param-fbreed"),
    inputSBreed: document.getElementById("param-sbreed"),
    inputStarve: document.getElementById("param-starve"),
    inputSeed: document.getElementById("param-seed"),
    randomSeedBtn: document.getElementById("random-seed-btn")
};

const oceanRenderer = new OceanRenderer(elements.oceanCanvas);
const populationChart = new PopulationChart(elements.populationCanvas);
const phaseChart = new PhaseSpaceChart(elements.phaseCanvas);

let simulation = null;
let isRunning = false;
let stepsPerSecond = Number(elements.speedSlider.value) || 12;
let lastFrameTime = 0;
let stepAccumulator = 0;

function populatePresetSelector() {
    elements.presetSelect.innerHTML = "";
    for (const [key, preset] of Object.entries(PRESETS)) {
        const option = document.createElement("option");
        option.value = key;
        option.textContent = preset.name;
        elements.presetSelect.appendChild(option);
    }
}

function writeFormFromParams(params) {
    elements.inputWidth.value = String(params.width);
    elements.inputHeight.value = String(params.height);
    elements.inputNFish.value = String(params.nfish);
    elements.inputNSharks.value = String(params.nsharks);
    elements.inputFBreed.value = String(params.fbreed);
    elements.inputSBreed.value = String(params.sbreed);
    elements.inputStarve.value = String(params.starve);
}

function readParamsFromForm() {
    return {
        width: Number(elements.inputWidth.value),
        height: Number(elements.inputHeight.value),
        nfish: Number(elements.inputNFish.value),
        nsharks: Number(elements.inputNSharks.value),
        fbreed: Number(elements.inputFBreed.value),
        sbreed: Number(elements.inputSBreed.value),
        starve: Number(elements.inputStarve.value),
        seed: elements.inputSeed.value.trim()
    };
}

function setRunningState(nextRunning) {
    isRunning = nextRunning;
    elements.playPauseBtn.textContent = isRunning ? "Pause" : "Play";
    elements.playPauseBtn.setAttribute("aria-pressed", String(isRunning));
    if (isRunning) {
        lastFrameTime = performance.now();
        stepAccumulator = 0;
    }
}

function updateStats() {
    elements.statChronon.textContent = String(simulation.chronon);
    elements.statFish.textContent = String(simulation.fishCount);
    elements.statSharks.textContent = String(simulation.sharkCount);

    let statusText = "Active";
    let statusClass = "status-active";
    if (simulation.fishCount === 0 && simulation.sharkCount === 0) {
        statusText = "Ocean Empty";
        statusClass = "status-extinct";
    } else if (simulation.sharkCount === 0) {
        statusText = "Sharks Extinct";
        statusClass = "status-warning";
    } else if (simulation.fishCount === 0) {
        statusText = "Fish Extinct";
        statusClass = "status-warning";
    }

    elements.statStatus.textContent = statusText;
    elements.statStatus.className = `stat-badge ${statusClass}`;
}

function renderAll() {
    if (!simulation) return;
    oceanRenderer.render(simulation);
    populationChart.render(simulation.history);
    phaseChart.render(simulation.history);
    updateStats();
}

function resetSimulation() {
    elements.formError.textContent = "";
    try {
        const params = readParamsFromForm();
        simulation = new WaTorSimulation(params);
        setRunningState(false);
        renderAll();
    } catch (error) {
        elements.formError.textContent = error.message;
    }
}

function applyPreset(presetKey) {
    const preset = PRESETS[presetKey];
    if (!preset) return;
    elements.presetSelect.value = presetKey;
    elements.presetDesc.textContent = preset.description;
    writeFormFromParams(preset.params);
    resetSimulation();
}

function animate(now) {
    if (isRunning && simulation) {
        const elapsedSeconds = Math.min(0.25, (now - lastFrameTime) / 1000);
        lastFrameTime = now;
        stepAccumulator += elapsedSeconds * stepsPerSecond;

        const maxStepsPerFrame = 15;
        let stepsThisFrame = 0;
        while (stepAccumulator >= 1 && stepsThisFrame < maxStepsPerFrame) {
            simulation.step();
            stepAccumulator -= 1;
            stepsThisFrame += 1;
        }

        if (stepsThisFrame > 0) {
            renderAll();
        }
    }
    requestAnimationFrame(animate);
}

function bindEvents() {
    elements.presetSelect.addEventListener("change", (event) => {
        applyPreset(event.target.value);
    });

    elements.playPauseBtn.addEventListener("click", () => {
        setRunningState(!isRunning);
    });

    elements.stepBtn.addEventListener("click", () => {
        setRunningState(false);
        if (simulation) {
            simulation.step();
            renderAll();
        }
    });

    elements.resetBtn.addEventListener("click", () => {
        resetSimulation();
    });

    elements.form.addEventListener("submit", (event) => {
        event.preventDefault();
        resetSimulation();
    });

    elements.speedSlider.addEventListener("input", (event) => {
        stepsPerSecond = Number(event.target.value);
        elements.speedValue.textContent = `${stepsPerSecond} / s`;
    });

    elements.randomSeedBtn.addEventListener("click", () => {
        const randomSeed = Math.random().toString(36).slice(2, 10);
        elements.inputSeed.value = randomSeed;
        resetSimulation();
    });

    for (const button of elements.viewModeButtons) {
        button.addEventListener("click", () => {
            const mode = button.dataset.viewMode;
            oceanRenderer.setViewMode(mode);
            for (const other of elements.viewModeButtons) {
                other.classList.toggle("is-active", other === button);
            }
            renderAll();
        });
    }

    window.addEventListener("keydown", (event) => {
        const tag = event.target?.tagName;
        if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") {
            return;
        }
        if (event.code === "Space") {
            event.preventDefault();
            setRunningState(!isRunning);
        }
    });

    const resizeObserver = new ResizeObserver(() => {
        renderAll();
    });
    resizeObserver.observe(elements.oceanCanvas);
    resizeObserver.observe(elements.populationCanvas);
    resizeObserver.observe(elements.phaseCanvas);
}

populatePresetSelector();
bindEvents();
elements.speedValue.textContent = `${stepsPerSecond} / s`;
applyPreset("dewdney");
requestAnimationFrame(animate);
