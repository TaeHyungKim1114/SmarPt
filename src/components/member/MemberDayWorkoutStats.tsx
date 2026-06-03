"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { WorkoutCompletionCard } from "@/components/workout/WorkoutCompletionCard";
import {
  calculateTotalVolumeKg,
  parseWorkoutDurationSec,
} from "@/lib/workout-stats";
import type { WorkoutSet } from "@/lib/types";

type MemberDayWorkoutStatsProps = {
  memberId: string;
  date: string;
  refreshKey?: number;
};

export function MemberDayWorkoutStats({
  memberId,
  date,
  refreshKey = 0,
}: MemberDayWorkoutStatsProps) {
  const supabase = createClient();
  const [workoutSec, setWorkoutSec] = useState(0);
  const [volumeKg, setVolumeKg] = useState(0);
  const [hasWorkout, setHasWorkout] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: workout } = await supabase
      .from("workouts")
      .select("id, notes")
      .eq("member_id", memberId)
      .eq("workout_date", date)
      .maybeSingle();

    if (!workout) {
      setHasWorkout(false);
      setWorkoutSec(0);
      setVolumeKg(0);
      setLoading(false);
      return;
    }

    setHasWorkout(true);

    setWorkoutSec(parseWorkoutDurationSec(workout.notes));

    const { data: exRows } = await supabase
      .from("workout_exercises")
      .select("sets")
      .eq("workout_id", workout.id);

    const exercises = (exRows ?? []).map((r) => ({
      sets: (r.sets as WorkoutSet[]) ?? [],
    }));

    if (exercises.length > 0) {
      setVolumeKg(calculateTotalVolumeKg(exercises));
    } else {
      const { data: legacy } = await supabase
        .from("exercises")
        .select("weight_kg, reps")
        .eq("user_id", memberId)
        .eq("exercise_date", date);

      let vol = 0;
      for (const row of legacy ?? []) {
        vol += (Number(row.weight_kg) || 0) * (Number(row.reps) || 0);
      }
      setVolumeKg(Math.round(vol));
    }

    setLoading(false);
  }, [supabase, memberId, date]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  if (loading || !hasWorkout) return null;

  return (
    <div className="mt-3">
      <WorkoutCompletionCard workoutSec={workoutSec} volumeKg={volumeKg} />
    </div>
  );
}
