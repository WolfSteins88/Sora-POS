"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Fit } from "./Fit";

const PX = 4.2;

function stillness() {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

function wrap(minute: number) {
  return ((minute % 1440) + 1440) % 1440;
}

function face(minute: number) {
  const value = wrap(minute);
  const hour24 = Math.floor(value / 60);
  const mins = Math.floor(value % 60);
  const suffix = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return {
    hour: String(hour12),
    minute: String(mins).padStart(2, "0"),
    suffix,
    hour24,
    value,
  };
}

function hourLabel(hour24: number) {
  const suffix = hour24 >= 12 ? "PM" : "AM";
  const hour = ((hour24 % 24) + 24) % 24;
  return `${hour % 12 || 12} ${suffix}`;
}

const TENS = ["0", "1", "2", "3", "4", "5"];
const ONES = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

function Roll({ value, items }: { value: string; items: string[] }) {
  const index = Math.max(0, items.indexOf(value));
  return (
    <span className="tms-col" style={{ width: "0.62em", textAlign: "center" }}>
      <span className="tms-strip" style={{ transform: `translateY(${-index}em)` }}>
        {items.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </span>
    </span>
  );
}

function witaMinutes(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Makassar",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return pick("hour") * 60 + pick("minute");
}

export function TimeScrubber() {
  const [minute, setMinute] = useState(15 * 60 + 30);
  const minuteRef = useRef(minute);
  const drag = useRef<{ x: number; minute: number; lastX: number; lastT: number; vx: number } | null>(null);
  const coast = useRef(0);
  const shown = face(minute);
  const ticks = [];
  const start = Math.floor(shown.value - 90);
  for (let at = start; at <= shown.value + 90; at += 1) {
    const kind = at % 60 === 0 ? "hour" : at % 15 === 0 ? "quarter" : "minute";
    ticks.push({ at, kind, left: (at - shown.value) * PX });
  }

  useEffect(() => {
    const next = witaMinutes();
    minuteRef.current = next;
    setMinute(next);
  }, []);

  useEffect(() => {
    minuteRef.current = minute;
  }, [minute]);

  useEffect(() => () => cancelAnimationFrame(coast.current), []);

  function glide(velocity: number) {
    cancelAnimationFrame(coast.current);
    if (stillness() || Math.abs(velocity) < 0.04) return;
    let speed = velocity;
    const step = () => {
      speed *= 0.92;
      const next = minuteRef.current + speed;
      minuteRef.current = next;
      setMinute(next);
      if (Math.abs(speed) > 0.04) coast.current = requestAnimationFrame(step);
    };
    coast.current = requestAnimationFrame(step);
  }

  function scrub(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    if (!current) return;
    const dt = Math.max(8, event.timeStamp - current.lastT);
    current.vx = (current.vx + (event.clientX - current.lastX) / dt) / 2;
    current.lastX = event.clientX;
    current.lastT = event.timeStamp;
    const next = current.minute - (event.clientX - current.x) / PX;
    minuteRef.current = next;
    setMinute(next);
  }

  return (
    <Fit width={280} height={150}>
      <div className="tms">
        <p className="tms-read">
          <span className="tms-time">
            {shown.hour.length > 1 ? <Roll value={shown.hour[0]} items={["1"]} /> : null}
            <Roll value={shown.hour.slice(-1)} items={ONES} />
            <span>:</span>
            <Roll value={shown.minute[0]} items={TENS} />
            <Roll value={shown.minute[1]} items={ONES} />
          </span>
          <span className="tms-mer">{shown.suffix}</span>
        </p>
        <div
          className="tms-ruler"
          role="slider"
          tabIndex={0}
          aria-label="Geser waktu"
          aria-valuemin={0}
          aria-valuemax={1439}
          aria-valuenow={Math.round(shown.value)}
          onPointerDown={(event) => {
            cancelAnimationFrame(coast.current);
            event.currentTarget.setPointerCapture(event.pointerId);
            drag.current = { x: event.clientX, minute: minuteRef.current, lastX: event.clientX, lastT: event.timeStamp, vx: 0 };
          }}
          onPointerMove={scrub}
          onPointerUp={() => {
            const current = drag.current;
            drag.current = null;
            if (!current) return;
            glide((-current.vx * 16) / PX);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") setMinute((value) => value + 1);
            if (event.key === "ArrowLeft") setMinute((value) => value - 1);
          }}
        >
          <div className="tms-track">
            {ticks.map((tick) => (
              <span key={tick.at}>
                <span className="tms-tick" data-kind={tick.kind === "minute" ? undefined : tick.kind} style={{ left: tick.left }} />
                {tick.kind === "hour" ? (
                  <span className="tms-hour" style={{ left: tick.left, transform: "translateX(-50%)" }}>
                    {hourLabel(Math.floor(tick.at / 60))}
                  </span>
                ) : null}
              </span>
            ))}
          </div>
          <span className="tms-mark" />
        </div>
      </div>
    </Fit>
  );
}
