"use client";

/**
 * WordCloudView — Interactive word cloud rendered on canvas via d3-cloud.
 *
 * Features:
 * - Font sizes scaled proportionally to prominence (1–10)
 * - Rich color palette on dark background
 * - Hover tooltips showing prominence score
 * - High-DPI (2x) PNG download
 */

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import cloud from "d3-cloud";

// ── Types ────────────────────────────────────────────────────────────

interface Concept {
  term: string;
  prominence: number;
}

interface WordCloudViewProps {
  concepts: Concept[];
  /** Called when user wants to start over. */
  onReset: () => void;
}

// ── Color palette (vibrant on dark background) ──────────────────────

const COLORS = [
  "#6c63ff", // Primary accent
  "#a78bfa", // Lavender
  "#38bdf8", // Sky blue
  "#22d3ee", // Cyan
  "#34d399", // Emerald
  "#fbbf24", // Amber
  "#f472b6", // Pink
  "#fb923c", // Orange
  "#818cf8", // Indigo
  "#2dd4bf", // Teal
  "#e879f9", // Fuchsia
  "#facc15", // Yellow
];

function getColor(index: number): string {
  return COLORS[index % COLORS.length];
}

// ── Layout word ──────────────────────────────────────────────────────

interface LayoutWord {
  text: string;
  size: number;
  prominence: number;
  color: string;
  x?: number;
  y?: number;
  rotate?: number;
  font?: string;
}

// ── Component ────────────────────────────────────────────────────────

export default function WordCloudView({ concepts, onReset }: WordCloudViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [layoutWords, setLayoutWords] = useState<LayoutWord[]>([]);
  const [tooltip, setTooltip] = useState<{
    text: string;
    prominence: number;
    x: number;
    y: number;
  } | null>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });

  // ── Responsive sizing ────────────────────────────────────────────
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const w = Math.min(containerRef.current.offsetWidth, 700);
        setDimensions({ width: w, height: Math.round(w * 0.65) });
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // ── Compute d3-cloud layout ──────────────────────────────────────
  useEffect(() => {
    if (concepts.length === 0) return;

    const { width, height } = dimensions;

    // Scale font sizes: prominence 1 → minSize, 10 → maxSize
    const minSize = Math.max(12, width * 0.025);
    const maxSize = Math.max(36, width * 0.08);

    const words: LayoutWord[] = concepts.map((c, i) => ({
      text: c.term,
      size: minSize + ((c.prominence - 1) / 9) * (maxSize - minSize),
      prominence: c.prominence,
      color: getColor(i),
    }));

    const layout = cloud<LayoutWord>()
      .size([width, height])
      .words(words)
      .padding(6)
      .rotate(() => (Math.random() > 0.65 ? 90 * (Math.random() > 0.5 ? 1 : -1) : 0))
      .font("var(--font-geist-sans), system-ui, sans-serif")
      .fontSize((d) => d.size!)
      .spiral("archimedean")
      .on("end", (output) => {
        setLayoutWords(output as LayoutWord[]);
      });

    layout.start();
  }, [concepts, dimensions]);

  // ── Draw on canvas ───────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || layoutWords.length === 0) return;

    const { width, height } = dimensions;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = "#0b0d13";
    ctx.fillRect(0, 0, width, height);

    // Draw words
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (const word of layoutWords) {
      ctx.save();
      ctx.translate(width / 2 + (word.x || 0), height / 2 + (word.y || 0));
      ctx.rotate(((word.rotate || 0) * Math.PI) / 180);
      ctx.font = `${word.prominence >= 7 ? "700" : "500"} ${word.size}px "Geist", system-ui, sans-serif`;
      ctx.fillStyle = word.color;
      ctx.fillText(word.text, 0, 0);
      ctx.restore();
    }
  }, [layoutWords, dimensions]);

  // ── Hover detection ──────────────────────────────────────────────
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas || layoutWords.length === 0) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const { width, height } = dimensions;

      // Check if cursor is near any word
      for (const word of layoutWords) {
        const wx = width / 2 + (word.x || 0);
        const wy = height / 2 + (word.y || 0);
        const halfW = (word.text.length * word.size! * 0.35);
        const halfH = word.size! * 0.6;

        if (
          Math.abs(x - wx) < halfW &&
          Math.abs(y - wy) < halfH
        ) {
          setTooltip({
            text: word.text,
            prominence: word.prominence,
            x: e.clientX,
            y: e.clientY,
          });
          return;
        }
      }
      setTooltip(null);
    },
    [layoutWords, dimensions]
  );

  const handleMouseLeave = useCallback(() => setTooltip(null), []);

  // ── PNG Download (2x resolution) ─────────────────────────────────
  const handleDownload = useCallback(() => {
    if (layoutWords.length === 0) return;

    const { width, height } = dimensions;
    const scale = 2; // 2x for high-DPI

    const offscreen = document.createElement("canvas");
    offscreen.width = width * scale;
    offscreen.height = height * scale;

    const ctx = offscreen.getContext("2d");
    if (!ctx) return;

    ctx.scale(scale, scale);

    // Background
    ctx.fillStyle = "#0b0d13";
    ctx.fillRect(0, 0, width, height);

    // Draw words
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (const word of layoutWords) {
      ctx.save();
      ctx.translate(width / 2 + (word.x || 0), height / 2 + (word.y || 0));
      ctx.rotate(((word.rotate || 0) * Math.PI) / 180);
      ctx.font = `${word.prominence >= 7 ? "700" : "500"} ${word.size}px "Geist", system-ui, sans-serif`;
      ctx.fillStyle = word.color;
      ctx.fillText(word.text, 0, 0);
      ctx.restore();
    }

    // Trigger download
    const link = document.createElement("a");
    link.download = "word-cloud.png";
    link.href = offscreen.toDataURL("image/png");
    link.click();
  }, [layoutWords, dimensions]);

  return (
    <div className="animate-fade-in flex flex-col items-center gap-5 w-full" ref={containerRef}>
      {/* Word cloud canvas */}
      <div
        className="relative rounded-2xl overflow-hidden w-full"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          maxWidth: "700px",
        }}
      >
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="w-full cursor-crosshair"
          style={{ display: "block" }}
          id="word-cloud-canvas"
        />

        {/* Tooltip */}
        {tooltip && (
          <div
            className="fixed z-50 px-3 py-1.5 rounded-lg text-xs font-medium pointer-events-none"
            style={{
              background: "rgba(0, 0, 0, 0.85)",
              color: "var(--foreground)",
              border: "1px solid var(--border)",
              left: tooltip.x + 12,
              top: tooltip.y - 30,
              backdropFilter: "blur(8px)",
            }}
          >
            <span style={{ color: "var(--accent)" }}>{tooltip.text}</span>
            <span style={{ color: "var(--foreground-muted)" }}>
              {" "}— {tooltip.prominence}/10
            </span>
          </div>
        )}

        {/* Concepts count badge */}
        <div
          className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-medium"
          style={{
            background: "rgba(0, 0, 0, 0.6)",
            color: "var(--foreground-muted)",
            backdropFilter: "blur(8px)",
          }}
        >
          {concepts.length} concepts
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 flex-wrap justify-center">
        <button className="btn-primary" onClick={handleDownload} id="download-png-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download PNG
        </button>

        <button className="btn-secondary" onClick={onReset} id="start-over-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
          Start Over
        </button>
      </div>
    </div>
  );
}
