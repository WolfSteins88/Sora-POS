"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Fit } from "./Fit";

const TICKS = 60;
const START = 120;
const SWEEP = 300;
const CX = 100;
const CY = 100;
const R = 52;
const WAVE = 2.6;

function clamp(value: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, value));
}

function stateFor(value: number) {
  if (value < 12) return "crit";
  if (value < 25) return "low";
  if (value > 80) return "high";
  return "ok";
}

export function HumidityDial() {
  const [target, setTarget] = useState(15);
  const [display, setDisplay] = useState(15);
  const [dragging, setDragging] = useState(false);
  const [wave, setWave] = useState(0);
  const current = useRef(15);
  const velocity = useRef(0);
  const phase = useRef(0);
  const svg = useRef<SVGSVGElement>(null);
  const reduced = typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    let last = performance.now();
    let frame = 0;
    const tick = (time: number) => {
      const dt = Math.min(34, time - last) / 16.67;
      last = time;
      if (reduced) current.current = target;
      else {
        velocity.current += (target - current.current) * 0.16 * dt;
        velocity.current *= 0.76 ** dt;
        current.current += velocity.current * dt;
        if (Math.abs(target - current.current) < 0.02 && Math.abs(velocity.current) < 0.02) {
          current.current = target;
          velocity.current = 0;
        }
      }
      phase.current += dt * 0.055;
      setDisplay(current.current);
      setWave(phase.current);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reduced, target]);

  function fromPointer(event: ReactPointerEvent<SVGSVGElement>) {
    const node = svg.current;
    if (!node) return;
    const box = node.getBoundingClientRect();
    const x = ((event.clientX - box.left) / box.width) * 200 - CX;
    const y = ((event.clientY - box.top) / box.height) * 200 - CY;
    let deg = (Math.atan2(y, x) * 180) / Math.PI;
    if (deg < 0) deg += 360;
    let rel = deg - START;
    if (rel < 0) rel += 360;
    if (rel > SWEEP) rel = rel < SWEEP + 30 ? SWEEP : 0;
    setTarget(Math.round((rel / SWEEP) * 100));
  }

  const fraction = clamp(display, 0, 100) / 100;
  const amp = reduced ? 0 : 1 + (display / 100) * WAVE;
  const band = Array.from({ length: TICKS }, (_, index) => {
    const step = index / (TICKS - 1);
    const on = step <= fraction + 0.001;
    const behind = fraction - step;
    const comet = on && behind < 0.14 ? (1 - behind / 0.14) * 8 : 0;
    const undulate = on ? Math.sin(wave + index * 0.5) * amp : 0;
    const length = (on ? 24 : 21) + comet + undulate;
    const angle = ((START + step * SWEEP) * Math.PI) / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
      key: index,
      x1: CX + cos * R,
      y1: CY + sin * R,
      x2: CX + cos * (R + length),
      y2: CY + sin * (R + length),
      on,
      opacity: on ? 0.42 + (1 - clamp(behind, 0, 1)) * 0.58 : 1,
    };
  });

  return (
    <Fit width={250} height={250}>
      <div className="hum" data-state={stateFor(display)}>
        <div className="hum-dial">
          <svg
            ref={svg}
            className="hwheel"
            viewBox="0 0 200 200"
            data-dragging={dragging}
            role="slider"
            tabIndex={0}
            aria-label="Kelembapan"
            aria-valuenow={Math.round(display)}
            aria-valuemin={0}
            aria-valuemax={100}
            onPointerDown={(event) => {
              setDragging(true);
              event.currentTarget.setPointerCapture(event.pointerId);
              fromPointer(event);
            }}
            onPointerMove={(event) => dragging && fromPointer(event)}
            onPointerUp={() => setDragging(false)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight" || event.key === "ArrowUp") setTarget((value) => clamp(value + 2, 0, 100));
              if (event.key === "ArrowLeft" || event.key === "ArrowDown") setTarget((value) => clamp(value - 2, 0, 100));
            }}
          >
            {band.map((tick) => (
              <line
                key={tick.key}
                x1={tick.x1}
                y1={tick.y1}
                x2={tick.x2}
                y2={tick.y2}
                style={{ stroke: tick.on ? "var(--hum-lit)" : "currentColor" }}
                strokeOpacity={tick.on ? tick.opacity : 0.24}
                strokeWidth={2}
                strokeLinecap="round"
              />
            ))}
          </svg>
          <div className="hwheel-readout">
            <span className="hum-figure">{Math.round(display)}</span>
            <span className="hum-unit">%</span>
          </div>
        </div>
      </div>
    </Fit>
  );
}
