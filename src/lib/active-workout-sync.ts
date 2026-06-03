import type { SupabaseClient } from "@supabase/supabase-js";

const STALE_MS = 4 * 60 * 60 * 1000;

export async function setMemberActiveWorkout(
  supabase: SupabaseClient,
  memberId: string,
  sessionDate: string
): Promise<void> {
  const now = new Date().toISOString();
  await supabase.from("member_active_workout").upsert({
    member_id: memberId,
    session_date: sessionDate,
    started_at: now,
    updated_at: now,
  });
}

export async function touchMemberActiveWorkout(
  supabase: SupabaseClient,
  memberId: string
): Promise<void> {
  await supabase
    .from("member_active_workout")
    .update({ updated_at: new Date().toISOString() })
    .eq("member_id", memberId);
}

export async function clearMemberActiveWorkout(
  supabase: SupabaseClient,
  memberId: string
): Promise<void> {
  await supabase
    .from("member_active_workout")
    .delete()
    .eq("member_id", memberId);
}

export async function isMemberWorkingOut(
  supabase: SupabaseClient,
  memberId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("member_active_workout")
    .select("updated_at")
    .eq("member_id", memberId)
    .maybeSingle();

  if (error || !data?.updated_at) return false;
  return Date.now() - new Date(data.updated_at).getTime() < STALE_MS;
}
