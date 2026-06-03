import type { SupabaseClient } from "@supabase/supabase-js";
import type { MealEntry, WorkoutExercise, WorkoutSet } from "@/lib/types";
import { defaultMeals, mergeMealsFromLog } from "@/lib/diet-helpers";

export type PlanExercise = {
  name: string;
  sets: WorkoutSet[];
  memo?: string;
};

export type WorkoutPlan = {
  member_id: string;
  trainer_id: string | null;
  exercises: PlanExercise[];
  notes: string | null;
  updated_at: string;
};

export type DietPlan = {
  member_id: string;
  trainer_id: string | null;
  meals: MealEntry[];
  notes: string | null;
  updated_at: string;
};

function parsePlanExercises(raw: unknown): PlanExercise[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const o = item as PlanExercise;
      if (!o.name?.trim()) return null;
      const sets = Array.isArray(o.sets) ? o.sets : [];
      return {
        name: o.name.trim(),
        sets: sets.map((s) => ({
          weight: s.weight ?? null,
          reps: s.reps ?? null,
          completed: s.completed ?? false,
        })),
        memo: o.memo ?? "",
      };
    })
    .filter(Boolean) as PlanExercise[];
}

export function planExercisesToInitial(exercises: PlanExercise[]): WorkoutExercise[] {
  return exercises.map((e, i) => ({
    id: `plan-${i}`,
    workout_id: "",
    name: e.name,
    sets: e.sets.length
      ? e.sets
      : [{ weight: null, reps: null, completed: false }],
    memo: e.memo ?? null,
    sort_order: i,
  }));
}

export async function fetchWorkoutPlan(
  supabase: SupabaseClient,
  memberId: string
): Promise<WorkoutPlan | null> {
  const { data, error } = await supabase
    .from("member_workout_plans")
    .select("member_id, trainer_id, exercises, notes, updated_at")
    .eq("member_id", memberId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    member_id: data.member_id,
    trainer_id: data.trainer_id,
    exercises: parsePlanExercises(data.exercises),
    notes: data.notes,
    updated_at: data.updated_at,
  };
}

export async function saveWorkoutPlan(
  supabase: SupabaseClient,
  params: {
    memberId: string;
    trainerId?: string | null;
    exercises: PlanExercise[];
    notes: string;
  }
) {
  const { memberId, trainerId, exercises, notes } = params;
  const payload = {
    member_id: memberId,
    trainer_id: trainerId ?? null,
    exercises: exercises.filter((e) => e.name.trim()),
    notes: notes.trim() || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("member_workout_plans")
    .upsert(payload, { onConflict: "member_id" });

  if (error) throw error;
}

export async function fetchDietPlan(
  supabase: SupabaseClient,
  memberId: string
): Promise<DietPlan | null> {
  const { data, error } = await supabase
    .from("member_diet_plans")
    .select("member_id, trainer_id, meals, notes, updated_at")
    .eq("member_id", memberId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    member_id: data.member_id,
    trainer_id: data.trainer_id,
    meals: mergeMealsFromLog(data.meals as MealEntry[]),
    notes: data.notes,
    updated_at: data.updated_at,
  };
}

export async function saveDietPlan(
  supabase: SupabaseClient,
  params: {
    memberId: string;
    trainerId?: string | null;
    meals: MealEntry[];
    notes: string;
  }
) {
  const { memberId, trainerId, meals, notes } = params;
  const payload = {
    member_id: memberId,
    trainer_id: trainerId ?? null,
    meals,
    notes: notes.trim() || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("member_diet_plans")
    .upsert(payload, { onConflict: "member_id" });

  if (error) throw error;
}

export function defaultPlanExercises(): PlanExercise[] {
  return [];
}

export function defaultPlanMeals(): MealEntry[] {
  return defaultMeals();
}
