import Link from "next/link";
import { AlertTriangle, MessageCircle } from "lucide-react";
import type { MemberDashboardRow } from "@/lib/trainer-dashboard";

type AtRiskAlertProps = {
  members: MemberDashboardRow[];
};

export function AtRiskAlert({ members }: AtRiskAlertProps) {
  if (members.length === 0) return null;

  return (
    <section className="rounded-2xl border-2 border-red-200 bg-gradient-to-br from-red-50 to-orange-50 p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100">
          <AlertTriangle className="h-5 w-5 text-red-600" />
        </div>
        <div>
          <h2 className="font-bold text-red-800">이탈 위험군</h2>
          <p className="text-xs text-red-600/90">
            3일 이상 운동·식단 기록이 없는 회원 — 선제 케어가 필요합니다
          </p>
        </div>
        <span className="ml-auto rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-bold text-white">
          {members.length}명
        </span>
      </div>

      <ul className="space-y-2">
        {members.slice(0, 5).map((m) => (
          <li
            key={m.memberId}
            className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2.5"
          >
            <div className="min-w-0 flex-1 pr-2">
              <p className="font-semibold text-gray-900">{m.profile.full_name}</p>
              <p className="text-xs whitespace-nowrap text-red-600">
                {m.daysSinceActivity === null
                  ? "기록 없음"
                  : `마지막 활동 ${m.daysSinceActivity}일 전`}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Link
                href={`/trainer/member/${m.memberId}`}
                className="whitespace-nowrap rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white"
              >
                기록 보기
              </Link>
              <Link
                href={`/trainer/chat/${m.memberId}`}
                className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-700"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                채팅
              </Link>
            </div>
          </li>
        ))}
      </ul>

      {members.length > 5 && (
        <p className="mt-2 text-center text-xs text-red-600">
          외 {members.length - 5}명 — 아래 회원 목록에서 확인하세요
        </p>
      )}
    </section>
  );
}
