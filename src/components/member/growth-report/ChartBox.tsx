"use client";

import {
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type ReactElement,
} from "react";

type ChartBoxProps = {
  height: number;
  children: ReactElement;
};

/** 부모 너비를 측정한 뒤 차트에 고정 px 크기를 넘깁니다 (ResponsiveContainer -1 경고 방지). */
export function ChartBox({ height, children }: ChartBoxProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const next = Math.floor(el.getBoundingClientRect().width);
      setWidth((prev) => (prev === next ? prev : next));
    };

    update();

    const ro = new ResizeObserver(() => {
      requestAnimationFrame(update);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [height]);

  return (
    <div
      ref={ref}
      className="w-full min-w-0 overflow-hidden"
      style={{ height, minHeight: height }}
    >
      {width > 0 && isValidElement(children)
        ? cloneElement(children, { width, height })
        : null}
    </div>
  );
}
