"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Fit } from "./Fit";

const CARD_W = 168;
const CARD_H = 228;
const STAGE_W = 420;
const STAGE_H = 280;
const ORBIT = 118;
const DEPTH = 100;
const LEAN = 32;
const PULL = 140;
const TOSS = 150;
const ANGLE = [-4.2, 2.6, -1.4, 3.8, 1.7];
const PERIOD = [4.7, 5.9, 6.7, 5.3, 7.1, 6.1];

function stillness() {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

function clamp(value: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, value));
}

const SHOTS = [
  { name: "S'mores Iced Latte", image: "/relaxing/smores-latte.jpg" },
  { name: "Chocolate Milk", image: "/relaxing/chocolate-milk.jpg" },
  { name: "Chicken Mayo Sandwich", image: "/relaxing/chicken-sandwich.jpg" },
  { name: "Banana Cake", image: "/relaxing/banana-cake.png" },
  { name: "Cappuccino", image: "/relaxing/cappuccino.jpg" },
  { name: "Croissant", image: "/relaxing/croissant.jpg" },
  { name: "Beef Burger", image: "/relaxing/beef-burger.jpg" },
  { name: "Thai Tea", image: "/relaxing/thai-tea.jpg" },
  { name: "Lemon Tea", image: "/relaxing/lemon-tea.jpg" },
  { name: "Americano", image: "/relaxing/americano.jpg" },
  { name: "Matcha Latte", image: "/relaxing/matcha-latte.jpg" },
  { name: "Espresso", image: "/relaxing/espresso.jpg" },
];

export function MenuCarousel({ menu: _menu }: { menu: { name: string; image: string | null }[] }) {
  const shots = SHOTS;
  const count = shots.length;
  const slots = useRef<(HTMLDivElement | null)[]>([]);
  const turn = useRef(0);
  const frame = useRef(0);
  const drag = useRef<{ x0: number; t0: number; last: number; t: number; vx: number } | null>(null);
  const [held, setHeld] = useState(false);
  const still = stillness();

  const paint = useCallback(() => {
    slots.current.forEach((el, index) => {
      if (!el) return;
      const theta = (index - turn.current) * ((Math.PI * 2) / count);
      const front = (Math.cos(theta) + 1) / 2;
      const x = Math.sin(theta) * ORBIT;
      const y = -(1 - front) * LEAN;
      const scale = (1 - DEPTH / 200) + (DEPTH / 200) * front;
      el.style.transform = `translate(-50%, -50%) translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${ANGLE[index % ANGLE.length]}deg) scale(${scale.toFixed(4)})`;
      el.style.zIndex = String(Math.round(front * 100));
    });
  }, [count]);

  useLayoutEffect(() => {
    paint();
  }, [paint, shots.length]);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  function glide(to: number) {
    cancelAnimationFrame(frame.current);
    const from = turn.current;
    if (still || from === to) {
      turn.current = to;
      paint();
      return;
    }
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / 420);
      const eased = 1 - (1 - progress) ** 4;
      turn.current = from + (to - from) * eased;
      paint();
      if (progress < 1) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
  }

  return (
    <Fit width={STAGE_W} height={STAGE_H}>
      <div className="relative" style={{ width: STAGE_W, height: STAGE_H }}>
        <div
          className="car-track"
          data-held={held}
          role="group"
          aria-label="Menu"
          tabIndex={0}
          onPointerDown={(event) => {
            cancelAnimationFrame(frame.current);
            drag.current = { x0: event.clientX, t0: turn.current, last: event.clientX, t: event.timeStamp, vx: 0 };
            setHeld(true);
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            const current = drag.current;
            if (!current) return;
            const dt = Math.max(1, event.timeStamp - current.t);
            current.vx = (current.vx + (event.clientX - current.last) / dt) / 2;
            current.last = event.clientX;
            current.t = event.timeStamp;
            turn.current = current.t0 - (event.clientX - current.x0) / PULL;
            paint();
          }}
          onPointerUp={() => {
            const current = drag.current;
            if (!current) return;
            drag.current = null;
            setHeld(false);
            const carry = clamp((-current.vx * TOSS) / PULL, -2, 2);
            glide(Math.round(turn.current + carry));
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") glide(Math.round(turn.current) + 1);
            if (event.key === "ArrowLeft") glide(Math.round(turn.current) - 1);
          }}
        >
          {shots.map((shot, index) => (
              <div key={shot.image} ref={(el) => { slots.current[index] = el; }} className="car-slot" style={{ width: CARD_W, height: CARD_H }}>
                <div
                  className="car-float"
                  style={{
                    animationDuration: `${PERIOD[index % PERIOD.length]}s`,
                    ["--lift" as string]: "2.4px",
                    ["--sway" as string]: "0.21deg",
                  }}
                >
                  <div
                    className="car-card"
                    style={{
                      borderRadius: 18,
                      backgroundImage: `url(${shot.image})`,
                      boxShadow: "0 12px 28px -10px rgba(23, 24, 26, 0.28)",
                    }}
                    role="img"
                    aria-label={shot.name}
                  />
                </div>
              </div>
            ))}
        </div>
      </div>
    </Fit>
  );
}
