"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

function formatWita(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Makassar",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "00";
  return `${pick("hour")}.${pick("minute")}.${pick("second")}`;
}

export function WitaClock() {
  const [now, setNow] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => setNow(formatWita(new Date()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <span className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface px-3 text-sm shadow-card tabular-nums">
      <Clock size={16} aria-hidden />
      <span className="sr-only">Waktu WITA </span>
      {now ?? "--.--.--"}
    </span>
  );
}
