"use client";

import { useState } from "react";
import type { DietLog, MealEntry } from "@/lib/types";
import { MEAL_LABELS } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

type DietEditorProps = {
  memberId: string;
  date: string;
  initialLog?: DietLog | null;
  onSaved: () => void;
  readOnly?: boolean;
};

const MEAL_TYPES: MealEntry["meal_type"][] = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
];

function defaultMeals(): MealEntry[] {
  return MEAL_TYPES.map((meal_type) => ({
    meal_type,
    foods: "",
    calories: null,
  }));
}

export function DietEditor({
  memberId,
  date,
  initialLog,
  onSaved,
  readOnly = false,
}: DietEditorProps) {
  const supabase = createClient();
  const [meals, setMeals] = useState<MealEntry[]>(
    initialLog?.meals?.length ? initialLog.meals : defaultMeals()
  );
  const [notes, setNotes] = useState(initialLog?.notes || "");
  const [saving, setSaving] = useState(false);

  const updateMeal = (
    idx: number,
    field: keyof MealEntry,
    value: string | number | null
  ) => {
    setMeals((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const save = async () => {
    if (readOnly) return;
    setSaving(true);

    const payload = {
      member_id: memberId,
      log_date: date,
      meals: meals.filter((m) => m.foods.trim()),
      notes: notes || null,
      updated_at: new Date().toISOString(),
    };

    if (initialLog?.id) {
      await supabase.from("diet_logs").update(payload).eq("id", initialLog.id);
    } else {
      const { error } = await supabase.from("diet_logs").upsert(payload, {
        onConflict: "member_id,log_date",
      });
      if (error) {
        alert("저장 실패: " + error.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    onSaved();
  };

  const totalCalories = meals.reduce((sum, m) => sum + (m.calories || 0), 0);

  return (
    <div className="space-y-4">
      {meals.map((meal, idx) => {
        const type = meal.meal_type || MEAL_TYPES[idx];
        return (
          <div key={type} className="card">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-semibold">{MEAL_LABELS[type]}</h3>
              {!readOnly && (
                <input
                  type="number"
                  placeholder="kcal"
                  className="w-20 rounded-lg border border-gray-200 px-2 py-1 text-right text-sm"
                  value={meal.calories ?? ""}
                  onChange={(e) =>
                    updateMeal(
                      idx,
                      "calories",
                      e.target.value === "" ? null : Number(e.target.value)
                    )
                  }
                />
              )}
              {readOnly && meal.calories != null && (
                <span className="text-sm text-gray-500">{meal.calories} kcal</span>
              )}
            </div>
            {readOnly ? (
              <p className="text-sm text-gray-700">
                {meal.foods || "기록 없음"}
              </p>
            ) : (
              <textarea
                className="input-field min-h-[60px] resize-none text-sm"
                placeholder={`${MEAL_LABELS[type]} 식단 입력 (예: 닭가슴살 200g, 밥 1공기)`}
                value={meal.foods}
                onChange={(e) => updateMeal(idx, "foods", e.target.value)}
              />
            )}
          </div>
        );
      })}

      {totalCalories > 0 && (
        <p className="text-center text-sm text-gray-500">
          총 칼로리: <strong>{totalCalories}</strong> kcal
        </p>
      )}

      <div className="card">
        <label className="mb-2 block text-sm font-medium text-gray-600">
          식단 메모
        </label>
        {readOnly ? (
          <p className="text-sm">{notes || "메모 없음"}</p>
        ) : (
          <textarea
            className="input-field min-h-[60px] resize-none"
            placeholder="물 섭취, 간식 등"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        )}
      </div>

      {!readOnly && (
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="btn-primary w-full"
        >
          {saving ? "저장 중..." : "식단 기록 저장"}
        </button>
      )}
    </div>
  );
}
