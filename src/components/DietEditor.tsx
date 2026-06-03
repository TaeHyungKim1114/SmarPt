"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, Loader2 } from "lucide-react";
import type { DietLog, MealEntry } from "@/lib/types";
import { MEAL_LABELS } from "@/lib/utils";
import {
  defaultMeals,
  hasTrainerDietPlan,
  MEAL_TYPES,
  mergeMealsFromLog,
} from "@/lib/diet-helpers";
import { createClient } from "@/lib/supabase/client";
import { syncMealsFromDiet, uploadMealPhoto } from "@/lib/sync-member-data";

type DietEditorProps = {
  memberId: string;
  date: string;
  initialLog?: DietLog | null;
  trainerPlan?: DietLog | null;
  onSaved: () => void;
  readOnly?: boolean;
};

export function DietEditor({
  memberId,
  date,
  initialLog,
  trainerPlan,
  onSaved,
  readOnly = false,
}: DietEditorProps) {
  const supabase = createClient();
  const trainerMeals = mergeMealsFromLog(trainerPlan?.meals);
  const hasTrainerPlan = hasTrainerDietPlan(trainerPlan);

  const [meals, setMeals] = useState<MealEntry[]>(() =>
    mergeMealsFromLog(initialLog?.meals as MealEntry[] | undefined)
  );
  const [notes, setNotes] = useState(initialLog?.notes || "");
  const [saving, setSaving] = useState(false);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const fileRefs = useRef<(HTMLInputElement | null)[]>([]);
  const saveMessageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMeals(mergeMealsFromLog(initialLog?.meals as MealEntry[] | undefined));
    setNotes(initialLog?.notes || "");
    setSaveError(null);
  }, [initialLog, date]);

  useEffect(() => {
    setSaveMessage(null);
    return () => {
      if (saveMessageTimerRef.current) {
        clearTimeout(saveMessageTimerRef.current);
      }
    };
  }, [date]);

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
    setSaveError(null);
  };

  const handlePhoto = async (idx: number, file: File) => {
    setUploadingIdx(idx);
    const type = meals[idx].meal_type || MEAL_TYPES[idx];
    const url = await uploadMealPhoto(supabase, memberId, date, type, file);
    if (url) {
      updateMeal(idx, "photo_url", url);
    } else {
      setSaveError(
        "사진 업로드에 실패했습니다. Supabase Storage에 meal-photos 버킷이 있는지 확인하세요."
      );
    }
    setUploadingIdx(null);
  };

  const save = async () => {
    if (readOnly) return;

    const mealsPayload = meals.filter((m) => m.foods.trim() || m.photo_url);

    if (mealsPayload.length === 0 && !notes.trim()) {
      setSaveError("식단 내용 또는 메모를 최소 한 가지 입력해 주세요.");
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSaveMessage(null);

    const payload = {
      member_id: memberId,
      log_date: date,
      meals: mealsPayload,
      notes: notes.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("diet_logs")
      .upsert(payload, { onConflict: "member_id,log_date" })
      .select("id")
      .single();

    if (error) {
      setSaveError("저장 실패: " + error.message);
      setSaving(false);
      return;
    }

    if (!data?.id) {
      setSaveError("저장 후 데이터를 확인하지 못했습니다. 다시 시도해 주세요.");
      setSaving(false);
      return;
    }

    const syncResult = await syncMealsFromDiet(supabase, memberId, date, meals);
    if (
      !syncResult.ok &&
      syncResult.error !== "meals_table_missing" &&
      !syncResult.error?.includes("infinite recursion")
    ) {
      console.warn("meals sync:", syncResult.error);
    }

    setSaving(false);
    setSaveMessage("식단이 저장되었습니다.");

    if (saveMessageTimerRef.current) {
      clearTimeout(saveMessageTimerRef.current);
    }
    saveMessageTimerRef.current = setTimeout(() => {
      setSaveMessage(null);
      saveMessageTimerRef.current = null;
      onSaved();
    }, 1000);
  };

  return (
    <div className="space-y-4">
      {!readOnly && (
        <p
          className={`text-sm ${
            hasTrainerPlan ? "text-gray-500" : "text-gray-400"
          }`}
        >
          {hasTrainerPlan
            ? "트레이너님이 설정한 권장 식단 가이드입니다. 실제 드신 식단으로 변경해주세요."
            : "드신 식단을 입력해주세요"}
        </p>
      )}

      {meals.map((meal, idx) => {
        const type = meal.meal_type || MEAL_TYPES[idx];
        const trainerFoods = trainerMeals[idx]?.foods?.trim() ?? "";
        const showTrainerBlock = !readOnly && Boolean(trainerFoods);

        return (
          <div key={type} className="card">
            <h3 className="mb-2 font-semibold">{MEAL_LABELS[type]}</h3>

            {showTrainerBlock && (
              <div className="mb-2 space-y-1">
                <p className="whitespace-pre-wrap text-sm text-gray-400">
                  {trainerFoods}
                </p>
                <p className="text-xs text-gray-400">
                  실제 드신 식단으로 수정해주세요
                </p>
              </div>
            )}

            {meal.photo_url && (
              <div className="mb-2 overflow-hidden rounded-xl bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={meal.photo_url}
                  alt={`${MEAL_LABELS[type]} 사진`}
                  className="max-h-40 w-full object-cover"
                />
              </div>
            )}

            {readOnly ? (
              <p className="text-sm text-gray-700">
                {meal.foods || (meal.photo_url ? "(사진만 등록)" : "기록 없음")}
              </p>
            ) : (
              <>
                <textarea
                  className="input-field min-h-[60px] resize-none text-sm"
                  placeholder={
                    hasTrainerPlan
                      ? `${MEAL_LABELS[type]} — 실제 드신 식단`
                      : `${MEAL_LABELS[type]} 식단 입력`
                  }
                  value={meal.foods}
                  onChange={(e) => updateMeal(idx, "foods", e.target.value)}
                />
                <input
                  ref={(el) => {
                    fileRefs.current[idx] = el;
                  }}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePhoto(idx, file);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileRefs.current[idx]?.click()}
                  disabled={uploadingIdx === idx}
                  className="mt-2 flex items-center gap-1.5 text-sm font-medium text-emerald-600"
                >
                  {uploadingIdx === idx ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                  식단 사진 추가
                </button>
              </>
            )}
          </div>
        );
      })}

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
            onChange={(e) => {
              setNotes(e.target.value);
              setSaveError(null);
            }}
          />
        )}
      </div>

      {saveError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {saveError}
        </p>
      )}

      {saveMessage && (
        <p className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          {saveMessage}
        </p>
      )}

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
