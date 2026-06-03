"use client";

import { useState } from "react";
import { Menu, Pause, Play, RotateCcw, Timer } from "lucide-react";
import { formatTimer } from "@/lib/workout-session";

type WorkoutStopwatchesProps = {
  workoutSec: number;
  workoutRunning: boolean;
  restSec: number;
  restRunning: boolean;
  onToggleWorkout: () => void;
  onResetWorkout: () => void;
  onToggleRest: () => void;
  onResetRest: () => void;
};

function TimerBlock({
  label,
  icon: Icon,
  seconds,
  running,
  accent,
  onToggle,
  onReset,
}: {
  label: string;
  icon: typeof Timer;
  seconds: number;
  running: boolean;
  accent: "lime" | "emerald";
  onToggle: () => void;
  onReset: () => void;
}) {
  const ring =
    accent === "lime"
      ? "border-lime-200 bg-lime-50"
      : "border-emerald-200 bg-emerald-50";
  const timeColor = accent === "lime" ? "text-lime-700" : "text-emerald-700";
  const btn = accent === "lime" ? "bg-lime-600" : "bg-emerald-600";

  return (
    <div className={`flex-1 rounded-2xl border p-3 ${ring}`}>
      <div className="mb-1 flex items-center gap-1.5">
        <Icon className={`h-3.5 w-3.5 ${timeColor}`} />
        <span className={`text-[11px] font-semibold ${timeColor}`}>{label}</span>
        {running && (
          <span className="ml-auto h-2 w-2 animate-pulse rounded-full bg-red-500" />
        )}
      </div>
      <p className={`font-mono text-2xl font-black tabular-nums ${timeColor}`}>
        {formatTimer(seconds)}
      </p>
      <div className="mt-2 flex gap-1.5">
        <button
          type="button"
          onClick={onToggle}
          className={`flex flex-1 items-center justify-center gap-1 rounded-xl py-2 text-xs font-bold text-white ${btn}`}
        >
          {running ? (
            <>
              <Pause className="h-3.5 w-3.5" /> 일시정지
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5" /> {seconds > 0 ? "재개" : "시작"}
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onReset}
          className="rounded-xl border border-gray-200 bg-white px-2.5 py-2 text-gray-500 hover:bg-gray-50"
          aria-label="리셋"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function WorkoutStopwatches({
  workoutSec,
  workoutRunning,
  restSec,
  restRunning,
  onToggleWorkout,
  onResetWorkout,
  onToggleRest,
  onResetRest,
}: WorkoutStopwatchesProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="fixed bottom-[4.5rem] left-0 right-0 z-40 mx-auto max-w-lg px-4">
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white/95 shadow-lg backdrop-blur">
        <div className="flex items-center gap-2 px-3 py-2">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            aria-label={expanded ? "타이머 접기" : "타이머 펼치기"}
            aria-expanded={expanded}
          >
            <Menu
              className={`h-4 w-4 transition-transform duration-300 ${
                expanded ? "rotate-90" : ""
              }`}
            />
          </button>
          <p className="flex-1 text-center text-[10px] font-semibold tracking-wide text-gray-400 uppercase">
            운동 · 휴식 타이머
          </p>
          {!expanded && (
            <span className="font-mono text-xs font-bold text-lime-700 tabular-nums">
              {formatTimer(workoutSec)}
            </span>
          )}
        </div>

        <div
          className={`grid transition-[grid-template-rows] duration-300 ease-out ${
            expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="overflow-hidden">
            <div className="px-3 pb-3">
              <div className="flex gap-2">
                <TimerBlock
                  label="운동 시간"
                  icon={Timer}
                  seconds={workoutSec}
                  running={workoutRunning}
                  accent="lime"
                  onToggle={onToggleWorkout}
                  onReset={onResetWorkout}
                />
                <TimerBlock
                  label="휴식 시간"
                  icon={Timer}
                  seconds={restSec}
                  running={restRunning}
                  accent="emerald"
                  onToggle={onToggleRest}
                  onReset={onResetRest}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
