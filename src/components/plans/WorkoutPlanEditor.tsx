"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { WorkoutSet } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import {
  fetchWorkoutPlan,
  saveWorkoutPlan,
  type PlanExercise,
} from "@/lib/member-plans";
import { MemberWorkingOutBanner } from "./MemberWorkingOutBanner";

function emptySet(): WorkoutSet {
  return { weight: null, reps: null, completed: false };
}

type WorkoutPlanEditorProps = {
  memberId: string;
  trainerId?: string | null;
  locked?: boolean;
  showActiveBanner?: boolean;
  onSaved?: () => void;
};

export function WorkoutPlanEditor({
  memberId,
  trainerId,
  locked = false,
  showActiveBanner = false,
  onSaved,
}: WorkoutPlanEditorProps) {
  const supabase = createClient();
  const [exercises, setExercises] = useState<PlanExercise[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const plan = await fetchWorkoutPlan(supabase, memberId);
      setExercises(plan?.exercises ?? []);
      setNotes(plan?.notes ?? "");
    } catch (e) {
      setLoadError(
        e instanceof Error ? e.message : "운동 가이드를 불러오지 못했습니다."
      );
      setExercises([]);
      setNotes("");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [memberId]);

  const addExercise = (name = "") => {
    if (locked) return;
    setExercises((prev) => [
      ...prev,
      { name, sets: [emptySet(), emptySet(), emptySet()], memo: "" },
    ]);
  };

  const save = async () => {
    if (locked) return;
    setSaving(true);
    setMessage(null);
    try {
      await saveWorkoutPlan(supabase, {
        memberId,
        trainerId,
        exercises,
        notes,
      });
      setMessage("루틴이 저장되었습니다.");
      onSaved?.();
      await load();
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
        루틴 불러오는 중...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {loadError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {loadError}
          <span className="mt-1 block text-xs text-red-500/90">
            Supabase SQL Editor에서 supabase/fix-member-plans-rls.sql 을
            실행해 주세요.
          </span>
        </p>
      )}

      {showActiveBanner && locked && <MemberWorkingOutBanner />}

      {locked && !showActiveBanner && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          회원이 오늘 운동 중이라 운동 가이드 수정이 잠시 잠겨 있습니다. 운동
          종료 후 다시 시도해 주세요.
        </p>
      )}

      <p className="text-sm text-gray-500">
        트레이너가 정한 기본 운동 루틴입니다. 오늘 기록이 없을 때 이 루틴이
        불러와집니다.
      </p>

      {exercises.map((ex, exIdx) => (
        <div key={exIdx} className="card">
          <div className="mb-3 flex items-center gap-2">
            <input
              className="input-field flex-1 py-2"
              placeholder="운동 이름"
              value={ex.name}
              disabled={locked}
              onChange={(e) => {
                const next = [...exercises];
                next[exIdx] = { ...next[exIdx], name: e.target.value };
                setExercises(next);
              }}
            />
            {!locked && (
              <button
                type="button"
                onClick={() =>
                  setExercises(exercises.filter((_, i) => i !== exIdx))
                }
                className="rounded-lg p-2 text-red-400 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="mb-2 grid grid-cols-[1.75rem_1fr_1fr] gap-2 text-xs font-medium text-gray-400">
            <span className="text-center">세트</span>
            <span className="text-center">kg</span>
            <span className="text-center">회</span>
          </div>

          {ex.sets.map((set, setIdx) => (
            <div
              key={setIdx}
              className="mb-2 grid grid-cols-[1.75rem_1fr_1fr] items-center gap-2"
            >
              <span className="text-center text-sm text-gray-500">
                {setIdx + 1}
              </span>
              <input
                type="number"
                className="input-field py-2 text-center"
                disabled={locked}
                value={set.weight ?? ""}
                onChange={(e) => {
                  const next = [...exercises];
                  const sets = [...next[exIdx].sets];
                  sets[setIdx] = {
                    ...sets[setIdx],
                    weight:
                      e.target.value === "" ? null : Number(e.target.value),
                  };
                  next[exIdx] = { ...next[exIdx], sets };
                  setExercises(next);
                }}
              />
              <input
                type="number"
                className="input-field py-2 text-center"
                disabled={locked}
                value={set.reps ?? ""}
                onChange={(e) => {
                  const next = [...exercises];
                  const sets = [...next[exIdx].sets];
                  sets[setIdx] = {
                    ...sets[setIdx],
                    reps:
                      e.target.value === "" ? null : Number(e.target.value),
                  };
                  next[exIdx] = { ...next[exIdx], sets };
                  setExercises(next);
                }}
              />
            </div>
          ))}

          {!locked && (
            <button
              type="button"
              onClick={() => {
                const next = [...exercises];
                next[exIdx] = {
                  ...next[exIdx],
                  sets: [...next[exIdx].sets, emptySet()],
                };
                setExercises(next);
              }}
              className="text-sm font-medium text-lime-600"
            >
              + 세트 추가
            </button>
          )}
        </div>
      ))}

      {!locked && (
        <button
          type="button"
          onClick={() => addExercise()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 py-3 text-sm font-medium text-gray-500"
        >
          <Plus className="h-4 w-4" />
          운동 항목 추가
        </button>
      )}

      <div className="card">
        <label className="mb-2 block text-sm font-medium text-gray-600">
          루틴 메모
        </label>
        <textarea
          className="input-field min-h-[72px] resize-none"
          placeholder="운동 시 참고 사항"
          value={notes}
          disabled={locked}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {!locked && !loadError && (
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
            {saving ? "저장 중..." : "운동 루틴 저장"}
          </button>
        </>
      )}
    </div>
  );
}
