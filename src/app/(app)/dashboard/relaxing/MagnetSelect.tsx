"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Fit } from "./Fit";

const CHIP = 44;
const H_PAD = 26;
const PITCH = 45;
const SPREAD = 2.8;
const CLUSTER: [number, number][] = [
  [0, 0],
  [45, 0],
  [22.5, -39],
  [-22.5, -39],
  [-45, 0],
  [-22.5, 39],
  [22.5, 39],
];

function stillness() {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export function MagnetSelect() {
  const [sel, setSel] = useState(0);
  const [lean, setLean] = useState({ x: 0, y: 0 });
  const wrap = useRef<HTMLDivElement>(null);
  const still = stillness();
  const pull = 0.55;
  const grow = 1.16 + 0.22 * pull;
  const room = (CHIP * (grow - 1)) / 2;
  const aura = 3 + 9 * pull;
  const tilt = 5 * pull;
  const cower = 0.04 + 0.09 * pull;
  const xs = CLUSTER.map((point) => point[0]);
  const ys = CLUSTER.map((point) => point[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const width = Math.max(...xs) - minX + CHIP + H_PAD * 2;
  const height = Math.max(...ys) - minY + CHIP + H_PAD * 2;
  const zeta = 0.9 - 0.48 * 0.55;
  const spring = (k: number, mass: number) =>
    still ? { duration: 0 } : { type: "spring" as const, stiffness: k, damping: 2 * Math.sqrt(k * mass) * zeta, mass };

  const field = CLUSTER.map(([px, py], index) => {
    const [ax, ay] = CLUSTER[sel];
    const dx = px - ax;
    const dy = py - ay;
    const gap = Math.hypot(dx, dy);
    const far = gap / PITCH;
    const fall = index === sel ? 0 : Math.exp(-(far - 1) / SPREAD);
    const push = index === sel ? 0 : room + aura;
    const ux = gap ? dx / gap : 0;
    const uy = gap ? dy / gap : 0;
    return { far, fall, push, ux, uy };
  });

  useEffect(() => {
    const el = wrap.current;
    if (!el || still) return;
    let frame = 0;
    let next = { x: 0, y: 0 };
    const publish = () => {
      frame = 0;
      setLean(next);
    };
    const read = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const scale = rect.width / (el.offsetWidth || rect.width) || 1;
      const mx = (event.clientX - rect.left) / scale;
      const my = (event.clientY - rect.top) / scale;
      const dx = mx - width / 2;
      const dy = my - height / 2;
      const distance = Math.hypot(dx, dy);
      const radius = Math.max(1, width / 2);
      const rise = Math.min(1, distance / radius);
      const away = distance <= radius ? 1 : Math.max(0, 1 - (distance - radius) / 44);
      const drawn = rise * away * 4.5;
      next = drawn > 0 ? { x: (dx / (distance || 1)) * drawn, y: (dy / (distance || 1)) * drawn } : { x: 0, y: 0 };
      if (!frame) frame = requestAnimationFrame(publish);
    };
    const gone = () => {
      next = { x: 0, y: 0 };
      if (!frame) frame = requestAnimationFrame(publish);
    };
    document.addEventListener("pointermove", read, { passive: true });
    document.addEventListener("pointerleave", gone);
    return () => {
      document.removeEventListener("pointermove", read);
      document.removeEventListener("pointerleave", gone);
      cancelAnimationFrame(frame);
    };
  }, [height, still, width]);

  return (
    <Fit width={width} height={height}>
      <div ref={wrap} className="relative" style={{ width, height }} role="radiogroup" aria-label="Magnet select">
        {CLUSTER.map(([px, py], index) => {
          const on = index === sel;
          const { far, fall, push, ux, uy } = field[index];
          const k = 300 + 280 * (1 - Math.min(far, 3) / 4);
          const wait = still ? 0 : far * 0.022;
          return (
            <motion.button
              key={index}
              type="button"
              className="mag-chip"
              role="radio"
              aria-checked={on}
              aria-label={`Pilihan ${index + 1}`}
              data-on={on || undefined}
              style={{ left: px - minX + H_PAD, top: py - minY + H_PAD, width: CHIP, height: CHIP }}
              onClick={() => setSel(index)}
              initial={false}
              animate={{
                x: ux * push,
                y: uy * push,
                scaleX: on ? grow : 1 - cower * fall,
                scaleY: on ? grow : 1 - cower * fall,
                rotate: ux * tilt * fall,
              }}
              transition={{
                x: { ...spring(k, 0.9), delay: wait },
                y: { ...spring(k, 0.9), delay: wait },
                scaleX: { ...spring(k * 1.24, 0.8), delay: wait },
                scaleY: { ...spring(k * 0.86, 0.95), delay: wait },
                rotate: { ...spring(k * 0.8, 1), delay: wait },
              }}
            >
              <span className="mag-skin" style={{ ["--lx" as string]: `${lean.x.toFixed(2)}px`, ["--ly" as string]: `${lean.y.toFixed(2)}px` }} />
            </motion.button>
          );
        })}
      </div>
    </Fit>
  );
}
