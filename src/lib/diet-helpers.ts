import type { DietLog, MealEntry } from "@/lib/types";

const MEAL_TYPES: MealEntry["meal_type"][] = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
];

export function defaultMeals(): MealEntry[] {
  return MEAL_TYPES.map((meal_type) => ({
    meal_type,
    foods: "",
    calories: null,
    photo_url: null,
  }));
}

/** DB에서 불러온 meals를 아침/점심/저녁/간식 4칸으로 맞춤 */
export function mergeMealsFromLog(
  stored: MealEntry[] | null | undefined
): MealEntry[] {
  const base = defaultMeals();
  if (!stored?.length) return base;

  return base.map((slot) => {
    const found = stored.find((m) => m.meal_type === slot.meal_type);
    return found
      ? {
          meal_type: slot.meal_type,
          foods: found.foods ?? "",
          calories: found.calories ?? null,
          photo_url: found.photo_url ?? null,
        }
      : slot;
  });
}

export function hasDietLogContent(log: {
  meals?: unknown;
  notes?: string | null;
} | null | undefined): boolean {
  if (!log) return false;
  if (log.notes?.trim()) return true;
  if (!Array.isArray(log.meals)) return false;
  return log.meals.some((m) => {
    if (!m || typeof m !== "object") return false;
    const entry = m as MealEntry;
    return Boolean(entry.foods?.trim()) || Boolean(entry.photo_url);
  });
}

export function hasTrainerDietPlan(plan: DietLog | null | undefined): boolean {
  if (!plan) return false;
  return hasDietLogContent(plan);
}

export { MEAL_TYPES };
