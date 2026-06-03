"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getTrainerLinkForMember } from "@/lib/trainer-link";
import type { Profile } from "@/lib/types";

export default function MemberProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [inviteCode, setInviteCode] = useState("");
  const [trainerName, setTrainerName] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: p } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setProfile(p);

      const link = await getTrainerLinkForMember(supabase, user.id);
      if (link) {
        const { data: trainer } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", link.trainerId)
          .single();
        setTrainerName(trainer?.full_name ?? null);
      }
    };
    load();
  }, [supabase]);

  const linkTrainer = async () => {
    if (!profile || !inviteCode.trim()) return;

    const { data: trainer } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("invite_code", inviteCode.toUpperCase())
      .eq("role", "trainer")
      .single();

    if (!trainer) {
      setMessage("유효하지 않은 초대 코드입니다.");
      return;
    }

    const { error: tmError } = await supabase.from("trainer_members").insert({
      trainer_id: trainer.id,
      member_id: profile.id,
    });

    if (tmError && !tmError.message.includes("unique")) {
      setMessage(tmError.message);
      return;
    }

    await supabase.from("pt_connections").upsert(
      {
        trainer_id: trainer.id,
        member_id: profile.id,
        status: "active",
      },
      { onConflict: "trainer_id,member_id", ignoreDuplicates: false }
    );

    setTrainerName(trainer.full_name);
    setMessage("트레이너와 연결되었습니다!");
    setInviteCode("");
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <div className="px-4 py-6">
      <h1 className="mb-6 text-xl font-bold">내 정보</h1>

      <Link
        href="/member/report"
        className="card mb-4 flex items-center gap-3 border border-lime-200 bg-gradient-to-r from-lime-50 to-white p-4 transition hover:shadow-md"
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-lime-100">
          <TrendingUp className="h-6 w-6 text-lime-600" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-gray-900">PT 성장 리포트</p>
          <p className="text-sm text-gray-500">주간·월간 기록과 인스타 스토리 공유</p>
        </div>
      </Link>

      <div className="card mb-4">
        <p className="text-sm text-gray-500">이름</p>
        <p className="font-semibold">{profile?.full_name}</p>
        <p className="mt-3 text-sm text-gray-500">이메일</p>
        <p className="text-sm">{profile?.email}</p>
      </div>

      <div className="card mb-4">
        <p className="mb-2 font-semibold">내 트레이너</p>
        {trainerName ? (
          <p className="text-lime-600">{trainerName} 트레이너</p>
        ) : (
          <>
            <p className="mb-3 text-sm text-gray-500">
              트레이너 초대 코드를 입력해 연결하세요
            </p>
            <div className="flex gap-2">
              <input
                className="input-field flex-1 uppercase"
                placeholder="초대 코드"
                maxLength={6}
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
              />
              <button type="button" onClick={linkTrainer} className="btn-primary">
                연결
              </button>
            </div>
          </>
        )}
        {message && (
          <p className="mt-2 text-sm text-lime-600">{message}</p>
        )}
      </div>

      <button type="button" onClick={logout} className="btn-secondary w-full">
        로그아웃
      </button>
    </div>
  );
}
