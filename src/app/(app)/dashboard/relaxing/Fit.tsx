"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export function Fit({ width, height, children }: { width: number; height: number; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const read = () => {
      const rect = el.getBoundingClientRect();
      const next = Math.min(rect.width / width, rect.height / height);
      setScale(Number.isFinite(next) && next > 0 ? next : 1);
    };
    read();
    const observer = new ResizeObserver(read);
    observer.observe(el);
    return () => observer.disconnect();
  }, [width, height]);

  return (
    <div ref={box} className="bn-fit">
      <div className="bn-stage" style={{ width, height, transform: `translate(-50%, -50%) scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
}
