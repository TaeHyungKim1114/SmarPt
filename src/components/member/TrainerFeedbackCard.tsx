"use client";

import { useCallback, useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { Dumbbell, MessageSquare, UtensilsCrossed } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { parseTrainerFeedback } from "@/lib/daily-report";

type TrainerFeedbackCardProps = {
  memberId: string;
  reportDate: string;
  trainerName?: string | null;
};

function FeedbackBlock({
  icon: Icon,
  title,
  content,
  accent,
}: {
  icon: typeof Dumbbell;
  title: string;
  content: string;
  accent: "blue" | "emerald";
}) {
  const styles =
    accent === "blue"
      ? {
          border: "border-lime-100",
          bg: "bg-lime-50/40",
          icon: "text-lime-600",
          title: "text-lime-900",
        }
      : {
          border: "border-emerald-100",
          bg: "bg-emerald-50/40",
          icon: "text-emerald-600",
          title: "text-emerald-900",
        };

  return (
    <div className={`rounded-xl border p-4 ${styles.border} ${styles.bg}`}>
      <div className="mb-2 flex items-center gap-2">
        <Icon className={`h-4 w-4 ${styles.icon}`} />
        <h4 className={`text-sm font-bold ${styles.title}`}>{title}</h4>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
        {content}
      </p>
    </div>
  );
}

export function TrainerFeedbackCard({
  memberId,
  reportDate,
  trainerName,
}: TrainerFeedbackCardProps) {
  const supabase = createClient();
  const [workoutMemo, setWorkoutMemo] = useState<string | null>(null);
  const [dietMemo, setDietMemo] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("daily_reports")
      .select(
        "trainer_memo, trainer_workout_memo, trainer_diet_memo, updated_at"
      )
      .eq("member_id", memberId)
      .eq("report_date", reportDate)
      .maybeSingle();

    if (error) {
      console.warn("feedback load", error.message);
      setLoading(false);
      return;
    }

    const parsed = parseTrainerFeedback(data);
    setWorkoutMemo(parsed.workout);
    setDietMemo(parsed.diet);
    setUpdatedAt(data?.updated_at ?? null);
    setLoading(false);
  }, [supabase, memberId, reportDate]);

  useEffect(() => {
    setLoading(true);
    load();

    const channel = supabase
      .channel(`member-feedback:${memberId}:${reportDate}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "daily_reports",
          filter: `member_id=eq.${memberId}`,
        },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [memberId, reportDate, load, supabase]);

  if (loading) {
    return (
      <div className="card animate-pulse border border-lime-100 bg-lime-50/30 py-6">
        <div className="mx-auto h-4 w-32 rounded bg-lime-100" />
      </div>
    );
  }

  const hasAny = workoutMemo || dietMemo;

  if (!hasAny) {
    return (
      <div className="card border border-dashed border-gray-200 bg-gray-50/50 py-4 text-center">
        <MessageSquare className="mx-auto mb-2 h-6 w-6 text-gray-300" />
        <p className="text-sm text-gray-500">
          {trainerName ? `${trainerName} 트레이너의` : "트레이너"} 운동·식단
          피드백이 아직 없습니다
        </p>
      </div>
    );
  }

  const title = trainerName
    ? `${trainerName} 트레이너 피드백`
    : "트레이너 피드백";

  return (
    <section className="card border-2 border-lime-100 bg-gradient-to-br from-lime-50 to-white">
      <div className="mb-3 flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-lime-700" />
        <h3 className="font-bold text-lime-900">{title}</h3>
      </div>

      <div className="space-y-3">
        {workoutMemo && (
          <FeedbackBlock
            icon={Dumbbell}
            title="운동 피드백"
            content={workoutMemo}
            accent="blue"
          />
        )}
        {dietMemo && (
          <FeedbackBlock
            icon={UtensilsCrossed}
            title="식단 피드백"
            content={dietMemo}
            accent="emerald"
          />
        )}
      </div>

      {updatedAt && (
        <p className="mt-3 text-xs text-lime-600">
          {format(parseISO(updatedAt), "M월 d일 a h:mm", { locale: ko })} 전달
        </p>
      )}
    </section>
  );
}
