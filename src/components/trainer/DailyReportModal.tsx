"use client";

import { useCallback, useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import {
  Dumbbell,
  Loader2,
  Send,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  fetchDaySummary,
  parseTrainerFeedback,
  saveTrainerFeedback,
  type DaySummary,
} from "@/lib/daily-report";
import { formatWorkoutDurationLabel } from "@/lib/workout-stats";
import { toDateString } from "@/lib/utils";
import type { Profile } from "@/lib/types";

type DailyReportModalProps = {
  member: Profile;
  reportDate?: Date;
  open: boolean;
  onClose: () => void;
};

function formatVolume(n: number): string {
  return n.toLocaleString("ko-KR");
}

export function DailyReportModal({
  member,
  reportDate = new Date(),
  open,
  onClose,
}: DailyReportModalProps) {
  const supabase = createClient();
  const dateStr = toDateString(reportDate);

  const [summary, setSummary] = useState<DaySummary | null>(null);
  const [trainerId, setTrainerId] = useState<string | null>(null);
  const [workoutMemo, setWorkoutMemo] = useState("");
  const [dietMemo, setDietMemo] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [live, setLive] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    const data = await fetchDaySummary(supabase, member.id, dateStr);
    setSummary(data);
    const feedback = parseTrainerFeedback(data.dailyReport);
    setWorkoutMemo(feedback.workout ?? "");
    setDietMemo(feedback.diet ?? "");
    setLoading(false);
  }, [supabase, member.id, dateStr]);

  useEffect(() => {
    if (!open) return;
    load();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setTrainerId(user.id);
    });
  }, [open, load, supabase.auth]);

  useEffect(() => {
    if (!open || !member.id) return;

    const channel = supabase
      .channel(`daily-report:${member.id}:${dateStr}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "exercises",
          filter: `user_id=eq.${member.id}`,
        },
        () => {
          setLive(true);
          load();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "meals",
          filter: `user_id=eq.${member.id}`,
        },
        () => {
          setLive(true);
          load();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "workouts",
          filter: `member_id=eq.${member.id}`,
        },
        () => {
          setLive(true);
          load();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "diet_logs",
          filter: `member_id=eq.${member.id}`,
        },
        () => {
          setLive(true);
          load();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "daily_reports",
          filter: `member_id=eq.${member.id}`,
        },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, member.id, dateStr, load, supabase]);

  const submitFeedback = async () => {
    if (!trainerId || !summary) return;
    if (!workoutMemo.trim() && !dietMemo.trim()) {
      setMessage("운동 또는 식단 피드백을 입력해 주세요.");
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      await saveTrainerFeedback(supabase, {
        memberId: member.id,
        trainerId,
        reportDate: dateStr,
        workoutMemo,
        dietMemo,
        summary,
      });
      setMessage("피드백이 저장되었습니다.");
      await load();
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "피드백 저장에 실패했습니다."
      );
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-label="닫기"
        onClick={onClose}
      />

      <div className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <header className="flex items-start justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <p className="text-xs font-semibold text-lime-600">오늘 요약</p>
            <h2 className="text-lg font-bold">{member.full_name}</h2>
            <p className="text-sm text-gray-500">
              {format(reportDate, "yyyy년 M월 d일 (EEE)", { locale: ko })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {live && (
          <div className="bg-lime-50 px-5 py-2 text-center text-xs font-medium text-lime-700">
            회원 기록이 실시간으로 반영되었습니다
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-lime-600" />
            </div>
          ) : summary ? (
            <div className="space-y-5">
              {/* 운동 요약 — 번핏 스타일 */}
              <section>
                <div className="mb-3 flex items-center gap-2">
                  <Dumbbell className="h-5 w-5 text-lime-600" />
                  <h3 className="font-bold">운동 요약</h3>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-2xl bg-lime-600 p-3 text-center text-white">
                    <p className="text-2xl font-bold">
                      {summary.workout.exerciseCount}
                    </p>
                    <p className="text-[10px] opacity-90">종목</p>
                  </div>
                  <div className="rounded-2xl bg-lime-50 p-3 text-center">
                    <p className="text-2xl font-bold text-lime-700">
                      {summary.workout.setCount}
                    </p>
                    <p className="text-[10px] text-lime-600/80">세트</p>
                  </div>
                  <div className="rounded-2xl bg-white p-3 text-center ring-1 ring-lime-200">
                    <p className="font-mono text-lg font-bold text-lime-800 tabular-nums">
                      {formatWorkoutDurationLabel(
                        summary.workout.workoutDurationSec
                      )}
                    </p>
                    <p className="text-[10px] text-lime-600/80">운동시간</p>
                  </div>
                  <div className="rounded-2xl bg-lime-800 p-3 text-center text-white">
                    <p className="text-xl font-bold leading-tight">
                      {formatVolume(summary.workout.totalVolumeKg)}
                    </p>
                    <p className="text-[10px] opacity-90">총 볼륨(kg)</p>
                  </div>
                </div>

                {summary.workout.exercises.length === 0 ? (
                  <p className="mt-3 text-center text-sm text-gray-400">
                    오늘 운동 기록이 없습니다
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {summary.workout.exercises.map((ex) => (
                      <li
                        key={ex.name}
                        className="rounded-xl border border-gray-100 bg-gray-50/50 p-3"
                      >
                        <p className="mb-2 font-semibold text-gray-900">
                          {ex.name}
                        </p>
                        <div className="space-y-1">
                          {ex.sets.map((s, i) => (
                            <div
                              key={i}
                              className="flex justify-between text-sm text-gray-600"
                            >
                              <span className="text-gray-400">
                                세트 {i + 1}
                              </span>
                              <span>
                                <strong>{s.weight}</strong>kg ×{" "}
                                <strong>{s.reps}</strong>회
                                <span className="ml-2 text-lime-600">
                                  = {formatVolume(s.volume)}kg
                                </span>
                              </span>
                            </div>
                          ))}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-4 rounded-2xl border-2 border-lime-100 bg-lime-50/30 p-4">
                  <h4 className="mb-2 text-sm font-bold text-lime-900">
                    운동 피드백
                  </h4>
                  <textarea
                    className="input-field min-h-[88px] resize-none bg-white"
                    placeholder="오늘 운동에 대한 코멘트를 작성하세요..."
                    value={workoutMemo}
                    onChange={(e) => setWorkoutMemo(e.target.value)}
                  />
                </div>
              </section>

              {/* 식단 요약 */}
              <section>
                <div className="mb-3 flex items-center gap-2">
                  <UtensilsCrossed className="h-5 w-5 text-emerald-600" />
                  <h3 className="font-bold">식단 요약</h3>
                </div>

                {summary.meals.items.length === 0 ? (
                  <p className="text-center text-sm text-gray-400">
                    오늘 식단 기록이 없습니다
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {summary.meals.items.map((m) => (
                      <li
                        key={`${m.meal_type}-${m.foods}`}
                        className="overflow-hidden rounded-xl border border-gray-100"
                      >
                        {m.photo_url && (
                          <div className="relative aspect-video w-full bg-gray-100">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={m.photo_url}
                              alt={`${m.label} 식단`}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        )}
                        <div className="bg-white p-3">
                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-sm font-semibold text-emerald-700">
                              {m.label}
                            </span>
                            {m.calories != null && (
                              <span className="text-xs text-gray-500">
                                {m.calories} kcal
                              </span>
                            )}
                          </div>
                          <p className="whitespace-pre-wrap text-sm text-gray-700">
                            {m.foods || "(사진만 등록)"}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-4 rounded-2xl border-2 border-emerald-100 bg-emerald-50/30 p-4">
                  <h4 className="mb-2 text-sm font-bold text-emerald-900">
                    식단 피드백
                  </h4>
                  <textarea
                    className="input-field min-h-[88px] resize-none bg-white"
                    placeholder="오늘 식단에 대한 코멘트를 작성하세요..."
                    value={dietMemo}
                    onChange={(e) => setDietMemo(e.target.value)}
                  />
                </div>
              </section>

              {summary.dailyReport?.updated_at && (
                <p className="text-center text-[11px] text-gray-400">
                  마지막 저장:{" "}
                  {format(
                    parseISO(summary.dailyReport.updated_at),
                    "M/d HH:mm",
                    { locale: ko }
                  )}
                </p>
              )}
              {message && (
                <p
                  className={`text-center text-sm ${
                    message.includes("저장되었")
                      ? "text-emerald-600"
                      : "text-red-600"
                  }`}
                >
                  {message}
                </p>
              )}
              <button
                type="button"
                onClick={submitFeedback}
                disabled={saving}
                className="btn-primary flex w-full items-center justify-center gap-2"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                피드백 전송
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
