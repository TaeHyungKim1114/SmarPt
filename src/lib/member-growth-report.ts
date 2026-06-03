import type { SupabaseClient } from "@supabase/supabase-js";
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getDaysInMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ko } from "date-fns/locale";
import { parseTrainerFeedback } from "@/lib/daily-report";
import { getTrainerLinkForMember } from "@/lib/trainer-link";
import type { WorkoutSet } from "@/lib/types";
import { toDateString } from "@/lib/utils";

type ExerciseRow = {
  exercise_date: string;
  exercise_name: string;
  weight_kg: number | null;
  reps: number | null;
};

const MINUTES_PER_SET = 3;

const BIG_THREE = [
  {
    key: "squat" as const,
    label: "스쿼트",
    patterns: ["스쿼트", "squat", "백스쿼트", "프론트스쿼트"],
  },
  {
    key: "deadlift" as const,
    label: "데드리프트",
    patterns: ["데드", "deadlift", "데드리프트", "루마니안"],
  },
  {
    key: "bench" as const,
    label: "벤치프레스",
    patterns: ["벤치", "bench", "벤치프레스", "인클라인"],
  },
];

export type DayAttendance = {
  date: string;
  label: string;
  attended: boolean;
};

export type DayVolume = {
  date: string;
  label: string;
  volumeKg: number;
};

export type BigThreePoint = {
  date: string;
  label: string;
  estimated1RM: number;
};

export type DayMinutes = {
  date: string;
  label: string;
  minutes: number;
};

export type WeeklyGrowthReport = {
  weekStart: string;
  weekEnd: string;
  trainerName: string | null;
  trainerComment: string | null;
  attendanceByDay: DayAttendance[];
  volumeByDay: DayVolume[];
  workoutMinutesByDay: DayMinutes[];
  totalVolumeKg: number;
  totalWorkoutMinutes: number;
  workoutDays: number;
};

export type MonthlyGrowthReport = {
  year: number;
  month: number;
  monthLabel: string;
  trainerName: string | null;
  trainerComment: string | null;
  attendanceRatePct: number;
  workoutDays: number;
  daysInMonth: number;
  totalVolumeKg: number;
  bigThree: {
    squat: BigThreePoint[];
    deadlift: BigThreePoint[];
    bench: BigThreePoint[];
  };
};

export function estimate1RM(weightKg: number, reps: number): number {
  if (weightKg <= 0) return 0;
  if (reps <= 1) return Math.round(weightKg);
  return Math.round(weightKg * (1 + reps / 30));
}

function matchesLift(name: string, patterns: string[]): boolean {
  const n = name.toLowerCase().replace(/\s/g, "");
  return patterns.some((p) => n.includes(p.toLowerCase().replace(/\s/g, "")));
}

function volumeFromRow(row: ExerciseRow): number {
  return (Number(row.weight_kg) || 0) * (Number(row.reps) || 0);
}

async function loadLegacyExerciseRows(
  supabase: SupabaseClient,
  memberId: string,
  start: string,
  end: string
): Promise<ExerciseRow[]> {
  const { data: workouts } = await supabase
    .from("workouts")
    .select("id, workout_date")
    .eq("member_id", memberId)
    .gte("workout_date", start)
    .lte("workout_date", end);

  if (!workouts?.length) return [];

  const ids = workouts.map((w) => w.id);
  const { data: we } = await supabase
    .from("workout_exercises")
    .select("workout_id, name, sets")
    .in("workout_id", ids);

  const dateByWorkout = new Map(workouts.map((w) => [w.id, w.workout_date]));
  const rows: ExerciseRow[] = [];

  for (const ex of we ?? []) {
    const date = dateByWorkout.get(ex.workout_id);
    if (!date || !ex.name?.trim()) continue;
    const sets = (ex.sets as WorkoutSet[]) ?? [];
    sets.forEach((s, i) => {
      rows.push({
        exercise_date: date,
        exercise_name: ex.name.trim(),
        weight_kg: s.weight ?? null,
        reps: s.reps ?? null,
      });
    });
  }

  return rows;
}

