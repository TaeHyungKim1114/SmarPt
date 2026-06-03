"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { TrainerFeedbackCard } from "@/components/member/TrainerFeedbackCard";
import { createClient } from "@/lib/supabase/client";
import { getTrainerLinkForMember } from "@/lib/trainer-link";
import { toDateString } from "@/lib/utils";
import type { Profile } from "@/lib/types";

export default function MemberFeedbackPage() {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [trainer, setTrainer] = useState<Profile | null>(null);
  const [selectedDate] = useState(new Date());
  const dateStr = toDateString(selectedDate);

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const link = await getTrainerLinkForMember(supabase, user.id);
      if (!link) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", link.trainerId)
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

  if (!trainer) {
    return (
      <div className="px-6 py-12 text-center">
        <p className="text-gray-600">연결된 트레이너가 없습니다.</p>
        <Link href="/member/profile" className="btn-primary mt-6 inline-block">
          트레이너 연결하기
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <header className="mb-4">
        <h1 className="text-xl font-bold">트레이너 피드백</h1>
        <p className="text-sm text-gray-500">
          {format(selectedDate, "M월 d일 (EEE)", { locale: ko })}
        </p>
      </header>

      <TrainerFeedbackCard
        memberId={userId}
        reportDate={dateStr}
        trainerName={trainer.full_name}
      />

      <p className="mt-4 text-center text-xs text-gray-400">
        트레이너가 운동·식단 피드백을 내면 각각 여기에 표시됩니다.
      </p>
    </div>
  );
}
