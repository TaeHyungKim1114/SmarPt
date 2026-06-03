import type { SupabaseClient } from "@supabase/supabase-js";
import type { MealEntry, WorkoutSet } from "@/lib/types";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;

export async function syncExercisesFromWorkout(
  supabase: SupabaseClient,
  memberId: string,
  date: string,
  workoutId: string
) {
  const { data: workoutExercises } = await supabase
    .from("workout_exercises")
    .select("id, name, sets")
    .eq("workout_id", workoutId);

  await supabase
    .from("exercises")
    .delete()
    .eq("user_id", memberId)
    .eq("exercise_date", date);

  const rows: {
    user_id: string;
    exercise_date: string;
    exercise_name: string;
    set_number: number;
    weight_kg: number | null;
    reps: number | null;
    source_workout_exercise_id: string;
  }[] = [];

  for (const ex of workoutExercises ?? []) {
    const sets = (ex.sets as WorkoutSet[]) ?? [];
    sets.forEach((set, idx) => {
      if (!ex.name?.trim()) return;
      rows.push({
        user_id: memberId,
        exercise_date: date,
        exercise_name: ex.name.trim(),
        set_number: idx + 1,
        weight_kg: set.weight ?? null,
        reps: set.reps ?? null,
        source_workout_exercise_id: ex.id,
      });
    });
  }

  if (rows.length > 0) {
    await supabase.from("exercises").insert(rows);
  }
}

export type MealWithPhoto = MealEntry & { photo_url?: string | null };

export async function syncMealsFromDiet(
  supabase: SupabaseClient,
  memberId: string,
  date: string,
  meals: MealWithPhoto[]
): Promise<{ ok: boolean; error?: string }> {
  const { error: delError } = await supabase
    .from("meals")
    .delete()
    .eq("user_id", memberId)
    .eq("meal_date", date);

  if (delError) {
    if (delError.code === "42P01" || delError.message.includes("does not exist")) {
      return { ok: false, error: "meals_table_missing" };
    }
    return { ok: false, error: delError.message };
  }

  const rows = meals
    .filter((m) => m.foods.trim() || m.photo_url)
    .map((m) => ({
      user_id: memberId,
      meal_date: date,
      meal_type: m.meal_type,
      foods: m.foods.trim(),
      calories: m.calories ?? null,
      photo_url: m.photo_url ?? null,
    }));

  if (rows.length === 0) return { ok: true };

  const { error: insError } = await supabase.from("meals").insert(rows);
  if (insError) return { ok: false, error: insError.message };
  return { ok: true };
}

export async function uploadMealPhoto(
  supabase: SupabaseClient,
  memberId: string,
  date: string,
  mealType: string,
  file: File
): Promise<string | null> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${memberId}/${date}/${mealType}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from("meal-photos").upload(path, file, {
    cacheControl: "3600",
    upsert: true,
  });

  if (error) {
    console.error("meal photo upload", error);
    return null;
  }

  const { data } = supabase.storage.from("meal-photos").getPublicUrl(path);
  return data.publicUrl;
}

export { MEAL_TYPES };
