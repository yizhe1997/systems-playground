'use client';

import { useEffect, useRef, useState } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';

// A looping animation rendered entirely out of Unicode Braille characters (each glyph packs an
// up-to-8-dot 2x4 pixel block) - `cols`/`rows` are in braille-CELL units, not real pixels. Every
// cell carries its own glyph plus a foreground and background RGB color, so unlike a plain
// monochrome ASCII-art render this reproduces the source image/video's actual color per cell.
// `delays` is a flat array parallel to `frames`, not per-frame, since every frame here is already
// a full grid (no delta/palette compression - simpler format, bigger file, hence gzipped on disk).
type MilliCell = { g: string; fg: [number, number, number]; bg: [number, number, number] };
type MilliFrame = { cells: MilliCell[][] };
type MilliAnimation = { version: number; cols: number; rows: number; delays: number[]; frames: MilliFrame[] };

async function loadAnimation(src: string): Promise<MilliAnimation> {
  const res = await fetch(src);
  const compressed = await res.arrayBuffer();
  // The file on disk is gzip at the application level (this project's own .gz, not a transport
  // Content-Encoding) - this decompression is on top of whatever fetch() already transparently
  // undid, if anything.
  const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'));
  const text = await new Response(stream).text();
  return JSON.parse(text) as MilliAnimation;
}

// Base resolution the canvas is actually drawn at (kept crisp via devicePixelRatio); the CSS box
// is stretched to 100%/100% of the parent afterward so the animation fills whatever screen area
// it's given rather than sitting pinned at this native size with charcoal bezel showing around it.
const CELL_WIDTH = 9;
const CELL_HEIGHT = 16;

export default function BrailleScreensaver({
  src,
  loadingLabel = 'Loading',
  className,
  style,
}: {
  src: string;
  loadingLabel?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [ready, setReady] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    setReady(false);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const drawFrame = (data: MilliAnimation, ctx: CanvasRenderingContext2D, index: number) => {
      if (cancelledRef.current) return;
      const frame = data.frames[index];
      ctx.font = `${CELL_HEIGHT - 2}px monospace`;
      ctx.textBaseline = 'top';
      for (let row = 0; row < data.rows; row++) {
        const cells = frame.cells[row];
        for (let col = 0; col < data.cols; col++) {
          const cell = cells[col];
          const x = col * CELL_WIDTH;
          const y = row * CELL_HEIGHT;
          ctx.fillStyle = `rgb(${cell.bg[0]},${cell.bg[1]},${cell.bg[2]})`;
          ctx.fillRect(x, y, CELL_WIDTH, CELL_HEIGHT);
          ctx.fillStyle = `rgb(${cell.fg[0]},${cell.fg[1]},${cell.fg[2]})`;
          ctx.fillText(cell.g, x, y);
        }
      }
      const nextIndex = (index + 1) % data.frames.length;
      const delay = data.delays[index] ?? 33;
      timeoutRef.current = setTimeout(() => drawFrame(data, ctx, nextIndex), Math.max(16, delay));
    };

    loadAnimation(src)
      .then((data) => {
        if (cancelledRef.current) return;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = data.cols * CELL_WIDTH * dpr;
        canvas.height = data.rows * CELL_HEIGHT * dpr;
        // CSS box fills 100% of the parent regardless of the native drawing resolution above -
        // this is what makes the animation cover the whole screen area instead of rendering at
        // its fixed native pixel size with empty bezel showing around it.
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.scale(dpr, dpr);
        drawFrame(data, ctx, 0);
        setReady(true);
      })
      .catch(() => {
        // Silently drop - the off-screen just stays on the loading state rather than showing an
        // error banner for what's a purely decorative animation.
      });

    return () => {
      cancelledRef.current = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [src]);

  return (
    <div className={className} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', ...style }}>
      {!ready && <LoadingSpinner label={loadingLabel} size={40} />}
      <canvas ref={canvasRef} aria-hidden="true" style={{ display: ready ? 'block' : 'none' }} />
    </div>
  );
}
