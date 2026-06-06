"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Plus, Trash2, GripVertical } from "lucide-react";
import type { WorkoutExercise, WorkoutSet } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { syncExercisesFromWorkout } from "@/lib/sync-member-data";
import {
  appendDurationToNotes,
  loadWorkoutSession,
  parseRestDurationSec,
  parseWorkoutDurationSec,
} from "@/lib/workout-session";
import { calculateTotalVolumeKg } from "@/lib/workout-stats";
import { useWorkoutSession } from "@/hooks/useWorkoutSession";
import { WorkoutCompletionCard } from "@/components/workout/WorkoutCompletionCard";
import { WorkoutStopwatches } from "@/components/workout/WorkoutStopwatches";
import {
  QuickAddPanel,
  WorkoutStartModal,
} from "@/components/workout/QuickAddPanel";

type WorkoutEditorProps = {
  workoutId: string | null;
  memberId: string;
  date: string;
  initialExercises?: WorkoutExercise[];
  initialNotes?: string;
  planStart?: { exercises: WorkoutExercise[]; notes: string } | null;
  onPlanStartConsumed?: () => void;
  onSaved: () => void;
  readOnly?: boolean;
};

function emptySet(): WorkoutSet {
  return { weight: null, reps: null, completed: false };
}

function normalizeSets(sets: WorkoutSet[]): WorkoutSet[] {
  if (!sets.length) return [emptySet()];
  return sets.map((s) => ({
    weight: s.weight ?? null,
    reps: s.reps ?? null,
    completed: s.completed ?? false,
  }));
}

