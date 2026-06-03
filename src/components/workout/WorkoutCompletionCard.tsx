"use client";

import { PartyPopper } from "lucide-react";
import {
  formatVolumeKg,
  formatWorkoutDurationLabel,
} from "@/lib/workout-stats";

type WorkoutCompletionCardProps = {
  workoutSec: number;
  volumeKg: number;
  compact?: boolean;
};

export function WorkoutCompletionCard({
  workoutSec,
  volumeKg,
  compact = false,
}: WorkoutCompletionCardProps) {
  return (
    <div
      className={`rounded-2xl border-2 border-lime-200 bg-gradient-to-br from-lime-50 to-white ${
        compact ? "p-4" : "p-5"
      }`}
    >
      <div className="mb-3 flex items-center gap-2">
        <PartyPopper className="h-5 w-5 text-lime-600" />
        <p className="text-lg font-bold text-lime-900">수고하셨습니다!</p>
      </div>
      <div className={`grid grid-cols-2 gap-2 ${compact ? "text-sm" : ""}`}>
        <div className="rounded-xl bg-white/80 px-3 py-2.5 text-center ring-1 ring-lime-100">
          <p className="text-[10px] font-semibold tracking-wide text-gray-400 uppercase">
            운동시간
          </p>
          <p className="mt-0.5 font-mono text-base font-bold text-lime-800 tabular-nums">
            {formatWorkoutDurationLabel(workoutSec)}
          </p>
        </div>
        <div className="rounded-xl bg-white/80 px-3 py-2.5 text-center ring-1 ring-lime-100">
          <p className="text-[10px] font-semibold tracking-wide text-gray-400 uppercase">
            총 볼륨
          </p>
          <p className="mt-0.5 font-mono text-base font-bold text-lime-800 tabular-nums">
            {formatVolumeKg(volumeKg)}kg
          </p>
        </div>
      </div>
    </div>
  );
}
