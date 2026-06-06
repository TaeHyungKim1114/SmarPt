import { Activity, TrendingUp, Users } from "lucide-react";

type StatCardsProps = {
  totalMembers: number;
  todayCompletionRate: number;
  weeklyEngagementRate: number;
};

export function StatCards({
  totalMembers,
  todayCompletionRate,
  weeklyEngagementRate,
}: StatCardsProps) {
  const items = [
    {
      label: "총 담당 회원",
      value: `${totalMembers}명`,
      sub: "연결된 회원 수",
      icon: Users,
      color: "text-lime-600 bg-lime-50",
    },
    {
      label: "오늘 기록 완료율",
      value: `${todayCompletionRate}%`,
      sub: "운동·식단 기록 합산",
      icon: Activity,
      color: "text-emerald-600 bg-emerald-50",
    },
    {
      label: "주간 피드백 이행률",
      value: `${weeklyEngagementRate}%`,
      sub: "7일 중 3일 이상 기록 회원 비율",
      icon: TrendingUp,
      color: "text-lime-700 bg-lime-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {items.map(({ label, value, sub, icon: Icon, color }) => (
        <div key={label} className="card">
          <div
            className={`mb-2 flex h-9 w-9 items-center justify-center rounded-xl ${color}`}
          >
            <Icon className="h-4 w-4" />
          </div>
          <p className="text-xs font-medium leading-snug text-gray-500">{label}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
          <p className="mt-0.5 text-[11px] leading-snug text-gray-400">{sub}</p>
        </div>
      ))}
    </div>
  );
}
