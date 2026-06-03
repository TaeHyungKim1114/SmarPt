import type { SupabaseClient } from "@supabase/supabase-js";

export type TrainerLink = {
  trainerId: string;
  memberId: string;
};

/** 회원 ↔ 트레이너 연결 (trainer_members 우선, 없으면 pt_connections) */
export async function getTrainerLinkForMember(
  supabase: SupabaseClient,
  memberId: string
): Promise<TrainerLink | null> {
  const { data: tm } = await supabase
    .from("trainer_members")
    .select("trainer_id, member_id")
    .eq("member_id", memberId)
    .maybeSingle();

  if (tm?.trainer_id) {
    return { trainerId: tm.trainer_id, memberId: tm.member_id };
  }

  const { data: pc } = await supabase
    .from("pt_connections")
    .select("trainer_id, member_id")
    .eq("member_id", memberId)
    .eq("status", "active")
    .maybeSingle();

  if (pc?.trainer_id) {
    return { trainerId: pc.trainer_id, memberId: pc.member_id };
  }

  return null;
}

export async function getMemberIdsForTrainer(
  supabase: SupabaseClient,
  trainerId: string
): Promise<string[]> {
  const { data: tm } = await supabase
    .from("trainer_members")
    .select("member_id")
    .eq("trainer_id", trainerId);

  const ids = new Set((tm ?? []).map((r) => r.member_id));

  const { data: pc } = await supabase
    .from("pt_connections")
    .select("member_id")
    .eq("trainer_id", trainerId)
    .eq("status", "active");

  for (const row of pc ?? []) {
    ids.add(row.member_id);
  }

  return [...ids];
}
