/**
 * Renders a WaTorSimulation grid onto an HTML5 Canvas in one of three view modes:
 * - "cells": colored cells on a dark ocean grid
 * - "symbols": Dewdney's diagram style (dots for fish, circles for sharks)
 * - "ascii": Dewdney's terminal display ('.' for fish, '0' for sharks)
 */
export class OceanRenderer {
    /**
     * @param {HTMLCanvasElement} canvas
     */
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.viewMode = "cells";
    }

    /**
     * Sets the active visual mode.
     * @param {"cells" | "symbols" | "ascii"} mode
     */
    setViewMode(mode) {
        this.viewMode = mode;
    }

    /**
     * Renders the current state of the simulation.
     * @param {import("./simulation.js").WaTorSimulation} sim
     */
    render(sim) {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        const cssWidth = Math.max(1, Math.floor(rect.width));
        const cssHeight = Math.max(1, Math.floor(rect.height));

        const targetWidth = Math.floor(cssWidth * dpr);
        const targetHeight = Math.floor(cssHeight * dpr);
        if (this.canvas.width !== targetWidth || this.canvas.height !== targetHeight) {
            this.canvas.width = targetWidth;
            this.canvas.height = targetHeight;
        }

        const ctx = this.ctx;
        ctx.save();
        ctx.scale(dpr, dpr);

        const cellSize = Math.min(cssWidth / sim.width, cssHeight / sim.height);
        const gridWidth = cellSize * sim.width;
        const gridHeight = cellSize * sim.height;
        const offsetX = Math.floor((cssWidth - gridWidth) / 2);
        const offsetY = Math.floor((cssHeight - gridHeight) / 2);

        if (this.viewMode === "symbols") {
            this.renderSymbols(ctx, sim, cssWidth, cssHeight, offsetX, offsetY, cellSize, gridWidth, gridHeight);
        } else if (this.viewMode === "ascii") {
            this.renderAscii(ctx, sim, cssWidth, cssHeight, offsetX, offsetY, cellSize, gridWidth, gridHeight);
        } else {
            this.renderCells(ctx, sim, cssWidth, cssHeight, offsetX, offsetY, cellSize, gridWidth, gridHeight);
        }

        ctx.restore();
    }

    renderCells(ctx, sim, cssWidth, cssHeight, offsetX, offsetY, cellSize, gridWidth, gridHeight) {
        ctx.fillStyle = "#06101c";
        ctx.fillRect(0, 0, cssWidth, cssHeight);

        ctx.fillStyle = "#0a1929";
        ctx.fillRect(offsetX, offsetY, gridWidth, gridHeight);

        const pad = cellSize >= 8 ? 1 : 0;
        const drawSize = Math.max(1, cellSize - pad * 2);

        for (let y = 0; y < sim.height; y += 1) {
            const rowOffset = y * sim.width;
            const py = offsetY + y * cellSize + pad;
            for (let x = 0; x < sim.width; x += 1) {
                const idx = rowOffset + x;
                const px = offsetX + x * cellSize + pad;

                if (sim.fish[idx] !== -1) {
                    ctx.fillStyle = "#38bdf8";
                    ctx.fillRect(px, py, drawSize, drawSize);
                } else if (sim.sharks[idx] !== -1) {
                    ctx.fillStyle = "#fb7185";
                    ctx.fillRect(px, py, drawSize, drawSize);
                }
            }
        }

        if (cellSize >= 7) {
            this.drawGridLines(ctx, sim.width, sim.height, offsetX, offsetY, cellSize, "rgba(148, 163, 184, 0.12)");
        }
    }

    renderSymbols(ctx, sim, cssWidth, cssHeight, offsetX, offsetY, cellSize, gridWidth, gridHeight) {
        ctx.fillStyle = "#e2e8f0";
        ctx.fillRect(0, 0, cssWidth, cssHeight);

        ctx.fillStyle = "#f8fafc";
        ctx.fillRect(offsetX, offsetY, gridWidth, gridHeight);

        if (cellSize >= 5) {
            this.drawGridLines(ctx, sim.width, sim.height, offsetX, offsetY, cellSize, "rgba(15, 23, 42, 0.14)");
        }

        const dotRadius = Math.max(1.5, cellSize * 0.16);
        const circleRadius = Math.max(2.2, cellSize * 0.34);
        ctx.lineWidth = Math.max(1, cellSize * 0.08);

        for (let y = 0; y < sim.height; y += 1) {
            const rowOffset = y * sim.width;
            const cy = offsetY + (y + 0.5) * cellSize;
            for (let x = 0; x < sim.width; x += 1) {
                const idx = rowOffset + x;
                const cx = offsetX + (x + 0.5) * cellSize;

                if (sim.fish[idx] !== -1) {
                    ctx.fillStyle = "#0f172a";
                    ctx.beginPath();
                    ctx.arc(cx, cy, dotRadius, 0, Math.PI * 2);
                    ctx.fill();
                } else if (sim.sharks[idx] !== -1) {
                    ctx.strokeStyle = "#be123c";
                    ctx.beginPath();
                    ctx.arc(cx, cy, circleRadius, 0, Math.PI * 2);
                    ctx.stroke();
                }
            }
        }
    }

    renderAscii(ctx, sim, cssWidth, cssHeight, offsetX, offsetY, cellSize, gridWidth, gridHeight) {
        ctx.fillStyle = "#070b0f";
        ctx.fillRect(0, 0, cssWidth, cssHeight);

        ctx.fillStyle = "#0c1218";
        ctx.fillRect(offsetX, offsetY, gridWidth, gridHeight);

        const fontSize = Math.max(7, Math.floor(cellSize * 0.85));
        ctx.font = `600 ${fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        for (let y = 0; y < sim.height; y += 1) {
            const rowOffset = y * sim.width;
            const cy = offsetY + (y + 0.5) * cellSize;
            for (let x = 0; x < sim.width; x += 1) {
                const idx = rowOffset + x;
                const cx = offsetX + (x + 0.5) * cellSize;

                if (sim.fish[idx] !== -1) {
                    ctx.fillStyle = "#4ade80";
                    ctx.fillText(".", cx, cy);
                } else if (sim.sharks[idx] !== -1) {
                    ctx.fillStyle = "#fbbf24";
                    ctx.fillText("0", cx, cy);
                }
            }
        }
    }

    drawGridLines(ctx, cols, rows, offsetX, offsetY, cellSize, color) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();

        for (let x = 0; x <= cols; x += 1) {
            const px = Math.round(offsetX + x * cellSize) + 0.5;
            ctx.moveTo(px, offsetY);
            ctx.lineTo(px, offsetY + rows * cellSize);
        }
        for (let y = 0; y <= rows; y += 1) {
            const py = Math.round(offsetY + y * cellSize) + 0.5;
            ctx.moveTo(offsetX, py);
            ctx.lineTo(offsetX + cols * cellSize, py);
        }
        ctx.stroke();
    }
}
