"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Clock } from "lucide-react";
import { Fit } from "./Fit";

const COMPACT = { w: 132, h: 36, r: 18 };
const OPEN = { w: 300, h: 76, r: 38 };

function stillness() {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

function parts(date: Date) {
  const clock = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Makassar",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes) => clock.find((part) => part.type === type)?.value ?? "00";
  const day = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Makassar", weekday: "long" }).format(date);
  return { time: `${pick("hour")}:${pick("minute")}`, day };
}

export function ShopIsland() {
  const still = stillness();
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const spring = still ? { duration: 0 } : { type: "spring" as const, stiffness: 380, damping: 27.6, mass: 0.9 };
  const size = open ? OPEN : COMPACT;
  const face = now ? parts(now) : { time: "--:--", day: "Hari ini" };

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <Fit width={OPEN.w} height={150}>
      <div className="dyn-top" style={{ width: OPEN.w }}>
        <motion.button
          type="button"
          className="dyn-pill"
          aria-expanded={open}
          aria-label={open ? "Tutup jam WITA" : "Buka jam WITA"}
          onClick={() => setOpen((value) => !value)}
          initial={false}
          animate={{ width: size.w, height: size.h, borderRadius: size.r }}
          transition={spring}
          whileTap={still ? undefined : { scale: 0.97 }}
        >
          <span className="dyn-in">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={open ? "open" : "shut"}
                className={open ? "dyn-open" : "dyn-compact"}
                initial={{ opacity: 0, scale: 0.92, filter: "blur(6px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 0.92, filter: "blur(6px)" }}
                transition={{ duration: still ? 0 : 0.22, delay: still ? 0 : 0.06 }}
              >
                <span
                  className="dyn-round dyn-amber-bg"
                  aria-hidden
                  style={{ width: open ? 46 : 22, height: open ? 46 : 22 }}
                >
                  <Clock size={open ? 18 : 13} strokeWidth={2.4} />
                </span>
                {open ? (
                  <>
                    <span className="dyn-grow" />
                    <span className="dyn-label" style={{ textTransform: "capitalize" }}>
                      {face.day}
                    </span>
                    <span className="dyn-big dyn-amber">{face.time}</span>
                  </>
                ) : (
                  <span className="dyn-big dyn-amber" style={{ fontSize: 13 }}>
                    {face.time}
                  </span>
                )}
              </motion.span>
            </AnimatePresence>
          </span>
        </motion.button>
      </div>
    </Fit>
  );
}
