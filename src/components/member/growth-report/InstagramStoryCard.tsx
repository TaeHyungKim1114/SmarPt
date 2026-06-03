"use client";

import { forwardRef } from "react";
import { Dumbbell, Sparkles, TrendingUp } from "lucide-react";
import {
  formatWeekRange,
  type MonthlyGrowthReport,
  type WeeklyGrowthReport,
} from "@/lib/member-growth-report";
import { CHART } from "./chartTheme";
import { STORY_HEIGHT, STORY_WIDTH } from "./downloadStory";

type StoryProps =
  | { mode: "weekly"; data: WeeklyGrowthReport; memberName: string }
  | { mode: "monthly"; data: MonthlyGrowthReport; memberName: string };

export const InstagramStoryCard = forwardRef<HTMLDivElement, StoryProps>(
  function InstagramStoryCard({ mode, data, memberName }, ref) {
    const isWeekly = mode === "weekly";

    const title = isWeekly
      ? "담당 트레이너와 함께 달성한\n이번 주의 기록"
      : "1개월간의 위대한 변화";

    const subtitle = isWeekly
      ? formatWeekRange(data.weekStart, data.weekEnd)
      : data.monthLabel;

    const heroStat = isWeekly
      ? {
          value: `${data.totalVolumeKg.toLocaleString()}`,
          unit: "kg",
          label: "주간 누적 볼륨",
        }
      : {
          value: `${data.attendanceRatePct}`,
          unit: "%",
          label: "월간 출석률",
        };

    const secondaryStats = isWeekly
      ? [
          { label: "출석 일수", value: `${data.workoutDays}일` },
          { label: "운동 시간", value: `${data.totalWorkoutMinutes}분` },
        ]
      : [
          { label: "운동 일수", value: `${data.workoutDays}일` },
          { label: "총 볼륨", value: `${data.totalVolumeKg.toLocaleString()}kg` },
        ];

    const trainerLine =
      data.trainerComment ||
      (data.trainerName
        ? `${data.trainerName} 트레이너와 함께 성장 중`
        : "SmarPt와 함께 성장 중");

    return (
      <div
        ref={ref}
        className="relative overflow-hidden bg-[#f7f8f4] text-gray-900"
        style={{
          width: STORY_WIDTH,
          height: STORY_HEIGHT,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          className="absolute inset-0 opacity-60"
          style={{
            background: `radial-gradient(ellipse 80% 50% at 50% 0%, ${CHART.mutedBar} 0%, transparent 55%), radial-gradient(ellipse 60% 40% at 100% 80%, ${CHART.primary}33 0%, transparent 50%)`,
          }}
        />

        <div className="relative flex h-full flex-col px-16 py-20">
          <div className="mb-6 flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-lime-300 bg-lime-100">
              <Dumbbell className="h-10 w-10 text-lime-700" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-3xl font-black tracking-tight text-lime-700">
                SmarPt
              </p>
              <p className="text-xl text-gray-500">PT Growth Report</p>
            </div>
          </div>

          <h1 className="whitespace-pre-line text-5xl font-black leading-tight tracking-tight text-gray-900">
            {title}
          </h1>
          <p className="mt-4 text-2xl font-semibold text-lime-600">{subtitle}</p>
          <p className="mt-2 text-3xl text-gray-700">{memberName}</p>

          <div className="mt-16 rounded-3xl border-2 border-lime-200 bg-white p-12 shadow-lg">
            <p className="text-2xl font-medium text-gray-500">{heroStat.label}</p>
            <p className="mt-2 flex items-baseline gap-2">
              <span className="text-8xl font-black text-lime-600">
                {heroStat.value}
              </span>
              <span className="text-4xl font-bold text-lime-500">
                {heroStat.unit}
              </span>
            </p>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-6">
            {secondaryStats.map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-lime-100 bg-white p-8 shadow-sm"
              >
                <p className="text-xl text-gray-500">{s.label}</p>
                <p className="mt-2 text-4xl font-bold text-lime-700">
                  {s.value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-auto rounded-2xl border border-lime-200 bg-white p-10 shadow-md">
            <div className="mb-3 flex items-center gap-3 text-lime-700">
              <Sparkles className="h-8 w-8" />
              <span className="text-2xl font-bold">트레이너 한마디</span>
            </div>
            <p className="text-3xl leading-snug text-gray-800">{trainerLine}</p>
          </div>

          <div className="mt-8 flex items-center justify-center gap-2 text-xl text-gray-400">
            <TrendingUp className="h-6 w-6 text-lime-600" />
            <span>#SmarPt #PT성장리포트</span>
          </div>
        </div>
      </div>
    );
  }
);
