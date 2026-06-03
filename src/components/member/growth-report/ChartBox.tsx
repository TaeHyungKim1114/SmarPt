"use client";

import { useEffect, useRef, useState, type ReactElement } from "react";
import { ResponsiveContainer } from "recharts";

type ChartBoxProps = {
  height: number;
  children: ReactElement;
};

/** ResponsiveContainer는 부모 크기가 0일 때 경고가 납니다. 크기 확인 후 마운트합니다. */
export function ChartBox({ height, children }: ChartBoxProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const check = () => {
      const { width, height: h } = el.getBoundingClientRect();
      setReady(width > 0 && h > 0);
    };

    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [height]);

  return (
    <div
      ref={ref}
      className="w-full min-w-0"
      style={{ height, minHeight: height }}
    >
      {ready ? (
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          {children}
        </ResponsiveContainer>
      ) : null}
    </div>
  );
}
