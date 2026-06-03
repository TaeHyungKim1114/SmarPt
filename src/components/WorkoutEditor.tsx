"use client";

import { useState } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import type { WorkoutExercise, WorkoutSet } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

type WorkoutEditorProps = {
  workoutId: string | null;
  memberId: string;
  date: string;
  initialExercises?: WorkoutExercise[];
  initialNotes?: string;
  onSaved: () => void;
  readOnly?: boolean;
};

const DEFAULT_EXERCISES = ["벤치프레스", "스쿼트", "데드리프트", "랫풀다운", "숄더프레스"];

function emptySet(): WorkoutSet {
  return { weight: null, reps: null, completed: true };
}

export function WorkoutEditor({
  workoutId,
  memberId,
  date,
  initialExercises = [],
  initialNotes = "",
  onSaved,
  readOnly = false,
}: WorkoutEditorProps) {
  const supabase = createClient();
  const [exercises, setExercises] = useState<
    { id?: string; name: string; sets: WorkoutSet[]; memo: string }[]
  >(
    initialExercises.length > 0
      ? initialExercises.map((e) => ({
          id: e.id,
          name: e.name,
          sets: e.sets.length ? e.sets : [emptySet()],
          memo: e.memo || "",
        }))
      : []
  );
  const [notes, setNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);

  const addExercise = (name?: string) => {
    if (readOnly) return;
    setExercises((prev) => [
      ...prev,
      { name: name || "", sets: [emptySet(), emptySet(), emptySet()], memo: "" },
    ]);
  };

  const updateSet = (
    exIdx: number,
    setIdx: number,
    field: "weight" | "reps",
    value: string
  ) => {
    setExercises((prev) => {
      const next = [...prev];
      const sets = [...next[exIdx].sets];
      sets[setIdx] = {
        ...sets[setIdx],
        [field]: value === "" ? null : Number(value),
      };
      next[exIdx] = { ...next[exIdx], sets };
      return next;
    });
  };

  const addSet = (exIdx: number) => {
    setExercises((prev) => {
      const next = [...prev];
      next[exIdx] = {
        ...next[exIdx],
        sets: [...next[exIdx].sets, emptySet()],
      };
      return next;
    });
  };

  const removeExercise = (exIdx: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== exIdx));
  };

  const save = async () => {
    if (readOnly) return;
    setSaving(true);

    let wId = workoutId;

    if (!wId) {
      const { data, error } = await supabase
        .from("workouts")
        .insert({ member_id: memberId, workout_date: date, notes })
        .select("id")
        .single();
      if (error) {
        if (error.code === "23505") {
          const { data: existing } = await supabase
            .from("workouts")
            .select("id")
            .eq("member_id", memberId)
            .eq("workout_date", date)
            .single();
          wId = existing?.id ?? null;
        } else {
          alert("저장 실패: " + error.message);
          setSaving(false);
          return;
        }
      } else {
        wId = data.id;
      }
    } else {
      await supabase
        .from("workouts")
        .update({ notes, updated_at: new Date().toISOString() })
        .eq("id", wId);
    }

    if (!wId) {
      setSaving(false);
      return;
    }

    await supabase.from("workout_exercises").delete().eq("workout_id", wId);

    const toInsert = exercises
      .filter((e) => e.name.trim())
      .map((e, i) => ({
        workout_id: wId!,
        name: e.name.trim(),
        sets: e.sets,
        sort_order: i,
        memo: e.memo || null,
      }));

    if (toInsert.length > 0) {
      await supabase.from("workout_exercises").insert(toInsert);
    }

    setSaving(false);
    onSaved();
  };

  return (
    <div className="space-y-4">
      {!readOnly && exercises.length === 0 && (
        <div className="card">
          <p className="mb-3 text-sm text-gray-500">빠른 추가</p>
          <div className="flex flex-wrap gap-2">
            {DEFAULT_EXERCISES.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => addExercise(name)}
                className="rounded-full bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700"
              >
                + {name}
              </button>
            ))}
          </div>
        </div>
      )}

      {exercises.map((ex, exIdx) => (
        <div key={exIdx} className="card">
          <div className="mb-3 flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-gray-300" />
            {readOnly ? (
              <h3 className="font-semibold">{ex.name}</h3>
            ) : (
              <input
                className="input-field flex-1 py-2"
                placeholder="운동 이름"
                value={ex.name}
                onChange={(e) => {
                  const next = [...exercises];
                  next[exIdx] = { ...next[exIdx], name: e.target.value };
                  setExercises(next);
                }}
              />
            )}
            {!readOnly && (
              <button
                type="button"
                onClick={() => removeExercise(exIdx)}
                className="rounded-lg p-2 text-red-400 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="mb-2 grid grid-cols-[2rem_1fr_1fr] gap-2 text-xs font-medium text-gray-400">
            <span>세트</span>
            <span className="text-center">kg</span>
            <span className="text-center">회</span>
          </div>

          {ex.sets.map((set, setIdx) => (
            <div
              key={setIdx}
              className="mb-2 grid grid-cols-[2rem_1fr_1fr] items-center gap-2"
            >
              <span className="text-center text-sm font-medium text-gray-500">
                {setIdx + 1}
              </span>
              {readOnly ? (
                <>
                  <span className="text-center">{set.weight ?? "-"}</span>
                  <span className="text-center">{set.reps ?? "-"}</span>
                </>
              ) : (
                <>
                  <input
                    type="number"
                    inputMode="decimal"
                    className="input-field py-2 text-center"
                    placeholder="0"
                    value={set.weight ?? ""}
                    onChange={(e) =>
                      updateSet(exIdx, setIdx, "weight", e.target.value)
                    }
                  />
                  <input
                    type="number"
                    inputMode="numeric"
                    className="input-field py-2 text-center"
                    placeholder="0"
                    value={set.reps ?? ""}
                    onChange={(e) =>
                      updateSet(exIdx, setIdx, "reps", e.target.value)
                    }
                  />
                </>
              )}
            </div>
          ))}

          {!readOnly && (
            <button
              type="button"
              onClick={() => addSet(exIdx)}
              className="mt-2 text-sm font-medium text-blue-600"
            >
              + 세트 추가
            </button>
          )}
        </div>
      ))}

      {!readOnly && (
        <button
          type="button"
          onClick={() => addExercise()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 py-4 text-sm font-medium text-gray-500"
        >
          <Plus className="h-4 w-4" />
          운동 추가
        </button>
      )}

      <div className="card">
        <label className="mb-2 block text-sm font-medium text-gray-600">
          메모
        </label>
        {readOnly ? (
          <p className="text-sm text-gray-700">{notes || "메모 없음"}</p>
        ) : (
          <textarea
            className="input-field min-h-[80px] resize-none"
            placeholder="오늘 운동 느낌, 컨디션 등"
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
          {saving ? "저장 중..." : "운동 기록 저장"}
        </button>
      )}
    </div>
  );
}
