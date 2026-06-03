import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkoutSet } from "@/lib/types";
import { parseWorkoutDurationSec } from "@/lib/workout-stats";
import { MEAL_LABELS } from "@/lib/utils";

export type ExerciseRow = {
  id: string;
  exercise_name: string;
  set_number: number;
  weight_kg: number | null;
  reps: number | null;
};

export type MealRow = {
  id: string;
  meal_type: string;
  foods: string;
  calories: number | null;
  photo_url: string | null;
};

export type WorkoutSummary = {
  exerciseCount: number;
  setCount: number;
  totalVolumeKg: number;
  workoutDurationSec: number;
  exercises: { name: string; sets: { weight: number; reps: number; volume: number }[] }[];
};

export type MealSummary = {
  items: {
    meal_type: string;
    label: string;
    foods: string;
    calories: number | null;
    photo_url: string | null;
  }[];
};

export type DailyReportRecord = {
  id: string;
  trainer_memo: string | null;
  trainer_workout_memo: string | null;
  trainer_diet_memo: string | null;
  total_workout_volume_kg: number;
  exercise_count: number;
  meals_logged: number;
  updated_at: string;
};

export type TrainerFeedbackMemos = {
  workout: string | null;
  diet: string | null;
};

/** DB 레코드 → 운동/식단 피드백 (구버전 trainer_memo 호환) */
export function parseTrainerFeedback(
  report: Pick<
    DailyReportRecord,
    "trainer_memo" | "trainer_workout_memo" | "trainer_diet_memo"
  > | null
): TrainerFeedbackMemos {
  if (!report) return { workout: null, diet: null };

  const workout =
    report.trainer_workout_memo?.trim() ||
    (report.trainer_diet_memo?.trim() ? null : report.trainer_memo?.trim()) ||
    null;
  const diet = report.trainer_diet_memo?.trim() || null;

  return {
    workout: workout || null,
    diet: diet || null,
  };
}

export type DaySummary = {
  memberId: string;
  reportDate: string;
  workout: WorkoutSummary;
  meals: MealSummary;
  dailyReport: DailyReportRecord | null;
};

function buildWorkoutFromExercises(rows: ExerciseRow[]): WorkoutSummary {
  const byName = new Map<string, { weight: number; reps: number; volume: number }[]>();

  for (const row of rows) {
    const w = Number(row.weight_kg) || 0;
    const r = Number(row.reps) || 0;
    const list = byName.get(row.exercise_name) ?? [];
    list.push({ weight: w, reps: r, volume: w * r });
    byName.set(row.exercise_name, list);
  }

  const exercises = Array.from(byName.entries()).map(([name, sets]) => ({
    name,
    sets,
  }));

  const setCount = rows.length;
  const totalVolumeKg = rows.reduce(
    (sum, r) => sum + (Number(r.weight_kg) || 0) * (Number(r.reps) || 0),
    0
  );

  return {
    exerciseCount: exercises.length,
    setCount,
    totalVolumeKg: Math.round(totalVolumeKg),
    workoutDurationSec: 0,
    exercises,
  };
}

const emptyWorkoutSummary = (): WorkoutSummary => ({
  exerciseCount: 0,
  setCount: 0,
  totalVolumeKg: 0,
  workoutDurationSec: 0,
  exercises: [],
});

async function loadFromLegacyWorkout(
  supabase: SupabaseClient,
  memberId: string,
  date: string
): Promise<WorkoutSummary | null> {
  const { data: workout } = await supabase
    .from("workouts")
    .select("id, notes")
    .eq("member_id", memberId)
    .eq("workout_date", date)
    .maybeSingle();

  if (!workout) return null;

  const { data: we } = await supabase
    .from("workout_exercises")
    .select("name, sets")
    .eq("workout_id", workout.id);

  const rows: ExerciseRow[] = [];
  for (const ex of we ?? []) {
    const sets = (ex.sets as WorkoutSet[]) ?? [];
    sets.forEach((s, i) => {
      rows.push({
        id: `${ex.name}-${i}`,
        exercise_name: ex.name,
        set_number: i + 1,
        weight_kg: s.weight,
        reps: s.reps,
      });
    });
  }

  if (rows.length === 0) return null;
  const summary = buildWorkoutFromExercises(rows);
  summary.workoutDurationSec = parseWorkoutDurationSec(workout.notes);
  return summary;
}

