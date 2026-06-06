"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ProfileNameEditor } from "@/components/ProfileNameEditor";
import type { Profile } from "@/lib/types";

export default function TrainerProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [copied, setCopied] = useState(false);

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
    };
    load();
  }, [supabase]);

  const copyCode = () => {
    if (!profile?.invite_code) return;
    navigator.clipboard.writeText(profile.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
        <ProfileNameEditor
          profile={profile}
          onUpdated={(fullName) =>
            setProfile((prev) => (prev ? { ...prev, full_name: fullName } : prev))
          }
        />
        <p className="mt-3 text-sm text-gray-500">이메일</p>
        <p className="text-sm">{profile?.email}</p>
      </div>

      {profile?.invite_code && (
        <div className="card mb-4">
          <p className="mb-2 font-semibold">회원 초대 코드</p>
          <div className="flex items-center justify-between">
            <span className="text-xl font-bold tracking-widest text-lime-600">
              {profile.invite_code}
            </span>
            <button
              type="button"
              onClick={copyCode}
              className="flex items-center gap-1 text-sm text-lime-600"
            >
              <Copy className="h-4 w-4" />
              {copied ? "복사됨" : "복사"}
            </button>
          </div>
        </div>
      )}

      <button type="button" onClick={logout} className="btn-secondary w-full">
        로그아웃
      </button>
    </div>
  );
}