export function WorkoutEditor({
  workoutId,
  memberId,
  date,
  initialExercises = [],
  initialNotes = "",
  planStart = null,
  onPlanStartConsumed,
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
          sets: normalizeSets(e.sets),
          memo: e.memo || "",
        }))
      : []
  );
  const [notes, setNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);
  const [pendingAdd, setPendingAdd] = useState<string | undefined>(undefined);
  const lastExerciseRef = useRef<HTMLDivElement>(null);
  const prevExerciseCountRef = useRef(exercises.length);
  const userEditingRef = useRef(false);

  const [workoutEnded, setWorkoutEnded] = useState(() => {
    if (readOnly) return true;
    const active = loadWorkoutSession(memberId, date).started;
    if (active) return false;
    return Boolean(workoutId) || initialExercises.length > 0;
  });

  const [savedSummary, setSavedSummary] = useState<{
    workoutSec: number;
    volumeKg: number;
  } | null>(() => {
    if (!workoutId && initialExercises.length === 0) return null;
    return {
      workoutSec: parseWorkoutDurationSec(initialNotes),
      volumeKg: calculateTotalVolumeKg(
        initialExercises.map((e) => ({ sets: normalizeSets(e.sets) }))
      ),
    };
  });

  const {
    session,
    startWorkout,
    resumeWorkout,
    endWorkoutSession,
    toggleWorkout,
    resetWorkout,
    toggleRest,
    resetRest,
    getElapsedNow,
  } = useWorkoutSession(memberId, date);

  const showTimers = !readOnly && session.started && !workoutEnded;

  useEffect(() => {
    if (readOnly) return;
    const stored = loadWorkoutSession(memberId, date);
    if (stored.started) {
      setWorkoutEnded(false);
      userEditingRef.current = true;
    } else {
      userEditingRef.current = false;
    }
  }, [memberId, date, readOnly]);

  useEffect(() => {
    if (readOnly || !planStart) return;

    userEditingRef.current = true;
    setWorkoutEnded(false);
    setSavedSummary(null);
    setExercises(
      planStart.exercises.map((e) => ({
        id: e.id,
        name: e.name,
        sets: normalizeSets(e.sets),
        memo: e.memo || "",
      }))
    );
    setNotes(planStart.notes);
    startWorkout();
    onPlanStartConsumed?.();
  }, [planStart, readOnly, startWorkout, onPlanStartConsumed]);

  useEffect(() => {
    if (readOnly) return;

    const stored = loadWorkoutSession(memberId, date);
    if (stored.started || userEditingRef.current) return;

    setExercises(
      initialExercises.length > 0
        ? initialExercises.map((e) => ({
            id: e.id,
            name: e.name,
            sets: normalizeSets(e.sets),
            memo: e.memo || "",
          }))
        : []
    );
    setNotes(initialNotes);

    if (workoutId) {
      setWorkoutEnded(true);
      setSavedSummary({
        workoutSec: parseWorkoutDurationSec(initialNotes),
        volumeKg: calculateTotalVolumeKg(
          initialExercises.map((e) => ({ sets: normalizeSets(e.sets) }))
        ),
      });
    } else {
      setWorkoutEnded(false);
      setSavedSummary(null);
    }
  }, [workoutId, initialExercises, initialNotes, memberId, date, readOnly]);

  useEffect(() => {
    if (exercises.length <= prevExerciseCountRef.current) {
      prevExerciseCountRef.current = exercises.length;
      return;
    }
    prevExerciseCountRef.current = exercises.length;
    const timer = window.setTimeout(() => {
      const el = lastExerciseRef.current;
      if (!el) return;
      const top =
        el.getBoundingClientRect().bottom +
        window.scrollY -
        window.innerHeight +
        160;
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [exercises.length]);

  const addExerciseDirect = (name?: string) => {
    setExercises((prev) => [
      ...prev,
      {
        name: name || "",
        sets: [emptySet(), emptySet(), emptySet()],
        memo: "",
      },
    ]);
  };

  const requestAddExercise = (name?: string) => {
    if (readOnly || workoutEnded) return;
    if (!session.started) {
      setPendingAdd(name);
      setShowStartModal(true);
      return;
    }
    addExerciseDirect(name);
  };

  const confirmStartWorkout = () => {
    userEditingRef.current = true;
    startWorkout();
    setShowStartModal(false);
    addExerciseDirect(pendingAdd);
    setPendingAdd(undefined);
  };

  const cancelStartWorkout = () => {
    setShowStartModal(false);
    setPendingAdd(undefined);
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

  const toggleSetCompleted = (exIdx: number, setIdx: number) => {
    setExercises((prev) => {
      const next = [...prev];
      const sets = [...next[exIdx].sets];
      sets[setIdx] = {
        ...sets[setIdx],
        completed: !sets[setIdx].completed,
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

  const removeSet = (exIdx: number, setIdx: number) => {
    setExercises((prev) => {
      const next = [...prev];
      const sets = next[exIdx].sets.filter((_, i) => i !== setIdx);
      next[exIdx] = {
        ...next[exIdx],
        sets: sets.length ? sets : [emptySet()],
      };
      return next;
    });
  };

  const removeExercise = (exIdx: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== exIdx));
  };

  const resumeEditing = () => {
    userEditingRef.current = true;
    setWorkoutEnded(false);
    resumeWorkout({
      workoutElapsedSec:
        savedSummary?.workoutSec ?? parseWorkoutDurationSec(notes),
      restElapsedSec: parseRestDurationSec(notes),
    });
  };

  const save = async () => {
    if (readOnly || workoutEnded) return;
    setSaving(true);

    const elapsed = getElapsedNow();
    const finalWorkoutSec = elapsed.workoutElapsedSec;
    const finalRestSec = elapsed.restElapsedSec;
    const finalVolumeKg = calculateTotalVolumeKg(exercises);

    const notesWithDuration = appendDurationToNotes(
      notes,
      finalWorkoutSec,
      finalRestSec
    );

    let wId = workoutId;

    if (!wId) {
      const { data, error } = await supabase
        .from("workouts")
        .insert({ member_id: memberId, workout_date: date, notes: notesWithDuration })
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
        .update({ notes: notesWithDuration, updated_at: new Date().toISOString() })
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

    try {
      await syncExercisesFromWorkout(supabase, memberId, date, wId);
    } catch (e) {
      console.warn("exercises sync", e);
    }

    endWorkoutSession();
    userEditingRef.current = false;

    setSavedSummary({
      workoutSec: finalWorkoutSec,
      volumeKg: finalVolumeKg,
    });
    setWorkoutEnded(true);
    setNotes(notesWithDuration);

    setSaving(false);
    onSaved();
  };

  const isEmpty = exercises.length === 0;
  const editing = !readOnly && !workoutEnded;
  const viewingSaved = !readOnly && workoutEnded && Boolean(workoutId);
  const showEmptyAdd = isEmpty && !readOnly && !viewingSaved;

  return (
    <div className={`space-y-4 ${showTimers ? "pb-44" : ""}`}>
      <WorkoutStartModal
        open={showStartModal}
        onConfirm={confirmStartWorkout}
        onCancel={cancelStartWorkout}
      />

      {readOnly &&
        savedSummary &&
        (savedSummary.workoutSec > 0 || savedSummary.volumeKg > 0) && (
          <WorkoutCompletionCard
            workoutSec={savedSummary.workoutSec}
            volumeKg={savedSummary.volumeKg}
            compact
          />
        )}

      {isEmpty && readOnly ? (
        <div className="card py-8 text-center text-sm text-gray-400">
          운동 기록이 없습니다
        </div>
      ) : showEmptyAdd ? (
        <button
          type="button"
          onClick={() => requestAddExercise()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 py-4 text-sm font-medium text-gray-500"
        >
          <Plus className="h-4 w-4" />
          운동 추가
        </button>
      ) : (
        <>
          {editing && (
            <QuickAddPanel memberId={memberId} onAdd={requestAddExercise} />
          )}

          {exercises.map((ex, exIdx) => (
        <div
          key={exIdx}
          ref={exIdx === exercises.length - 1 ? lastExerciseRef : undefined}
          className="card"
        >
          <div className="mb-3 flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-gray-300" />
            {readOnly || workoutEnded ? (
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
            {editing && (
              <button
                type="button"
                onClick={() => removeExercise(exIdx)}
                className="rounded-lg p-2 text-red-400 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>

          <div
            className={`mb-2 grid gap-2 text-xs font-medium text-gray-400 ${
              editing
                ? "grid-cols-[2.25rem_1.75rem_1fr_1fr_2rem]"
                : "grid-cols-[2.25rem_1.75rem_1fr_1fr]"
            }`}
          >
            <span className="text-center">완료</span>
            <span className="text-center">세트</span>
            <span className="block w-full text-center">kg</span>
            <span className="block w-full text-center">회</span>
            {editing && <span />}
          </div>

          {ex.sets.map((set, setIdx) => (
            <div
              key={setIdx}
              className={`mb-2 grid items-center gap-2 rounded-xl transition ${
                editing
                  ? "grid-cols-[2.25rem_1.75rem_1fr_1fr_2rem]"
                  : "grid-cols-[2.25rem_1.75rem_1fr_1fr]"
              } ${set.completed ? "bg-lime-50/80 ring-1 ring-lime-100" : ""}`}
            >
              {readOnly || workoutEnded ? (
                <span className="flex justify-center">
                  {set.completed ? (
                    <Check className="h-5 w-5 text-lime-600" />
                  ) : (
                    <span className="h-5 w-5 rounded border border-gray-200" />
                  )}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => toggleSetCompleted(exIdx, setIdx)}
                  className={`mx-auto flex h-8 w-8 items-center justify-center rounded-lg border-2 transition ${
                    set.completed
                      ? "border-lime-500 bg-lime-500 text-white"
                      : "border-gray-200 bg-white text-transparent hover:border-lime-300"
                  }`}
                  aria-label={`세트 ${setIdx + 1} 완료`}
                >
                  <Check className="h-4 w-4" strokeWidth={3} />
                </button>
              )}
              <span className="text-center text-sm font-medium text-gray-500">
                {setIdx + 1}
              </span>
              {readOnly || workoutEnded ? (
                <>
                  <span className="block w-full text-center tabular-nums">
                    {set.weight ?? "-"}
                  </span>
                  <span className="block w-full text-center tabular-nums">
                    {set.reps ?? "-"}
                  </span>
                </>
              ) : (
                <>
                  <input
                    type="number"
                    inputMode="decimal"
                    className="input-field py-2 text-center tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    placeholder="0"
                    value={set.weight ?? ""}
                    onChange={(e) =>
                      updateSet(exIdx, setIdx, "weight", e.target.value)
                    }
                  />
                  <input
                    type="number"
                    inputMode="numeric"
                    className="input-field py-2 text-center tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    placeholder="0"
                    value={set.reps ?? ""}
                    onChange={(e) =>
                      updateSet(exIdx, setIdx, "reps", e.target.value)
                    }
                  />
                  {editing && ex.sets.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSet(exIdx, setIdx)}
                      className="rounded-lg p-1.5 text-red-400 hover:bg-red-50"
                      aria-label={`${setIdx + 1}세트 삭제`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </>
              )}
            </div>
          ))}

          {editing && (
            <button
              type="button"
              onClick={() => addSet(exIdx)}
              className="mt-2 text-sm font-medium text-lime-600"
            >
              + 세트 추가
            </button>
          )}
        </div>
      ))}

          {editing && (
            <button
              type="button"
              onClick={() => requestAddExercise()}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 py-4 text-sm font-medium text-gray-500"
            >
              <Plus className="h-4 w-4" />
              운동 추가
            </button>
          )}
        </>
      )}

      {(!isEmpty || viewingSaved) && (
      <div className="card">
        <label className="mb-2 block text-sm font-medium text-gray-600">
          메모
        </label>
        {readOnly ? (
          <p className="whitespace-pre-wrap text-sm text-gray-700">
            {notes || "메모 없음"}
          </p>
        ) : workoutEnded ? (
          <p className="whitespace-pre-wrap text-sm text-gray-700">
            {notes || "메모 없음"}
          </p>
        ) : (
          <textarea
            className="input-field min-h-[80px] resize-none"
            placeholder="오늘 운동 느낌, 컨디션 등"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        )}
      </div>
      )}

      {!readOnly && !isEmpty && !workoutEnded && (
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="btn-primary w-full"
        >
          {saving ? "종료 중..." : "운동 종료"}
        </button>
      )}

      {!readOnly && (viewingSaved || (!isEmpty && workoutEnded)) && (
        <button
          type="button"
          onClick={resumeEditing}
          className="btn-secondary w-full"
        >
          운동 수정
        </button>
      )}

      {showTimers && (
        <WorkoutStopwatches
          workoutSec={session.workoutElapsedSec}
          workoutRunning={session.workoutRunning}
          restSec={session.restElapsedSec}
          restRunning={session.restRunning}
          onToggleWorkout={toggleWorkout}
          onResetWorkout={resetWorkout}
          onToggleRest={toggleRest}
          onResetRest={resetRest}
        />
      )}
    </div>
  );
}
