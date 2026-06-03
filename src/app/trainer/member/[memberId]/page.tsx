"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ClipboardList, ListChecks } from "lucide-react";
import { DailyReportModal } from "@/components/trainer/DailyReportModal";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Calendar } from "@/components/Calendar";
import { WorkoutEditor } from "@/components/WorkoutEditor";
import { DietEditor } from "@/components/DietEditor";
import { createClient } from "@/lib/supabase/client";
import { toDateString } from "@/lib/utils";
import type { DietLog, Profile, Workout, WorkoutExercise } from "@/lib/types";

type Tab = "workout" | "diet";

export default function TrainerMemberDetailPage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = use(params);
  const supabase = createClient();
  const [trainerId, setTrainerId] = useState<string | null>(null);
  const [member, setMember] = useState<Profile | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tab, setTab] = useState<Tab>("workout");
  const [workoutDates, setWorkoutDates] = useState<string[]>([]);
  const [dietDates, setDietDates] = useState<string[]>([]);
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [dietLog, setDietLog] = useState<DietLog | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  const dateStr = toDateString(selectedDate);

  const loadMonthMarkers = useCallback(async () => {
    const monthStart = format(selectedDate, "yyyy-MM-01");
    const monthEnd = format(selectedDate, "yyyy-MM-31");

    const { data: workouts } = await supabase
      .from("workouts")
      .select("workout_date")
      .eq("member_id", memberId)
      .gte("workout_date", monthStart)
      .lte("workout_date", monthEnd);

    const { data: diets } = await supabase
      .from("diet_logs")
      .select("log_date")
      .eq("member_id", memberId)
      .gte("log_date", monthStart)
      .lte("log_date", monthEnd);

    setWorkoutDates((workouts || []).map((w) => w.workout_date));
    setDietDates((diets || []).map((d) => d.log_date));
  }, [memberId, selectedDate, supabase]);

  const loadDayData = useCallback(async () => {
    const { data: w } = await supabase
      .from("workouts")
      .select("*")
      .eq("member_id", memberId)
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
      .eq("member_id", memberId)
      .eq("log_date", dateStr)
      .maybeSingle();

    setDietLog(diet);
  }, [memberId, dateStr, supabase]);

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) setTrainerId(user.id);

      const { data: m } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", memberId)
        .single();
      setMember(m);

      await loadMonthMarkers();
      await loadDayData();
    };
    init();
  }, [memberId, selectedDate, loadMonthMarkers, loadDayData, supabase.auth]);

  return (
    <div className="px-4 py-4">
      <div className="mb-4 flex items-center justify-between">
        <Link
          href="/trainer"
          className="flex items-center gap-1 text-sm text-gray-500"
        >
          <ArrowLeft className="h-4 w-4" />
          회원 목록
        </Link>
        {member && (
          <div className="flex gap-2">
            <Link
              href={`/trainer/member/${memberId}/routine`}
              className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700"
            >
              <ListChecks className="h-4 w-4" />
              루틴
            </Link>
            <button
              type="button"
              onClick={() => setReportOpen(true)}
              className="flex items-center gap-1 rounded-xl border border-lime-200 bg-lime-50 px-3 py-2 text-sm font-medium text-lime-700"
            >
              <ClipboardList className="h-4 w-4" />
              요약
            </button>
          </div>
        )}
      </div>

      <header className="mb-4">
        <h1 className="text-xl font-bold">{member?.full_name} 회원</h1>
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

      <div className="mt-4">
        {tab === "workout" && (
          exercises.length === 0 && !workout ? (
            <div className="card py-8 text-center text-sm text-gray-400">
              이 날짜에 운동 기록이 없습니다
            </div>
          ) : (
            <WorkoutEditor
              workoutId={workout?.id ?? null}
              memberId={memberId}
              date={dateStr}
              initialExercises={exercises}
              initialNotes={workout?.notes || ""}
              onSaved={() => {}}
              readOnly
            />
          )
        )}
        {tab === "diet" && (
          !dietLog || (dietLog.meals?.length === 0 && !dietLog.notes) ? (
            <div className="card py-8 text-center text-sm text-gray-400">
              이 날짜에 식단 기록이 없습니다
            </div>
          ) : (
            <DietEditor
              memberId={memberId}
              date={dateStr}
              initialLog={dietLog}
              onSaved={() => {}}
              readOnly
            />
          )
        )}
      </div>

      {member && (
        <DailyReportModal
          member={member}
          reportDate={selectedDate}
          open={reportOpen}
          onClose={() => setReportOpen(false)}
        />
      )}
    </div>
  );
}
