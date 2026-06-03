"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Copy, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

type MemberWithProfile = {
  member_id: string;
  member: Profile;
};

export default function TrainerHomePage() {
  const supabase = createClient();
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("invite_code, full_name")
        .eq("id", user.id)
        .single();

      setInviteCode(profile?.invite_code ?? null);

      const { data: links } = await supabase
        .from("trainer_members")
        .select("member_id")
        .eq("trainer_id", user.id);

      const ids = (links || []).map((l) => l.member_id);
      if (ids.length === 0) {
        setMembers([]);
        return;
      }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("id", ids);

      setMembers(
        (profiles || []).map((member) => ({
          member_id: member.id,
          member,
        }))
      );
    };
    load();
  }, [supabase]);

  const copyCode = () => {
    if (!inviteCode) return;
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="px-4 py-6">
      <header className="mb-6">
        <h1 className="text-xl font-bold">내 회원</h1>
        <p className="text-sm text-gray-500">회원별 운동·식단·채팅</p>
      </header>

      {inviteCode && (
        <div className="card mb-6 border border-blue-100 bg-blue-50/50">
          <p className="text-sm font-medium text-gray-600">회원 초대 코드</p>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-2xl font-bold tracking-widest text-blue-600">
              {inviteCode}
            </span>
            <button
              type="button"
              onClick={copyCode}
              className="flex items-center gap-1 rounded-lg bg-white px-3 py-2 text-sm font-medium shadow-sm"
            >
              <Copy className="h-4 w-4" />
              {copied ? "복사됨!" : "복사"}
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            회원이 가입 시 이 코드를 입력하면 자동 연결됩니다
          </p>
        </div>
      )}

      {members.length === 0 ? (
        <div className="card py-12 text-center">
          <Users className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-gray-500">아직 연결된 회원이 없습니다</p>
          <p className="mt-1 text-sm text-gray-400">
            초대 코드를 회원에게 공유하세요
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {members.map(({ member_id, member }) => (
            <li key={member_id}>
              <Link
                href={`/trainer/member/${member_id}`}
                className="card flex items-center justify-between transition hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-600">
                    {member.full_name?.[0] || "?"}
                  </div>
                  <div>
                    <p className="font-semibold">{member.full_name}</p>
                    <p className="text-xs text-gray-400">{member.email}</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-300" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