async function loadMealsFromLegacy(
  supabase: SupabaseClient,
  memberId: string,
  date: string
): Promise<MealSummary | null> {
  const { data: log } = await supabase
    .from("diet_logs")
    .select("meals")
    .eq("member_id", memberId)
    .eq("log_date", date)
    .maybeSingle();

  if (!log?.meals || !Array.isArray(log.meals)) return null;

  const items = log.meals
    .filter(
      (m: { foods?: string; photo_url?: string }) =>
        String(m.foods ?? "").trim() || m.photo_url
    )
    .map(
      (m: {
        meal_type: string;
        foods?: string;
        calories?: number | null;
        photo_url?: string | null;
      }) => ({
        meal_type: m.meal_type,
        label: MEAL_LABELS[m.meal_type] ?? m.meal_type,
        foods: m.foods ?? "",
        calories: m.calories ?? null,
        photo_url: m.photo_url ?? null,
      })
    );

  if (items.length === 0) return null;
  return { items };
}

export async function fetchDaySummary(
  supabase: SupabaseClient,
  memberId: string,
  reportDate: string
): Promise<DaySummary> {
  const [exRes, mealRes, reportRes] = await Promise.all([
    supabase
      .from("exercises")
      .select("id, exercise_name, set_number, weight_kg, reps")
      .eq("user_id", memberId)
      .eq("exercise_date", reportDate)
      .order("exercise_name", { ascending: true })
      .order("set_number", { ascending: true }),
    supabase
      .from("meals")
      .select("id, meal_type, foods, calories, photo_url")
      .eq("user_id", memberId)
      .eq("meal_date", reportDate)
      .order("meal_type"),
    supabase
      .from("daily_reports")
      .select(
        "id, trainer_memo, trainer_workout_memo, trainer_diet_memo, total_workout_volume_kg, exercise_count, meals_logged, updated_at"
      )
      .eq("member_id", memberId)
      .eq("report_date", reportDate)
      .maybeSingle(),
  ]);

  let workout =
    (exRes.data?.length ?? 0) > 0
      ? buildWorkoutFromExercises(exRes.data as ExerciseRow[])
      : emptyWorkoutSummary();

  const { data: workoutNotesRow } = await supabase
    .from("workouts")
    .select("notes")
    .eq("member_id", memberId)
    .eq("workout_date", reportDate)
    .maybeSingle();

  if (workoutNotesRow?.notes) {
    workout.workoutDurationSec = parseWorkoutDurationSec(workoutNotesRow.notes);
  }

  if (workout.setCount === 0) {
    const legacy = await loadFromLegacyWorkout(supabase, memberId, reportDate);
    if (legacy) workout = legacy;
  }

  let meals: MealSummary = { items: [] };
  if (mealRes.data && mealRes.data.length > 0) {
    meals = {
      items: (mealRes.data as MealRow[]).map((m) => ({
        meal_type: m.meal_type,
        label: MEAL_LABELS[m.meal_type] ?? m.meal_type,
        foods: m.foods,
        calories: m.calories,
        photo_url: m.photo_url,
      })),
    };
  } else {
    const legacyMeals = await loadMealsFromLegacy(supabase, memberId, reportDate);
    if (legacyMeals) meals = legacyMeals;
  }

  return {
    memberId,
    reportDate,
    workout,
    meals,
    dailyReport: reportRes.data as DailyReportRecord | null,
  };
}

export async function saveTrainerFeedback(
  supabase: SupabaseClient,
  params: {
    memberId: string;
    trainerId: string;
    reportDate: string;
    workoutMemo: string;
    dietMemo: string;
    summary: DaySummary;
  }
) {
  const { memberId, trainerId, reportDate, workoutMemo, dietMemo, summary } =
    params;

  const workout = workoutMemo.trim();
  const diet = dietMemo.trim();

  const payload = {
    member_id: memberId,
    trainer_id: trainerId,
    report_date: reportDate,
    trainer_workout_memo: workout || null,
    trainer_diet_memo: diet || null,
    trainer_memo: null,
    total_workout_volume_kg: summary.workout.totalVolumeKg,
    exercise_count: summary.workout.exerciseCount,
    meals_logged: summary.meals.items.length,
    stats: {
      set_count: summary.workout.setCount,
      saved_by: "trainer_feedback",
      saved_at: new Date().toISOString(),
    },
    generated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("daily_reports")
    .upsert(payload, { onConflict: "member_id,report_date" })
    .select()
    .single();

  if (error) throw error;
  return data;
}
