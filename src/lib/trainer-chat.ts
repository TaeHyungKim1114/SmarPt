import type { SupabaseClient } from "@supabase/supabase-js";
import { getMemberIdsForTrainer } from "@/lib/trainer-link";
import type { Profile } from "@/lib/types";

export type ChatThreadPreview = {
  memberId: string;
  member: Profile;
  lastMessage: string | null;
  lastMessageAt: string | null;
  lastSenderId: string | null;
};

export async function fetchTrainerChatThreads(
  supabase: SupabaseClient,
  trainerId: string
): Promise<ChatThreadPreview[]> {
  const memberIds = await getMemberIdsForTrainer(supabase, trainerId);
  if (memberIds.length === 0) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .in("id", memberIds);

  const { data: messages } = await supabase
    .from("messages")
    .select("member_id, content, created_at, sender_id")
    .eq("trainer_id", trainerId)
    .in("member_id", memberIds)
    .order("created_at", { ascending: false });

  const lastByMember = new Map<
    string,
    { content: string; created_at: string; sender_id: string }
  >();

  for (const msg of messages ?? []) {
    if (!lastByMember.has(msg.member_id)) {
      lastByMember.set(msg.member_id, {
        content: msg.content,
        created_at: msg.created_at,
        sender_id: msg.sender_id,
      });
    }
  }

  const threads: ChatThreadPreview[] = (profiles ?? []).map((member) => {
    const last = lastByMember.get(member.id);
    return {
      memberId: member.id,
      member,
      lastMessage: last?.content ?? null,
      lastMessageAt: last?.created_at ?? null,
      lastSenderId: last?.sender_id ?? null,
    };
  });

  threads.sort((a, b) => {
    if (!a.lastMessageAt && !b.lastMessageAt) {
      return a.member.full_name.localeCompare(b.member.full_name, "ko");
    }
    if (!a.lastMessageAt) return 1;
    if (!b.lastMessageAt) return -1;
    return b.lastMessageAt.localeCompare(a.lastMessageAt);
  });

  return threads;
}
