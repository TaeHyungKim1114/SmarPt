"use client";

import { ClipboardList } from "lucide-react";
import { useWorkoutSession } from "@/hooks/useWorkoutSession";
import type { PlanExercise } from "@/lib/member-plans";
import { WorkoutPlanEditor } from "./WorkoutPlanEditor";
import { DietPlanEditor } from "./DietPlanEditor";

type MemberRoutinePanelProps = {
  memberId: string;
  date: string;
  activeTab: "workout" | "diet";
  hasTodayWorkout?: boolean;
  onStartWorkout?: (exercises: PlanExercise[], notes: string) => void;
};

export function MemberRoutinePanel({
  memberId,
  date,
  activeTab,
  hasTodayWorkout = false,
  onStartWorkout,
}: MemberRoutinePanelProps) {
  const { session } = useWorkoutSession(memberId, date);
  const planLocked = session.started;

  return (
    <section className="mb-4">
      <div className="mb-2 flex items-center gap-2">
        <ClipboardList className="h-4 w-4 text-lime-600" />
        <h2 className="text-sm font-bold text-gray-800">
          {activeTab === "workout" ? "운동" : "식단"}
        </h2>
      </div>

      <div className="mt-1">
        {activeTab === "workout" ? (
          <WorkoutPlanEditor
            memberId={memberId}
            variant="member"
            locked={planLocked}
            hasTodayWorkout={hasTodayWorkout}
            onStartWorkout={onStartWorkout}
          />
        ) : (
          <DietPlanEditor memberId={memberId} variant="member" />
        )}
      </div>
    </section>
  );
}
