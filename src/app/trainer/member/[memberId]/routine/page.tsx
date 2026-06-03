"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isMemberWorkingOut } from "@/lib/active-workout-sync";
import { WorkoutPlanEditor } from "@/components/plans/WorkoutPlanEditor";
import { DietPlanEditor } from "@/components/plans/DietPlanEditor";
import { MemberWorkingOutBanner } from "@/components/plans/MemberWorkingOutBanner";
import type { Profile } from "@/lib/types";

type PlanTab = "workout" | "diet";

export default function TrainerMemberRoutinePage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = use(params);
  const supabase = createClient();
  const [member, setMember] = useState<Profile | null>(null);
  const [trainerId, setTrainerId] = useState<string | null>(null);
  const [tab, setTab] = useState<PlanTab>("workout");
  const [memberActive, setMemberActive] = useState(false);

  const checkActive = useCallback(async () => {
    setMemberActive(await isMemberWorkingOut(supabase, memberId));
  }, [supabase, memberId]);

  useEffect(() => {
    const init = async () => {
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
      await checkActive();
    };
    init();

    const id = window.setInterval(checkActive, 10_000);
    return () => window.clearInterval(id);
  }, [memberId, checkActive, supabase]);

  return (
    <div className="px-4 py-4">
      <Link
        href={`/trainer/member/${memberId}`}
        className="mb-4 flex items-center gap-1 text-sm text-gray-500"
      >
        <ArrowLeft className="h-4 w-4" />
        회원 기록으로
      </Link>

      <header className="mb-4">
        <div className="mb-1 flex items-center gap-2 text-lime-600">
          <ClipboardList className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase">Routine</span>
        </div>
        <h1 className="text-xl font-bold">{member?.full_name} 루틴 설정</h1>
        <p className="text-sm text-gray-500">
          운동·식단 기본 루틴을 저장하면 회원 화면에 반영됩니다
        </p>
      </header>

      {memberActive && <MemberWorkingOutBanner />}

      <div className="mb-4 flex rounded-xl bg-gray-100 p-1">
        <button
          type="button"
          onClick={() => setTab("workout")}
          className={`flex-1 rounded-lg py-2.5 text-sm font-semibold ${
            tab === "workout"
              ? "bg-white text-lime-600 shadow-sm"
              : "text-gray-500"
          }`}
        >
          운동 루틴
        </button>
        <button
          type="button"
          onClick={() => setTab("diet")}
          className={`flex-1 rounded-lg py-2.5 text-sm font-semibold ${
            tab === "diet"
              ? "bg-white text-emerald-600 shadow-sm"
              : "text-gray-500"
          }`}
        >
          식단 루틴
        </button>
      </div>

      {tab === "workout" ? (
        <WorkoutPlanEditor
          memberId={memberId}
          trainerId={trainerId}
          locked={memberActive}
          showActiveBanner={false}
        />
      ) : (
        <DietPlanEditor memberId={memberId} trainerId={trainerId} />
      )}
    </div>
  );
}
