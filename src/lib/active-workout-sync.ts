import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingMemberPlansTableError } from "@/lib/member-plans";

const STALE_MS = 4 * 60 * 60 * 1000;

function ignoreMissingActiveTable(error: { message?: string; code?: string } | null) {
  return error != null && isMissingMemberPlansTableError(error);
}

export async function setMemberActiveWorkout(
  supabase: SupabaseClient,
  memberId: string,
  sessionDate: string
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase.from("member_active_workout").upsert({
    member_id: memberId,
    session_date: sessionDate,
    started_at: now,
    updated_at: now,
  });
  if (ignoreMissingActiveTable(error)) return;
}

export async function touchMemberActiveWorkout(
  supabase: SupabaseClient,
  memberId: string
): Promise<void> {
  const { error } = await supabase
    .from("member_active_workout")
    .update({ updated_at: new Date().toISOString() })
    .eq("member_id", memberId);
  if (ignoreMissingActiveTable(error)) return;
}

export async function clearMemberActiveWorkout(
  supabase: SupabaseClient,
  memberId: string
): Promise<void> {
  const { error } = await supabase
    .from("member_active_workout")
    .delete()
    .eq("member_id", memberId);
  if (ignoreMissingActiveTable(error)) return;
}

export async function isMemberWorkingOut(
  supabase: SupabaseClient,
  memberId: string,
  todayDate?: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("member_active_workout")
    .select("session_date, updated_at")
    .eq("member_id", memberId)
    .maybeSingle();

  if (error) {
    if (ignoreMissingActiveTable(error)) return false;
    return false;
  }
  if (!data?.updated_at) return false;

  if (todayDate && data.session_date !== todayDate) return false;

  return Date.now() - new Date(data.updated_at).getTime() < STALE_MS;
}
