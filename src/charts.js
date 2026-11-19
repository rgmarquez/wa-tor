const CHART_PADDING = { top: 18, right: 16, bottom: 28, left: 46 };
const FISH_COLOR = "#38bdf8";
const SHARK_COLOR = "#fb7185";
const GRID_COLOR = "rgba(148, 163, 184, 0.14)";
const AXIS_TEXT_COLOR = "#94a3b8";

function prepareCanvas(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));

    const targetWidth = Math.floor(width * dpr);
    const targetHeight = Math.floor(height * dpr);
    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
    }

    const ctx = canvas.getContext("2d");
    ctx.save();
    ctx.scale(dpr, dpr);
    return { ctx, width, height };
}

/**
 * Dual-series line chart of fish and shark populations over chronons.
 */
export class PopulationChart {
    /**
     * @param {HTMLCanvasElement} canvas
     * @param {number} [maxWindow=400]
     */
    constructor(canvas, maxWindow = 400) {
        this.canvas = canvas;
        this.maxWindow = maxWindow;
    }

    /**
     * Renders the population history.
     * @param {Array<{ chronon: number, fish: number, sharks: number }>} history
     */
    render(history) {
        const { ctx, width, height } = prepareCanvas(this.canvas);
        ctx.clearRect(0, 0, width, height);

        const plotX = CHART_PADDING.left;
        const plotY = CHART_PADDING.top;
        const plotW = Math.max(1, width - CHART_PADDING.left - CHART_PADDING.right);
        const plotH = Math.max(1, height - CHART_PADDING.top - CHART_PADDING.bottom);

        const slice = history.length > this.maxWindow
            ? history.slice(history.length - this.maxWindow)
            : history;

        let maxPop = 10;
        for (let i = 0; i < slice.length; i += 1) {
            if (slice[i].fish > maxPop) maxPop = slice[i].fish;
            if (slice[i].sharks > maxPop) maxPop = slice[i].sharks;
        }
        maxPop = Math.ceil(maxPop * 1.1);

        // Horizontal gridlines and Y-axis labels.
        ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        const yTicks = 4;
        for (let i = 0; i <= yTicks; i += 1) {
            const ratio = i / yTicks;
            const py = plotY + plotH - ratio * plotH;
            const label = Math.round(ratio * maxPop);

            ctx.strokeStyle = GRID_COLOR;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(plotX, Math.round(py) + 0.5);
            ctx.lineTo(plotX + plotW, Math.round(py) + 0.5);
            ctx.stroke();

            ctx.fillStyle = AXIS_TEXT_COLOR;
            ctx.fillText(String(label), plotX - 6, py);
        }

        if (slice.length > 0) {
            const firstChronon = slice[0].chronon;
            const lastChronon = slice[slice.length - 1].chronon;

            ctx.textAlign = "left";
            ctx.textBaseline = "top";
            ctx.fillStyle = AXIS_TEXT_COLOR;
            ctx.fillText(`t=${firstChronon}`, plotX, plotY + plotH + 8);

            ctx.textAlign = "right";
            ctx.fillText(`t=${lastChronon}`, plotX + plotW, plotY + plotH + 8);

            this.drawSeries(ctx, slice, "fish", FISH_COLOR, plotX, plotY, plotW, plotH, maxPop);
            this.drawSeries(ctx, slice, "sharks", SHARK_COLOR, plotX, plotY, plotW, plotH, maxPop);
        }

        ctx.restore();
    }

    drawSeries(ctx, slice, key, color, plotX, plotY, plotW, plotH, maxPop) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.75;
        ctx.beginPath();

        const denom = Math.max(1, slice.length - 1);
        for (let i = 0; i < slice.length; i += 1) {
            const px = plotX + (i / denom) * plotW;
            const py = plotY + plotH - (slice[i][key] / maxPop) * plotH;
            if (i === 0) {
                ctx.moveTo(px, py);
            } else {
                ctx.lineTo(px, py);
            }
        }
        ctx.stroke();
    }
}

/**
 * Phase-space trajectory chart plotting sharks (Y) vs. fish (X).
 */
export class PhaseSpaceChart {
    /**
     * @param {HTMLCanvasElement} canvas
     * @param {number} [maxTrail=300]
     */
    constructor(canvas, maxTrail = 300) {
        this.canvas = canvas;
        this.maxTrail = maxTrail;
    }

    /**
     * Renders the predator-prey phase-space orbit.
     * @param {Array<{ chronon: number, fish: number, sharks: number }>} history
     */
    render(history) {
        const { ctx, width, height } = prepareCanvas(this.canvas);
        ctx.clearRect(0, 0, width, height);

        const plotX = CHART_PADDING.left;
        const plotY = CHART_PADDING.top;
        const plotW = Math.max(1, width - CHART_PADDING.left - CHART_PADDING.right);
        const plotH = Math.max(1, height - CHART_PADDING.top - CHART_PADDING.bottom);

        const slice = history.length > this.maxTrail
            ? history.slice(history.length - this.maxTrail)
            : history;

        let maxFish = 10;
        let maxSharks = 10;
        for (let i = 0; i < slice.length; i += 1) {
            if (slice[i].fish > maxFish) maxFish = slice[i].fish;
            if (slice[i].sharks > maxSharks) maxSharks = slice[i].sharks;
        }
        maxFish = Math.ceil(maxFish * 1.1);
        maxSharks = Math.ceil(maxSharks * 1.1);

        // Plot frame and grid.
        ctx.strokeStyle = GRID_COLOR;
        ctx.lineWidth = 1;
        ctx.strokeRect(plotX + 0.5, plotY + 0.5, plotW, plotH);

        ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
        ctx.fillStyle = AXIS_TEXT_COLOR;

        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillText(String(maxSharks), plotX - 6, plotY);
        ctx.fillText("0", plotX - 6, plotY + plotH);

        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText("0", plotX, plotY + plotH + 8);
        ctx.textAlign = "center";
        ctx.fillText("Fish", plotX + plotW / 2, plotY + plotH + 8);
        ctx.textAlign = "right";
        ctx.fillText(String(maxFish), plotX + plotW, plotY + plotH + 8);

        // Draw fading phase-space trail.
        if (slice.length > 1) {
            ctx.lineWidth = 1.5;
            for (let i = 1; i < slice.length; i += 1) {
                const alpha = 0.12 + 0.88 * (i / slice.length);
                const x1 = plotX + (slice[i - 1].fish / maxFish) * plotW;
                const y1 = plotY + plotH - (slice[i - 1].sharks / maxSharks) * plotH;
                const x2 = plotX + (slice[i].fish / maxFish) * plotW;
                const y2 = plotY + plotH - (slice[i].sharks / maxSharks) * plotH;

                ctx.strokeStyle = `rgba(167, 139, 250, ${alpha.toFixed(3)})`;
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }
        }

        if (slice.length > 0) {
            const latest = slice[slice.length - 1];
            const cx = plotX + (latest.fish / maxFish) * plotW;
            const cy = plotY + plotH - (latest.sharks / maxSharks) * plotH;

            ctx.fillStyle = "#f8fafc";
            ctx.beginPath();
            ctx.arc(cx, cy, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#a78bfa";
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        ctx.restore();
    }
}
