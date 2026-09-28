"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import "./relaxing/bencho.css";
import { HumidityDial } from "./relaxing/HumidityDial";
import { LiquidToggle } from "./relaxing/LiquidToggle";
import { MagnetSelect } from "./relaxing/MagnetSelect";
import { MenuCarousel } from "./relaxing/MenuCarousel";
import { ShopIsland } from "./relaxing/ShopIsland";
import { StockChart, type StockAlert } from "./relaxing/StockChart";
import { TimeScrubber } from "./relaxing/TimeScrubber";

const W = 480;
const H = 400;
const CX = W / 2;
const CY = H / 2;
const N = 720;
const SHAPES = ["Circle", "Square", "Flower"] as const;
type Shape = (typeof SHAPES)[number];
type Dot = { hx: number; hy: number; x: number; y: number; vx: number; vy: number };

const REACH = 80;
const FORCE = 60;

function stillness() {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

function clamp(v: number, a: number, b: number) {
  return Math.min(b, Math.max(a, v));
}

function outline(shape: Shape) {
  const path = new Path2D();
  if (shape === "Circle") path.arc(CX, CY, 150, 0, Math.PI * 2);
  else if (shape === "Square") path.roundRect(CX - 140, CY - 140, 280, 280, 36);
  else {
    for (let i = 0; i < 5; i++) {
      const angle = -Math.PI / 2 + (i * Math.PI * 2) / 5;
      const x = CX + Math.cos(angle) * 104;
      const y = CY + 8 + Math.sin(angle) * 104;
      path.moveTo(x + 60, y);
      path.arc(x, y, 60, 0, Math.PI * 2);
    }
    path.moveTo(CX + 58, CY + 8);
    path.arc(CX, CY + 8, 58, 0, Math.PI * 2);
  }
  return path;
}

function homes(shape: Shape): [number, number][] {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const context = canvas.getContext("2d");
  if (!context) return [];
  const path = outline(shape);
  let area = 0;
  for (let y = 1; y < H; y += 2) {
    for (let x = 1; x < W; x += 2) {
      if (context.isPointInPath(path, x, y)) area += 4;
    }
  }
  const spacing = Math.sqrt((area / N) * (2 / Math.sqrt(3)));
  const rowHeight = (spacing * Math.sqrt(3)) / 2;
  const points: [number, number][] = [];
  for (let y = rowHeight / 2, row = 0; y < H; y += rowHeight, row++) {
    for (let x = spacing / 2 + (row % 2) * (spacing / 2); x < W; x += spacing) {
      if (context.isPointInPath(path, x, y)) points.push([x, y]);
    }
  }
  if (points.length === 0) return [];
  const out: [number, number][] = [];
  for (let i = 0; i < N; i++) out.push(points[Math.floor((i * points.length) / N)]);
  return out;
}

function angleOf(x: number, y: number) {
  return Math.atan2(y - CY, x - CX);
}

const DEMOS = ["Particles", "Magnet select", "Jam", "Waktu", "Menu", "Kelembapan"] as const;

export function ParticlesCard({
  menu,
  alerts = [],
}: {
  menu: { name: string; image: string | null }[];
  alerts?: StockAlert[];
}) {
  const [demo, setDemo] = useState(0);
  const [relaxing, setRelaxing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dots = useRef<Dot[]>([]);
  const shape = useRef<Shape>("Circle");
  const hand = useRef<{ x: number; y: number } | null>(null);
  const frame = useRef(0);
  const still = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    still.current = stillness();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);

    const draw = () => {
      const context = canvas.getContext("2d");
      if (!context) return;
      const scale = canvas.width / W;
      context.setTransform(scale, 0, 0, scale, 0, 0);
      context.clearRect(0, 0, W, H);
      context.fillStyle = getComputedStyle(canvas).color;
      const radius = 1.9;
      context.beginPath();
      for (const dot of dots.current) {
        const speed = Math.hypot(dot.vx, dot.vy);
        if (speed < 0.3) {
          context.moveTo(dot.x + radius, dot.y);
          context.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
        } else {
          const stretch = Math.min(2.6, 1 + speed * 0.12);
          const rotation = Math.atan2(dot.vy, dot.vx);
          context.moveTo(dot.x + Math.cos(rotation) * radius * stretch, dot.y + Math.sin(rotation) * radius * stretch);
          context.ellipse(dot.x, dot.y, radius * stretch, radius / Math.sqrt(stretch), rotation, 0, Math.PI * 2);
        }
      }
      context.fill();
    };

    const become = (nextShape: Shape) => {
      shape.current = nextShape;
      const next = homes(nextShape);
      if (next.length === 0) return;
      const current = dots.current;
      if (!current.length) {
        dots.current = next.map(([x, y]) => ({ hx: x, hy: y, x, y, vx: 0, vy: 0 }));
        return;
      }
      const from = current.map((dot, index) => [angleOf(dot.x, dot.y), index] as const).sort((a, b) => a[0] - b[0]);
      const to = next.map((point, index) => [angleOf(point[0], point[1]), index] as const).sort((a, b) => a[0] - b[0]);
      from.forEach(([, dotIndex], index) => {
        const home = next[to[index][1]];
        current[dotIndex].hx = home[0];
        current[dotIndex].hy = home[1];
        if (still.current) {
          current[dotIndex].x = home[0];
          current[dotIndex].y = home[1];
        }
      });
    };

    const run = () => {
      if (frame.current) return;
      let previous = 0;
      const tick = (time: number) => {
        const dt = previous ? clamp((time - previous) / 16.67, 0, 2.5) : 1;
        previous = time;
        const pointer = hand.current;
        const push = (FORCE / 100) * 11;
        let busy = !!pointer && !still.current;
        for (const dot of dots.current) {
          if (pointer && !still.current) {
            const dx = dot.x - pointer.x;
            const dy = dot.y - pointer.y;
            const distance = Math.hypot(dx, dy);
            if (distance < REACH && distance > 0.01) {
              const strength = (1 - distance / REACH) ** 2 * push;
              dot.vx += (dx / distance) * strength * dt;
              dot.vy += (dy / distance) * strength * dt;
            }
          }
          if (!still.current) {
            dot.vx = (dot.vx + (dot.hx - dot.x) * 0.05 * dt) * 0.84 ** dt;
            dot.vy = (dot.vy + (dot.hy - dot.y) * 0.05 * dt) * 0.84 ** dt;
            dot.x += dot.vx * dt;
            dot.y += dot.vy * dt;
          }
          if (
            Math.abs(dot.hx - dot.x) < 0.05 &&
            Math.abs(dot.hy - dot.y) < 0.05 &&
            Math.abs(dot.vx) < 0.02 &&
            Math.abs(dot.vy) < 0.02
          ) {
            dot.x = dot.hx;
            dot.y = dot.hy;
            dot.vx = 0;
            dot.vy = 0;
          } else busy = true;
        }
        draw();
        frame.current = busy ? requestAnimationFrame(tick) : 0;
      };
      frame.current = requestAnimationFrame(tick);
    };

    const pointFromEvent = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scale = rect.width / W;
      return { x: (event.clientX - rect.left) / scale, y: (event.clientY - rect.top) / scale };
    };

    const onMove = (event: PointerEvent) => {
      if (still.current) return;
      hand.current = pointFromEvent(event);
      run();
    };
    const onLeave = () => {
      hand.current = null;
      run();
    };
    const onDown = (event: PointerEvent) => {
      const point = pointFromEvent(event);
      if (!still.current) {
        const strength = 0.4 + (FORCE / 100) * 1.2;
        for (const dot of dots.current) {
          const dx = dot.x - point.x;
          const dy = dot.y - point.y;
          const distance = Math.hypot(dx, dy);
          if (distance > 200 || distance < 0.01) continue;
          const push = (1 - distance / 200) * 30 * strength;
          dot.vx += (dx / distance) * push;
          dot.vy += (dy / distance) * push;
        }
      }
      become(SHAPES[(SHAPES.indexOf(shape.current) + 1) % SHAPES.length]);
      draw();
      run();
    };

    become("Circle");
    draw();
    run();
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);
    canvas.addEventListener("pointerdown", onDown);
    return () => {
      cancelAnimationFrame(frame.current);
      frame.current = 0;
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("pointerdown", onDown);
    };
  }, []);

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-line bg-surface p-5 shadow-card">
      <div className="flex shrink-0 items-center justify-between gap-3">
        <h2 className="font-semibold">{relaxing ? "Relaxing" : "Pengingat stok"}</h2>
        <LiquidToggle
          checked={relaxing}
          onCheckedChange={setRelaxing}
          label={relaxing ? "Tampilkan pengingat stok" : "Buka Relaxing"}
        />
      </div>
      {relaxing ? null : (
        <div className="mt-3 min-h-[16rem] min-w-0 flex-1 xl:min-h-0">
          <StockChart alerts={alerts} />
        </div>
      )}
      <div className={relaxing ? "mt-3 flex min-h-0 flex-1 items-center gap-1" : "hidden"}>
          <button
            type="button"
            aria-label="Demo sebelumnya"
            onClick={() => setDemo((current) => (current - 1 + DEMOS.length) % DEMOS.length)}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-line bg-white text-ink"
          >
            <ChevronLeft size={16} aria-hidden />
          </button>
          <div className="relative min-h-[16rem] min-w-0 flex-1 self-stretch xl:min-h-0">
            <canvas
              ref={canvasRef}
              className={`absolute inset-0 m-auto h-full max-h-full w-auto max-w-full cursor-crosshair touch-none text-ink ${demo === 0 ? "" : "hidden"}`}
              style={{ aspectRatio: `${W} / ${H}` }}
              role="img"
              aria-label="Bentuk titik. Arahkan kursor untuk mendorongnya, tekan untuk mengganti bentuk."
            />
            {demo === 1 ? <MagnetSelect /> : null}
            {demo === 2 ? <ShopIsland /> : null}
            {demo === 3 ? <TimeScrubber /> : null}
            {demo === 4 ? <MenuCarousel menu={menu} /> : null}
            {demo === 5 ? <HumidityDial /> : null}
          </div>
          <button
            type="button"
            aria-label="Demo berikutnya"
            onClick={() => setDemo((current) => (current + 1) % DEMOS.length)}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-line bg-white text-ink"
          >
            <ChevronRight size={16} aria-hidden />
          </button>
        </div>
    </section>
  );
}
