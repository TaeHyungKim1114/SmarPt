"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronRight, MessageCircle, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  fetchTrainerChatThreads,
  type ChatThreadPreview,
} from "@/lib/trainer-chat";

export default function TrainerChatListPage() {
  const supabase = createClient();
  const [trainerId, setTrainerId] = useState<string | null>(null);
  const [threads, setThreads] = useState<ChatThreadPreview[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    setTrainerId(user.id);
    const list = await fetchTrainerChatThreads(supabase, user.id);
    setThreads(list);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();

    if (!trainerId) return;

    const channel = supabase
      .channel(`trainer-chat-list:${trainerId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `trainer_id=eq.${trainerId}`,
        },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [load, supabase, trainerId]);

  return (
    <div className="px-4 py-6">
      <header className="mb-6">
        <div className="mb-1 flex items-center gap-2 text-lime-600">
          <MessageCircle className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase tracking-wide">
            Chat
          </span>
        </div>
        <h1 className="text-xl font-bold">채팅</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          담당 회원과 대화하세요
        </p>
      </header>

      {loading ? (
        <div className="py-16 text-center text-sm text-gray-400">
          불러오는 중...
        </div>
      ) : threads.length === 0 ? (
        <div className="card py-12 text-center">
          <Users className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-gray-600">채팅할 회원이 없습니다</p>
          <p className="mt-1 text-sm text-gray-400">
            회원 탭에서 초대 코드를 공유해 연결하세요
          </p>
          <Link href="/trainer" className="btn-primary mt-6 inline-block">
            회원 목록으로
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {threads.map(({ memberId, member, lastMessage, lastMessageAt, lastSenderId }) => {
            const isFromMember =
              lastSenderId && trainerId && lastSenderId !== trainerId;

            return (
              <li key={memberId}>
                <Link
                  href={`/trainer/chat/${memberId}`}
                  className="card flex items-center gap-3 transition hover:shadow-md"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-lime-100 text-lg font-bold text-lime-600">
                    {member.full_name?.[0] ?? "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="min-w-0 font-semibold">{member.full_name}</p>
                      {lastMessageAt && (
                        <span className="shrink-0 text-[11px] text-gray-400">
                          {format(parseISO(lastMessageAt), "M/d HH:mm", {
                            locale: ko,
                          })}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-sm text-gray-500">
                      {lastMessage
                        ? `${isFromMember ? "" : "나: "}${lastMessage}`
                        : "대화를 시작해 보세요"}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-gray-300" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
