import type { WorkoutSet } from "@/lib/types";
import {
  formatTimer,
  parseWorkoutDurationSec,
  parseRestDurationSec,
} from "@/lib/workout-session";

export { parseWorkoutDurationSec, parseRestDurationSec };

type ExerciseLike = {
  sets: WorkoutSet[];
};

export function calculateTotalVolumeKg(exercises: ExerciseLike[]): number {
  let total = 0;
  for (const ex of exercises) {
    for (const set of ex.sets) {
      const w = Number(set.weight) || 0;
      const r = Number(set.reps) || 0;
      total += w * r;
    }
  }
  return Math.round(total);
}

export function formatVolumeKg(kg: number): string {
  return kg.toLocaleString("ko-KR");
}

export function formatWorkoutDurationLabel(sec: number): string {
  if (sec <= 0) return "-";
  return formatTimer(sec);
}
