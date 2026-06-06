"use client";

import { useEffect, useState } from "react";
import type { MealEntry } from "@/lib/types";
import { MEAL_LABELS } from "@/lib/utils";
import { defaultMeals } from "@/lib/diet-helpers";
import { createClient } from "@/lib/supabase/client";
import { fetchDietPlan, saveDietPlan } from "@/lib/member-plans";
import { MemberWorkingOutBanner } from "./MemberWorkingOutBanner";

type DietPlanEditorProps = {
  memberId: string;
  trainerId?: string | null;
  locked?: boolean;
  showActiveBanner?: boolean;
  variant?: "trainer" | "member";
  onSaved?: () => void;
};

export function DietPlanEditor({
  memberId,
  trainerId,
  locked = false,
  showActiveBanner = false,
  variant = "trainer",
  onSaved,
}: DietPlanEditorProps) {
  const supabase = createClient();
  const [meals, setMeals] = useState<MealEntry[]>(defaultMeals());
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const isMemberView = variant === "member";

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const plan = await fetchDietPlan(supabase, memberId);
      setMeals(plan?.meals ?? defaultMeals());
      setNotes(plan?.notes ?? "");
    } catch (e) {
      setLoadError(
        e instanceof Error ? e.message : "식단 가이드를 불러오지 못했습니다."
      );
      setMeals(defaultMeals());
      setNotes("");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [memberId]);

  const updateMeal = (
    idx: number,
    field: keyof MealEntry,
    value: string | number | null
  ) => {
    if (locked) return;
    setMeals((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const save = async () => {
    if (locked) return;
    setSaving(true);
    setMessage(null);
    try {
      await saveDietPlan(supabase, {
        memberId,
        trainerId,
        meals,
        notes,
      });
      setMessage(isMemberView ? "저장되었습니다." : "식단 가이드가 저장되었습니다.");
      onSaved?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "저장에 실패했습니다.";
      setMessage(msg.includes("저장") ? msg : `저장 실패: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="card py-8 text-center text-sm text-gray-400">
        불러오는 중...
      </div>
    );
  }

  const guideText = isMemberView
    ? "트레이너님이 설정한 권장 식단 가이드입니다. 실제 드신 식단으로 변경해주세요."
    : "회원에게 보여줄 권장 식단 가이드를 입력하세요.";

  return (
    <div className="space-y-4">
      {loadError && !isMemberView && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {loadError}
          <span className="mt-1 block text-xs text-red-500/90">
            Supabase SQL Editor에서 supabase/fix-member-plans-rls.sql 을
            실행해 주세요.
          </span>
        </p>
      )}

      {showActiveBanner && locked && <MemberWorkingOutBanner />}

      <p className={`text-sm ${isMemberView ? "text-gray-500" : "text-gray-500"}`}>
        {guideText}
      </p>

      {meals.map((meal, idx) => (
        <div key={meal.meal_type} className="card">
          <h3 className="mb-2 font-semibold text-emerald-700">
            {MEAL_LABELS[meal.meal_type]}
          </h3>
          {isMemberView ? (
            <p className="whitespace-pre-wrap text-sm text-gray-400">
              {meal.foods?.trim() || "—"}
            </p>
          ) : (
            <textarea
              className="input-field min-h-[64px] resize-none text-sm"
              placeholder="추천 메뉴·식단 가이드"
              value={meal.foods}
              disabled={locked}
              onChange={(e) => updateMeal(idx, "foods", e.target.value)}
            />
          )}
        </div>
      ))}

      {(notes || !isMemberView) && (
        <div className="card">
          <label className="mb-2 block text-sm font-medium text-gray-600">
            식단 메모
          </label>
          {isMemberView ? (
            <p className="whitespace-pre-wrap text-sm text-gray-400">
              {notes || "—"}
            </p>
          ) : (
            <textarea
              className="input-field min-h-[72px] resize-none"
              placeholder="식단 원칙, 주의사항 등"
              value={notes}
              disabled={locked}
              onChange={(e) => setNotes(e.target.value)}
            />
          )}
        </div>
      )}

      {!locked && !isMemberView && !loadError && (
        <>
          {message && (
            <p
              className={`text-center text-sm ${
                message.includes("실패") || message.includes("permission")
                  ? "text-red-600"
                  : "text-lime-600"
              }`}
            >
              {message}
            </p>
          )}
          <button
            type="button"
            onClick={save}
            disabled={saving || !trainerId}
            className="btn-primary w-full"
          >
            {saving ? "저장 중..." : "식단 가이드 저장"}
          </button>
        </>
      )}
    </div>
  );
}
