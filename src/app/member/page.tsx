"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Calendar } from "@/components/Calendar";
import { WorkoutEditor } from "@/components/WorkoutEditor";
import { DietEditor } from "@/components/DietEditor";
import { MemberDayWorkoutStats } from "@/components/member/MemberDayWorkoutStats";
import { TrainerFeedbackCard } from "@/components/member/TrainerFeedbackCard";
import { MemberRoutinePanel } from "@/components/plans/MemberRoutinePanel";
import { createClient } from "@/lib/supabase/client";
import { getTrainerLinkForMember } from "@/lib/trainer-link";
import { hasDietLogContent } from "@/lib/diet-helpers";
import { fetchDietPlan, planExercisesToInitial, type PlanExercise } from "@/lib/member-plans";
import { toDateString } from "@/lib/utils";
import type { DietLog, Profile, Workout, WorkoutExercise } from "@/lib/types";

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
  const [trainer, setTrainer] = useState<Profile | null>(null);
  const [planDiet, setPlanDiet] = useState<DietLog | null>(null);
  const [planStart, setPlanStart] = useState<{
    exercises: WorkoutExercise[];
    notes: string;
  } | null>(null);

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
      .select("log_date, meals, notes")
      .eq("member_id", uid)
      .gte("log_date", monthStart)
      .lte("log_date", monthEnd);

    setWorkoutDates((workouts || []).map((w) => w.workout_date));
    setDietDates(
      (diets || []).filter((d) => hasDietLogContent(d)).map((d) => d.log_date)
    );
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

    let dPlan = null;
    try {
      dPlan = await fetchDietPlan(supabase, uid);
    } catch (e) {
      console.warn("diet plan load", e);
    }
    if (dPlan) {
      setPlanDiet({
        id: "",
        member_id: uid,
        log_date: dateStr,
        meals: dPlan.meals,
        notes: dPlan.notes,
        created_at: "",
        updated_at: "",
      });
    } else {
      setPlanDiet(null);
    }
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

      const link = await getTrainerLinkForMember(supabase, user.id);
      if (link) {
        const { data: t } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", link.trainerId)
          .single();
        setTrainer(t);
      } else {
        setTrainer(null);
      }
    };
    init();
  }, [selectedDate, refreshKey, loadMonthMarkers, loadDayData, supabase]);

  const onSaved = () => {
    setRefreshKey((k) => k + 1);
    if (userId) {
      loadMonthMarkers(userId);
      loadDayData(userId);
    }
  };

  const handleStartWorkoutFromPlan = (
    planExercises: PlanExercise[],
    planNotes: string
  ) => {
    setPlanStart({
      exercises: planExercisesToInitial(planExercises),
      notes: planNotes ?? "",
    });
    window.setTimeout(() => {
      document
        .getElementById("today-workout")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const hasTodayWorkout = Boolean(workout) || exercises.length > 0;

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

      {userId && trainer && (
        <div className="mt-4">
          <TrainerFeedbackCard
            memberId={userId}
            reportDate={dateStr}
            trainerName={trainer.full_name}
          />
          <MemberDayWorkoutStats
            memberId={userId}
            date={dateStr}
            refreshKey={refreshKey}
          />
        </div>
      )}

      {userId && !trainer && (
        <div className="mt-4">
          <MemberDayWorkoutStats
            memberId={userId}
            date={dateStr}
            refreshKey={refreshKey}
          />
        </div>
      )}

      <div className="mt-4 flex rounded-xl bg-gray-100 p-1">
        <button
          type="button"
          onClick={() => setTab("workout")}
          className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${
            tab === "workout"
              ? "bg-white text-lime-600 shadow-sm"
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

      {userId && (
        <MemberRoutinePanel
          memberId={userId}
          date={dateStr}
          activeTab={tab}
          hasTodayWorkout={hasTodayWorkout}
          onStartWorkout={handleStartWorkoutFromPlan}
        />
      )}

      <div id="today-workout" className="mt-4 scroll-mt-4">
        {tab === "workout" && userId && (
          <>
            <p className="mb-2 text-xs font-medium text-gray-400">오늘 운동 기록</p>
            <WorkoutEditor
              workoutId={workout?.id ?? null}
              memberId={userId}
              date={dateStr}
              initialExercises={exercises}
              initialNotes={workout?.notes || ""}
              planStart={planStart}
              onPlanStartConsumed={() => setPlanStart(null)}
              onSaved={onSaved}
            />
          </>
        )}
        {tab === "diet" && userId && (
          <>
            <p className="mb-2 text-xs font-medium text-gray-400">오늘 식단 기록</p>
            <DietEditor
              key={`diet-${dateStr}-${refreshKey}`}
              memberId={userId}
              date={dateStr}
              initialLog={dietLog}
              trainerPlan={planDiet}
              onSaved={onSaved}
            />
          </>
        )}
      </div>
    </div>
  );
}
