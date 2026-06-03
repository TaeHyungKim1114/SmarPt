import {
  differenceInCalendarDays,
  format,
  parseISO,
  subDays,
} from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { getMemberIdsForTrainer } from "@/lib/trainer-link";
import type { Profile } from "@/lib/types";

export type MemberDashboardRow = {
  memberId: string;
  profile: Profile;
  lastWorkoutDate: string | null;
  lastDietDate: string | null;
  hasWorkoutToday: boolean;
  hasDietToday: boolean;
  daysSinceActivity: number | null;
  isAtRisk: boolean;
};

export type TrainerDashboardStats = {
  totalMembers: number;
  todayCompletionRate: number;
  weeklyEngagementRate: number;
  atRiskMembers: MemberDashboardRow[];
};

export type TrainerDashboardData = {
  trainerName: string;
  inviteCode: string | null;
  stats: TrainerDashboardStats;
  members: MemberDashboardRow[];
};

function hasDietContent(meals: unknown): boolean {
  if (!Array.isArray(meals)) return false;
  return meals.some(
    (m) =>
      m &&
      typeof m === "object" &&
      "foods" in m &&
      String((m as { foods?: string }).foods ?? "").trim().length > 0
  );
}

function toDateStr(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export async function fetchTrainerDashboard(
  trainerId: string
): Promise<TrainerDashboardData> {
  const supabase = createClient();
  const today = new Date();
  const todayStr = toDateStr(today);
  const weekStartStr = toDateStr(subDays(today, 6));
  const lookbackStr = toDateStr(subDays(today, 60));

  const { data: trainerProfile } = await supabase
    .from("profiles")
    .select("full_name, invite_code")
    .eq("id", trainerId)
    .single();

  const memberIds = await getMemberIdsForTrainer(supabase, trainerId);

  if (memberIds.length === 0) {
    return {
      trainerName: trainerProfile?.full_name ?? "트레이너",
      inviteCode: trainerProfile?.invite_code ?? null,
      stats: {
        totalMembers: 0,
        todayCompletionRate: 0,
        weeklyEngagementRate: 0,
        atRiskMembers: [],
      },
      members: [],
    };
  }

  const [profilesRes, workoutsRes, dietsRes] = await Promise.all([
    supabase.from("profiles").select("*").in("id", memberIds),
    supabase
      .from("workouts")
      .select("member_id, workout_date")
      .in("member_id", memberIds)
      .gte("workout_date", lookbackStr),
    supabase
      .from("diet_logs")
      .select("member_id, log_date, meals")
      .in("member_id", memberIds)
      .gte("log_date", lookbackStr),
  ]);

  const profiles = profilesRes.data ?? [];
  const workouts = workoutsRes.data ?? [];
  const diets = (dietsRes.data ?? []).filter((d) => hasDietContent(d.meals));

  const lastWorkoutByMember = new Map<string, string>();
  const lastDietByMember = new Map<string, string>();
  const workoutDatesByMember = new Map<string, Set<string>>();
  const dietDatesByMember = new Map<string, Set<string>>();

  for (const w of workouts) {
    const prev = lastWorkoutByMember.get(w.member_id);
    if (!prev || w.workout_date > prev) {
      lastWorkoutByMember.set(w.member_id, w.workout_date);
    }
    if (!workoutDatesByMember.has(w.member_id)) {
      workoutDatesByMember.set(w.member_id, new Set());
    }
    workoutDatesByMember.get(w.member_id)!.add(w.workout_date);
  }

  for (const d of diets) {
    const prev = lastDietByMember.get(d.member_id);
    if (!prev || d.log_date > prev) {
      lastDietByMember.set(d.member_id, d.log_date);
    }
    if (!dietDatesByMember.has(d.member_id)) {
      dietDatesByMember.set(d.member_id, new Set());
    }
    dietDatesByMember.get(d.member_id)!.add(d.log_date);
  }

  const members: MemberDashboardRow[] = profiles.map((profile) => {
    const lastWorkout = lastWorkoutByMember.get(profile.id) ?? null;
    const lastDiet = lastDietByMember.get(profile.id) ?? null;

    const activityDates = [lastWorkout, lastDiet].filter(Boolean) as string[];
    const lastActivity =
      activityDates.length > 0
        ? activityDates.sort().reverse()[0]
        : null;

    const daysSinceActivity = lastActivity
      ? differenceInCalendarDays(today, parseISO(lastActivity))
      : null;

    const isAtRisk =
      daysSinceActivity === null || daysSinceActivity >= 3;

    return {
      memberId: profile.id,
      profile,
      lastWorkoutDate: lastWorkout,
      lastDietDate: lastDiet,
      hasWorkoutToday: workoutDatesByMember.get(profile.id)?.has(todayStr) ?? false,
      hasDietToday: dietDatesByMember.get(profile.id)?.has(todayStr) ?? false,
      daysSinceActivity,
      isAtRisk,
    };
  });

  members.sort((a, b) => {
    if (a.isAtRisk !== b.isAtRisk) return a.isAtRisk ? -1 : 1;
    return (b.daysSinceActivity ?? 999) - (a.daysSinceActivity ?? 999);
  });

  const totalMembers = members.length;
  const workoutTodayCount = members.filter((m) => m.hasWorkoutToday).length;
  const dietTodayCount = members.filter((m) => m.hasDietToday).length;

  const todayCompletionRate =
    totalMembers > 0
      ? Math.round(
          ((workoutTodayCount + dietTodayCount) / (totalMembers * 2)) * 100
        )
      : 0;

  let weeklyEngagementRate = 0;
  if (totalMembers > 0) {
    const engagedCount = members.filter((m) => {
      const wDays = workoutDatesByMember.get(m.memberId) ?? new Set();
      const dDays = dietDatesByMember.get(m.memberId) ?? new Set();
      let activeDays = 0;
      for (let i = 0; i < 7; i++) {
        const d = toDateStr(subDays(today, i));
        if (d >= weekStartStr && (wDays.has(d) || dDays.has(d))) activeDays++;
      }
      return activeDays >= 3;
    }).length;
    weeklyEngagementRate = Math.round((engagedCount / totalMembers) * 100);
  }

  const atRiskMembers = members.filter((m) => m.isAtRisk);

  return {
    trainerName: trainerProfile?.full_name ?? "트레이너",
    inviteCode: trainerProfile?.invite_code ?? null,
    stats: {
      totalMembers,
      todayCompletionRate,
      weeklyEngagementRate,
      atRiskMembers,
    },
    members,
  };
}
