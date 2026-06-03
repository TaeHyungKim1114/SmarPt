"use client";

import { useEffect, useState } from "react";
import { Chat } from "@/components/Chat";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import Link from "next/link";

export default function MemberChatPage() {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [trainer, setTrainer] = useState<Profile | null>(null);
  const [trainerId, setTrainerId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: link } = await supabase
        .from("trainer_members")
        .select("trainer_id")
        .eq("member_id", user.id)
        .maybeSingle();

      if (!link) return;

      setTrainerId(link.trainer_id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", link.trainer_id)
        .single();

      setTrainer(profile);
    };
    load();
  }, [supabase]);

  if (!userId) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-400">
        로딩 중...
      </div>
    );
  }

  if (!trainerId) {
    return (
      <div className="px-6 py-12 text-center">
        <p className="text-gray-600">연결된 트레이너가 없습니다.</p>
        <p className="mt-2 text-sm text-gray-400">
          내 정보에서 트레이너 초대 코드를 입력해 연결하세요.
        </p>
        <Link href="/member/profile" className="btn-primary mt-6 inline-block">
          내 정보로 이동
        </Link>
      </div>
    );
  }

  return (
    <div>
      <header className="border-b border-gray-100 bg-white px-4 py-4">
        <h1 className="text-lg font-bold">채팅</h1>
      </header>
      <Chat
        trainerId={trainerId}
        memberId={userId}
        currentUserId={userId}
        otherUser={trainer}
      />
    </div>
  );
}
