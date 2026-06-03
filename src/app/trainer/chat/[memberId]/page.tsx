"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Chat } from "@/components/Chat";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

export default function TrainerChatRoomPage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = use(params);
  const supabase = createClient();
  const [trainerId, setTrainerId] = useState<string | null>(null);
  const [member, setMember] = useState<Profile | null>(null);

  useEffect(() => {
    const load = async () => {
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
    };
    load();
  }, [memberId, supabase]);

  if (!trainerId) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-400">
        로딩 중...
      </div>
    );
  }

  return (
    <div>
      <header className="flex items-center gap-3 border-b border-gray-100 bg-white px-4 py-4">
        <Link href="/trainer/chat" className="rounded-lg p-1 hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5 text-gray-500" />
        </Link>
        <h1 className="min-w-0 truncate font-bold">
          {member?.full_name ?? "회원"}
        </h1>
      </header>
      <Chat
        trainerId={trainerId}
        memberId={memberId}
        currentUserId={trainerId}
      />
    </div>
  );
}