async function loadExerciseRows(
  supabase: SupabaseClient,
  memberId: string,
  start: string,
  end: string
): Promise<ExerciseRow[]> {
  const { data } = await supabase
    .from("exercises")
    .select("exercise_date, exercise_name, weight_kg, reps")
    .eq("user_id", memberId)
    .gte("exercise_date", start)
    .lte("exercise_date", end);

  const rows = (data ?? []) as ExerciseRow[];

  if (rows.length > 0) return rows;
  return loadLegacyExerciseRows(supabase, memberId, start, end);
}

function aggregateByDate(rows: ExerciseRow[]) {
  const volumeByDate = new Map<string, number>();
  const setsByDate = new Map<string, number>();

  for (const row of rows) {
    const d = row.exercise_date;
    volumeByDate.set(d, (volumeByDate.get(d) ?? 0) + volumeFromRow(row));
    setsByDate.set(d, (setsByDate.get(d) ?? 0) + 1);
  }

  return { volumeByDate, setsByDate };
}

async function resolveTrainerName(
  supabase: SupabaseClient,
  memberId: string
): Promise<string | null> {
  const link = await getTrainerLinkForMember(supabase, memberId);
  if (!link) return null;
  const { data } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", link.trainerId)
    .single();
  return data?.full_name ?? null;
}

async function fetchTrainerCommentFromDaily(
  supabase: SupabaseClient,
  memberId: string,
  start: string,
  end: string
): Promise<string | null> {
  const { data } = await supabase
    .from("daily_reports")
    .select(
      "report_date, trainer_memo, trainer_workout_memo, trainer_diet_memo, updated_at"
    )
    .eq("member_id", memberId)
    .gte("report_date", start)
    .lte("report_date", end)
    .order("updated_at", { ascending: false });

  for (const row of data ?? []) {
    const { workout, diet } = parseTrainerFeedback(row);
    const parts = [workout, diet].filter(Boolean);
    if (parts.length > 0) return parts.join(" · ");
  }

  return null;
}

export async function fetchWeeklyGrowthReport(
  supabase: SupabaseClient,
  memberId: string,
  anchor: Date = new Date()
): Promise<WeeklyGrowthReport> {
  const weekStartDate = startOfWeek(anchor, { weekStartsOn: 1 });
  const weekEndDate = endOfWeek(anchor, { weekStartsOn: 1 });
  const start = toDateString(weekStartDate);
  const end = toDateString(weekEndDate);

  const [rows, trainerName, dailyComment] = await Promise.all([
    loadExerciseRows(supabase, memberId, start, end),
    resolveTrainerName(supabase, memberId),
    fetchTrainerCommentFromDaily(supabase, memberId, start, end),
  ]);

  const weeklyRes = await supabase
    .from("weekly_reports")
    .select("trainer_summary")
    .eq("member_id", memberId)
    .eq("week_start", start)
    .maybeSingle();

  const { volumeByDate, setsByDate } = aggregateByDate(rows);
  const days = eachDayOfInterval({ start: weekStartDate, end: weekEndDate });

  const attendanceByDay: DayAttendance[] = days.map((d) => {
    const key = toDateString(d);
    const attended = (setsByDate.get(key) ?? 0) > 0;
    return {
      date: key,
      label: format(d, "EEE", { locale: ko }),
      attended,
    };
  });

  const volumeByDay: DayVolume[] = days.map((d) => {
    const key = toDateString(d);
    return {
      date: key,
      label: format(d, "EEE", { locale: ko }),
      volumeKg: Math.round(volumeByDate.get(key) ?? 0),
    };
  });

  const workoutMinutesByDay: DayMinutes[] = days.map((d) => {
    const key = toDateString(d);
    const sets = setsByDate.get(key) ?? 0;
    return {
      date: key,
      label: format(d, "EEE", { locale: ko }),
      minutes: sets * MINUTES_PER_SET,
    };
  });

  const totalVolumeKg = volumeByDay.reduce((s, d) => s + d.volumeKg, 0);
  const totalSets = rows.length;
  const workoutDays = attendanceByDay.filter((d) => d.attended).length;

  const trainerComment =
    (!weeklyRes.error && weeklyRes.data?.trainer_summary?.trim()) ||
    dailyComment ||
    null;

  return {
    weekStart: start,
    weekEnd: end,
    trainerName,
    trainerComment,
    attendanceByDay,
    volumeByDay,
    workoutMinutesByDay,
    totalVolumeKg,
    totalWorkoutMinutes: totalSets * MINUTES_PER_SET,
    workoutDays,
  };
}

