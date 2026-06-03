"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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

      const { data: link } = await supabase
        .from("trainer_members")
        .select("trainer_id")
        .eq("member_id", user.id)
        .maybeSingle();

      if (link) {
        const { data: trainer } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", link.trainer_id)
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

    const { error } = await supabase.from("trainer_members").insert({
      trainer_id: trainer.id,
      member_id: profile.id,
    });

    if (error) {
      setMessage(error.message.includes("unique")
        ? "이미 연결된 트레이너가 있습니다."
        : error.message);
      return;
    }

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

      <div className="card mb-4">
        <p className="text-sm text-gray-500">이름</p>
        <p className="font-semibold">{profile?.full_name}</p>
        <p className="mt-3 text-sm text-gray-500">이메일</p>
        <p className="text-sm">{profile?.email}</p>
      </div>

      <div className="card mb-4">
        <p className="mb-2 font-semibold">내 트레이너</p>
        {trainerName ? (
          <p className="text-blue-600">{trainerName} 트레이너</p>
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
          <p className="mt-2 text-sm text-blue-600">{message}</p>
        )}
      </div>

      <button type="button" onClick={logout} className="btn-secondary w-full">
        로그아웃
      </button>
    </div>
  );
}
