"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Calendar } from "@/components/Calendar";
import { WorkoutEditor } from "@/components/WorkoutEditor";
import { DietEditor } from "@/components/DietEditor";
import { createClient } from "@/lib/supabase/client";
import { toDateString } from "@/lib/utils";
import type { DietLog, Workout, WorkoutExercise } from "@/lib/types";

type Tab = "workout" | "diet";

export default function MemberHomePage() {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tab, setTab] = useState<Tab>("workout");
  const [workoutDates, setWorkoutDates] = useState<string[]>([]);
  const [dietDates, setDietDates] = useState<string[]>([]);
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [dietLog, setDietLog] = useState<DietLog | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const dateStr = toDateString(selectedDate);

  const loadMonthMarkers = useCallback(async (uid: string) => {
    const monthStart = format(selectedDate, "yyyy-MM-01");
    const monthEnd = format(selectedDate, "yyyy-MM-31");

    const { data: workouts } = await supabase
      .from("workouts")
      .select("workout_date")
      .eq("member_id", uid)
      .gte("workout_date", monthStart)
      .lte("workout_date", monthEnd);

    const { data: diets } = await supabase
      .from("diet_logs")
      .select("log_date")
      .eq("member_id", uid)
      .gte("log_date", monthStart)
      .lte("log_date", monthEnd);

    setWorkoutDates((workouts || []).map((w) => w.workout_date));
    setDietDates((diets || []).map((d) => d.log_date));
  }, [selectedDate, supabase]);

  const loadDayData = useCallback(async (uid: string) => {
    const { data: w } = await supabase
      .from("workouts")
      .select("*")
      .eq("member_id", uid)
      .eq("workout_date", dateStr)
      .maybeSingle();

    setWorkout(w);

    if (w) {
      const { data: ex } = await supabase
        .from("workout_exercises")
        .select("*")
        .eq("workout_id", w.id)
        .order("sort_order");
      setExercises(ex || []);
    } else {
      setExercises([]);
    }

    const { data: diet } = await supabase
      .from("diet_logs")
      .select("*")
      .eq("member_id", uid)
      .eq("log_date", dateStr)
      .maybeSingle();

    setDietLog(diet);
  }, [dateStr, supabase]);

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      await loadMonthMarkers(user.id);
      await loadDayData(user.id);
    };
    init();
  }, [selectedDate, refreshKey, loadMonthMarkers, loadDayData, supabase.auth]);

  const onSaved = () => {
    setRefreshKey((k) => k + 1);
    if (userId) {
      loadMonthMarkers(userId);
      loadDayData(userId);
    }
  };

  return (
    <div className="px-4 pt-6">
      <header className="mb-4">
        <h1 className="text-xl font-bold">운동 기록</h1>
        <p className="text-sm text-gray-500">
          {format(selectedDate, "M월 d일 (EEE)", { locale: ko })}
        </p>
      </header>

      <Calendar
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        workoutDates={workoutDates}
        dietDates={dietDates}
      />

      <div className="mt-4 flex rounded-xl bg-gray-100 p-1">
        <button
          type="button"
          onClick={() => setTab("workout")}
          className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${
            tab === "workout"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-500"
          }`}
        >
          운동
        </button>
        <button
          type="button"
          onClick={() => setTab("diet")}
          className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${
            tab === "diet"
              ? "bg-white text-emerald-600 shadow-sm"
              : "text-gray-500"
          }`}
        >
          식단
        </button>
      </div>

      <div className="mt-4">
        {tab === "workout" && userId && (
          <WorkoutEditor
            workoutId={workout?.id ?? null}
            memberId={userId}
            date={dateStr}
            initialExercises={exercises}
            initialNotes={workout?.notes || ""}
            onSaved={onSaved}
          />
        )}
        {tab === "diet" && userId && (
          <DietEditor
            memberId={userId}
            date={dateStr}
            initialLog={dietLog}
            onSaved={onSaved}
          />
        )}
      </div>
    </div>
  );
}
