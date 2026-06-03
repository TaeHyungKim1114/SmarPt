"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Loader2, Share2, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  fetchMonthlyGrowthReport,
  fetchWeeklyGrowthReport,
  formatWeekRange,
  type MonthlyGrowthReport,
  type WeeklyGrowthReport,
} from "@/lib/member-growth-report";
import { WeeklyCharts } from "./WeeklyCharts";
import { MonthlyCharts } from "./MonthlyCharts";
import { InstagramStoryCard } from "./InstagramStoryCard";
import { downloadInstagramStory } from "./downloadStory";

type Tab = "weekly" | "monthly";

export function GrowthReportPage() {
  const supabase = createClient();
  const storyRef = useRef<HTMLDivElement>(null);

  const [tab, setTab] = useState<Tab>("weekly");
  const [memberName, setMemberName] = useState("회원");
  const [weekly, setWeekly] = useState<WeeklyGrowthReport | null>(null);
  const [monthly, setMonthly] = useState<MonthlyGrowthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    setMemberName(profile?.full_name ?? "회원");

    const [w, m] = await Promise.all([
      fetchWeeklyGrowthReport(supabase, user.id),
      fetchMonthlyGrowthReport(supabase, user.id),
    ]);

    setWeekly(w);
    setMonthly(m);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const title =
    tab === "weekly"
      ? "담당 트레이너와 함께 달성한 이번 주의 기록"
      : "1개월간의 위대한 변화";

  const trainerComment =
    tab === "weekly" ? weekly?.trainerComment : monthly?.trainerComment;

  const handleDownloadStory = async () => {
    setExporting(true);
    setExportError(null);
    try {
      await downloadInstagramStory(
        storyRef.current,
        `smarpt-${tab}-growth-${Date.now()}`
      );
    } catch (e) {
      setExportError(
        e instanceof Error ? e.message : "이미지 저장에 실패했습니다."
      );
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <Loader2 className="h-8 w-8 animate-spin text-lime-600" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 pb-8">
      <header className="mb-5">
        <div className="mb-1 flex items-center gap-2 text-lime-600">
          <Sparkles className="h-4 w-4" />
          <span className="text-xs font-semibold tracking-wide uppercase">
            PT Growth Report
          </span>
        </div>
        <h1 className="text-xl font-bold leading-snug text-gray-900">{title}</h1>
        {tab === "weekly" && weekly && (
          <p className="mt-1 text-sm text-gray-500">
            {formatWeekRange(weekly.weekStart, weekly.weekEnd)}
            {weekly.trainerName ? ` · ${weekly.trainerName} 트레이너` : ""}
          </p>
        )}
        {tab === "monthly" && monthly && (
          <p className="mt-1 text-sm text-gray-500">
            {monthly.monthLabel}
            {monthly.trainerName ? ` · ${monthly.trainerName} 트레이너` : ""}
          </p>
        )}
      </header>

      <div className="flex rounded-xl border border-gray-200 bg-gray-100 p-1">
        <button
          type="button"
          onClick={() => setTab("weekly")}
          className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition ${
            tab === "weekly"
              ? "bg-white text-lime-700 shadow-sm ring-1 ring-lime-200"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          주간 리포트
        </button>
        <button
          type="button"
          onClick={() => setTab("monthly")}
          className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition ${
            tab === "monthly"
              ? "bg-white text-lime-700 shadow-sm ring-1 ring-lime-200"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          월간 리포트
        </button>
      </div>

      <div className="mt-5">
        {tab === "weekly" && weekly && <WeeklyCharts data={weekly} />}
        {tab === "monthly" && monthly && <MonthlyCharts data={monthly} />}
      </div>

      <section className="card mt-6 border border-lime-100 bg-lime-50/40">
        <p className="text-xs font-semibold text-lime-700">트레이너 종합 평가</p>
        <p className="mt-2 text-sm leading-relaxed text-gray-700">
          {trainerComment ||
            "아직 등록된 코멘트가 없습니다. 트레이너의 피드백을 기다려 보세요!"}
        </p>
      </section>

      <div className="mt-6 space-y-2">
        <button
          type="button"
          onClick={handleDownloadStory}
          disabled={exporting || (tab === "weekly" ? !weekly : !monthly)}
          className="btn-primary flex w-full items-center justify-center gap-2"
        >
          {exporting ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Share2 className="h-5 w-5" />
          )}
          인스타 스토리용 이미지 저장 (1080×1920)
        </button>
        <p className="flex items-center justify-center gap-1 text-center text-[11px] text-gray-400">
          <Download className="h-3 w-3" />
          modern-screenshot으로 PNG 다운로드
        </p>
        {exportError && (
          <p className="text-center text-xs text-red-500">{exportError}</p>
        )}
      </div>

      <div
        className="pointer-events-none fixed overflow-hidden opacity-0"
        style={{ left: -9999, top: 0 }}
        aria-hidden
      >
        {tab === "weekly" && weekly && (
          <InstagramStoryCard
            ref={storyRef}
            mode="weekly"
            data={weekly}
            memberName={memberName}
          />
        )}
        {tab === "monthly" && monthly && (
          <InstagramStoryCard
            ref={storyRef}
            mode="monthly"
            data={monthly}
            memberName={memberName}
          />
        )}
      </div>
    </div>
  );
}
