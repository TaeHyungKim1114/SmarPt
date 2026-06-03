"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, LayoutDashboard, RefreshCw, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  fetchTrainerDashboard,
  type TrainerDashboardData,
} from "@/lib/trainer-dashboard";
import { AtRiskAlert } from "@/components/trainer/AtRiskAlert";
import { DailyReportModal } from "@/components/trainer/DailyReportModal";
import { MemberTable } from "@/components/trainer/MemberTable";
import { StatCards } from "@/components/trainer/StatCards";
import type { Profile } from "@/lib/types";

export default function TrainerDashboardPage() {
  const supabase = createClient();
  const [data, setData] = useState<TrainerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [reportMember, setReportMember] = useState<Profile | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("로그인이 필요합니다.");
      setLoading(false);
      return;
    }

    try {
      const dashboard = await fetchTrainerDashboard(user.id);
      setData(dashboard);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "대시보드 데이터를 불러오지 못했습니다."
      );
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const copyCode = () => {
    if (!data?.inviteCode) return;
    navigator.clipboard.writeText(data.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <RefreshCw className="h-4 w-4 animate-spin" />
          대시보드 불러오는 중...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-8">
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
        <button type="button" onClick={load} className="btn-primary mt-4">
          다시 시도
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { stats, members, trainerName, inviteCode } = data;

  return (
    <div className="px-4 py-6">
      <header className="mb-6 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2 text-lime-600">
            <LayoutDashboard className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wide">
              Business Dashboard
            </span>
          </div>
          <h1 className="text-xl font-bold">
            {trainerName}님, 회원 관리
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            담당 회원 활동·이탈 위험을 한눈에 확인하세요
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="shrink-0 rounded-xl border border-gray-200 bg-white p-2.5 text-gray-600 hover:bg-gray-50"
          aria-label="새로고침"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </header>

      <AtRiskAlert members={stats.atRiskMembers} />

      <section className="mb-6 mt-6">
        <StatCards
          totalMembers={stats.totalMembers}
          todayCompletionRate={stats.todayCompletionRate}
          weeklyEngagementRate={stats.weeklyEngagementRate}
        />
      </section>

      {inviteCode && (
        <div className="card mb-6 flex items-center justify-between gap-3 border border-lime-100 bg-lime-50/40 py-3">
          <div>
            <p className="text-xs font-medium text-gray-500">회원 초대 코드</p>
            <p className="font-mono text-lg font-bold tracking-widest whitespace-nowrap text-lime-600">
              {inviteCode}
            </p>
          </div>
          <button
            type="button"
            onClick={copyCode}
            className="flex items-center gap-1 rounded-lg bg-white px-3 py-2 text-sm font-medium shadow-sm"
          >
            <Copy className="h-4 w-4" />
            {copied ? "복사됨" : "복사"}
          </button>
        </div>
      )}

      <section>
        <div className="mb-3 flex items-center gap-2">
          <Users className="h-4 w-4 text-gray-500" />
          <h2 className="font-bold">담당 회원 목록</h2>
          <span className="text-sm text-gray-400">({members.length}명)</span>
        </div>
        <MemberTable
          members={members}
          onOpenDailyReport={setReportMember}
        />
      </section>

      {reportMember && (
        <DailyReportModal
          member={reportMember}
          open={!!reportMember}
          onClose={() => setReportMember(null)}
        />
      )}
    </div>
  );
}