function buildBigThreeSeries(
  rows: ExerciseRow[],
  monthStart: Date
): MonthlyGrowthReport["bigThree"] {
  const days = eachDayOfInterval({
    start: monthStart,
    end: endOfMonth(monthStart),
  });

  const result: MonthlyGrowthReport["bigThree"] = {
    squat: [],
    deadlift: [],
    bench: [],
  };

  for (const lift of BIG_THREE) {
    const bestByDate = new Map<string, number>();

    for (const row of rows) {
      if (!matchesLift(row.exercise_name, lift.patterns)) continue;
      const w = Number(row.weight_kg) || 0;
      const r = Number(row.reps) || 0;
      const rm = estimate1RM(w, r);
      if (rm <= 0) continue;
      const prev = bestByDate.get(row.exercise_date) ?? 0;
      if (rm > prev) bestByDate.set(row.exercise_date, rm);
    }

    let runningMax = 0;
    const points: BigThreePoint[] = [];

    for (const d of days) {
      const key = toDateString(d);
      const dayBest = bestByDate.get(key);
      if (dayBest && dayBest > runningMax) runningMax = dayBest;
      if (runningMax > 0) {
        points.push({
          date: key,
          label: format(d, "M/d"),
          estimated1RM: runningMax,
        });
      }
    }

    result[lift.key] = points;
  }

  return result;
}

export async function fetchMonthlyGrowthReport(
  supabase: SupabaseClient,
  memberId: string,
  anchor: Date = new Date()
): Promise<MonthlyGrowthReport> {
  const monthStart = startOfMonth(anchor);
  const monthEnd = endOfMonth(anchor);
  const start = toDateString(monthStart);
  const end = toDateString(monthEnd);
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth() + 1;

  const [rows, trainerName, monthlyRow, dailyComment] = await Promise.all([
    loadExerciseRows(supabase, memberId, start, end),
    resolveTrainerName(supabase, memberId),
    supabase
      .from("monthly_reports")
      .select("trainer_summary, highlights, stats")
      .eq("member_id", memberId)
      .eq("report_year", year)
      .eq("report_month", month)
      .maybeSingle(),
    fetchTrainerCommentFromDaily(supabase, memberId, start, end),
  ]);

  const { volumeByDate, setsByDate } = aggregateByDate(rows);
  const daysInMonth = getDaysInMonth(monthStart);
  const workoutDays = setsByDate.size;
  const attendanceRatePct =
    daysInMonth > 0 ? Math.round((workoutDays / daysInMonth) * 100) : 0;

  const highlights = monthlyRow.data?.highlights;
  const highlightText =
    Array.isArray(highlights) && highlights.length > 0
      ? String(highlights[0])
      : null;

  const statsComment =
    monthlyRow.data?.stats &&
    typeof monthlyRow.data.stats === "object" &&
    monthlyRow.data.stats !== null &&
    "trainer_comment" in monthlyRow.data.stats
      ? String(
          (monthlyRow.data.stats as { trainer_comment?: string }).trainer_comment
        )
      : null;

  const trainerComment =
    monthlyRow.data?.trainer_summary?.trim() ||
    highlightText ||
    statsComment ||
    dailyComment ||
    null;

  const totalVolumeKg = Math.round(
    [...volumeByDate.values()].reduce((a, b) => a + b, 0)
  );

  return {
    year,
    month,
    monthLabel: format(monthStart, "yyyy년 M월", { locale: ko }),
    trainerName,
    trainerComment,
    attendanceRatePct,
    workoutDays,
    daysInMonth,
    totalVolumeKg,
    bigThree: buildBigThreeSeries(rows, monthStart),
  };
}

export function formatWeekRange(weekStart: string, weekEnd: string): string {
  const s = parseISO(weekStart);
  const e = parseISO(weekEnd);
  return `${format(s, "M.d", { locale: ko })} – ${format(e, "M.d", { locale: ko })}`;
}
