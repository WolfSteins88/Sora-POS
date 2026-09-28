"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { animate, motion, useMotionValue, useSpring, useTransform, useVelocity } from "framer-motion";

const TRACK = 92;
const THUMB = 36;
const PAD = (46 - THUMB) / 2;
const SHUT_X = PAD;
const OPEN_X = TRACK - THUMB - PAD;
const MID_X = (SHUT_X + OPEN_X) / 2;

function clamp(value: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, value));
}

function stillness() {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export function LiquidToggle({
  checked,
  onCheckedChange,
  label = "Ganti ke pengingat stok",
  stretch = 36,
  speed = 50,
}: {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  label?: string;
  stretch?: number;
  speed?: number;
}) {
  const still = stillness();
  const [held, setHeld] = useState(false);
  const [hot, setHot] = useState(false);
  const rail = useRef<HTMLButtonElement | null>(null);
  const grip = useRef<{ id: number; grab: number | null; moved: boolean } | null>(null);
  const x = useMotionValue(checked ? OPEN_X : SHUT_X);
  const vel = useVelocity(x);
  const eased = useSpring(vel, { stiffness: 320, damping: 40, mass: 0.6 });
  const lengthen = (velocity: number) =>
    still ? 1 : 1 + Math.min(0.4, Math.abs(velocity) / 600) * (clamp(stretch, 0, 100) / 100);
  const swell = useSpring(hot && !still ? 1.035 : 1, { stiffness: 520, damping: 34, mass: 0.6 });
  const wide = useTransform([eased, swell], ([velocity, scale]: number[]) => lengthen(velocity) * scale);
  const tall = useTransform([eased, swell], ([velocity, scale]: number[]) => scale / lengthen(velocity));
  const settle = useMemo(
    () =>
      still
        ? { duration: 0 }
        : {
            type: "spring" as const,
            stiffness: 170 - (50 - speed) * 1.1,
            damping: 21.5,
            mass: 0.9,
          },
    [speed, still],
  );

  useEffect(() => {
    if (held) return;
    const run = animate(x, checked ? OPEN_X : SHUT_X, settle);
    return () => run.stop();
  }, [checked, held, x, settle]);

  function local(clientX: number) {
    const el = rail.current;
    if (!el) return 0;
    const box = el.getBoundingClientRect();
    const scale = box.width / (el.offsetWidth || box.width) || 1;
    return (clientX - box.left) / scale;
  }

  function down(event: PointerEvent<HTMLButtonElement>) {
    grip.current = { id: event.pointerId, grab: null, moved: false };
    setHeld(true);
    try {
      rail.current?.setPointerCapture(event.pointerId);
    } catch {
      /* synthetic pointer */
    }
  }

  function move(event: PointerEvent<HTMLButtonElement>) {
    const current = grip.current;
    if (!current || current.id !== event.pointerId) return;
    const at = local(event.clientX);
    if (current.grab === null) current.grab = at - x.get();
    const next = clamp(at - current.grab, SHUT_X, OPEN_X);
    if (Math.abs(next - x.get()) > 0.4) current.moved = true;
    x.set(next);
    const past = next > MID_X;
    if (past !== checked) onCheckedChange(past);
  }

  function up(event: PointerEvent<HTMLButtonElement>) {
    const current = grip.current;
    if (!current) return;
    grip.current = null;
    try {
      rail.current?.releasePointerCapture?.(event.pointerId);
    } catch {
      /* never captured */
    }
    if (!current.moved) onCheckedChange(!checked);
    setHeld(false);
  }

  return (
    <div className="liq-well" style={{ ["--liq-thumb" as string]: `${THUMB}px` }}>
      <button
        ref={rail}
        type="button"
        className="liq-sw"
        data-on={checked}
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onPointerEnter={() => setHot(true)}
        onPointerLeave={() => setHot(false)}
        onKeyDown={(event) => {
          if (event.key !== " " && event.key !== "Enter") return;
          event.preventDefault();
          onCheckedChange(!checked);
        }}
      >
        <span className="liq-sw-blobs" aria-hidden>
          <motion.span className="liq-thumb" style={{ x, scaleX: wide, scaleY: tall }} />
        </span>
      </button>
    </div>
  );
}
