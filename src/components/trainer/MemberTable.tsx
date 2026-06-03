import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { ClipboardList, Dumbbell, UtensilsCrossed } from "lucide-react";
import type { MemberDashboardRow } from "@/lib/trainer-dashboard";
import type { Profile } from "@/lib/types";

type MemberTableProps = {
  members: MemberDashboardRow[];
  onOpenDailyReport?: (member: Profile) => void;
};

function StatusBadge({
  ok,
  label,
}: {
  ok: boolean;
  label: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${
        ok
          ? "bg-emerald-50 text-emerald-700"
          : "bg-gray-100 text-gray-500"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-500" : "bg-gray-300"}`}
      />
      {label}
    </span>
  );
}

function formatLastDate(date: string | null): string {
  if (!date) return "—";
  return format(parseISO(date), "M/d (EEE)", { locale: ko });
}

function MemberIdentity({
  memberId,
  profile,
  onOpenDailyReport,
}: {
  memberId: string;
  profile: Profile;
  onOpenDailyReport?: (member: Profile) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col items-start gap-1">
      {onOpenDailyReport && (
        <button
          type="button"
          onClick={() => onOpenDailyReport(profile)}
          className="inline-flex shrink-0 items-center gap-1 rounded-md bg-lime-600 px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-white"
        >
          <ClipboardList className="h-3 w-3 shrink-0" />
          요약
        </button>
      )}
      <Link
        href={`/trainer/member/${memberId}`}
        className="inline-flex shrink-0 items-center rounded-md border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-lime-600 hover:bg-gray-50"
      >
        상세
      </Link>
      <p className="max-w-full pt-0.5 font-semibold text-gray-900">
        {profile.full_name}
      </p>
    </div>
  );
}

export function MemberTable({ members, onOpenDailyReport }: MemberTableProps) {
  if (members.length === 0) {
    return (
      <div className="card py-12 text-center text-sm text-gray-500">
        연결된 회원이 없습니다. 초대 코드를 공유해 회원을 연결하세요.
      </div>
    );
  }

  return (
    <>
      {/* 모바일: 카드 */}
      <ul className="space-y-2 md:hidden">
        {members.map((m) => (
          <li
            key={m.memberId}
            className={`card ${m.isAtRisk ? "border border-red-100" : ""}`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  m.isAtRisk
                    ? "bg-red-100 text-red-600"
                    : "bg-lime-100 text-lime-600"
                }`}
              >
                {m.profile.full_name?.[0] ?? "?"}
              </div>
              <div className="min-w-0 flex-1">
                <MemberIdentity
                  memberId={m.memberId}
                  profile={m.profile}
                  onOpenDailyReport={onOpenDailyReport}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <StatusBadge ok={m.hasWorkoutToday} label="오늘 운동" />
                  <StatusBadge ok={m.hasDietToday} label="오늘 식단" />
                </div>
                <p className="mt-2 text-xs whitespace-nowrap text-gray-500">
                  최근 운동 {formatLastDate(m.lastWorkoutDate)} · 식단{" "}
                  {formatLastDate(m.lastDietDate)}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* 데스크톱: 테이블 */}
      <div className="card hidden overflow-hidden p-0 md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80 text-xs font-medium whitespace-nowrap text-gray-500">
                <th className="min-w-[9rem] px-4 py-3">회원</th>
                <th className="px-4 py-3">오늘 운동</th>
                <th className="px-4 py-3">오늘 식단</th>
                <th className="px-4 py-3">최근 운동일</th>
                <th className="px-4 py-3">최근 식단일</th>
                <th className="px-4 py-3">상태</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr
                  key={m.memberId}
                  className={`border-b border-gray-50 transition hover:bg-gray-50/50 ${
                    m.isAtRisk ? "bg-red-50/30" : ""
                  }`}
                >
                  <td className="min-w-[9rem] px-4 py-3">
                    <MemberIdentity
                      memberId={m.memberId}
                      profile={m.profile}
                      onOpenDailyReport={onOpenDailyReport}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      ok={m.hasWorkoutToday}
                      label={m.hasWorkoutToday ? "완료" : "미기록"}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      ok={m.hasDietToday}
                      label={m.hasDietToday ? "완료" : "미기록"}
                    />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                    <span className="inline-flex items-center gap-1">
                      <Dumbbell className="h-3.5 w-3.5 shrink-0 text-lime-500" />
                      {formatLastDate(m.lastWorkoutDate)}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                    <span className="inline-flex items-center gap-1">
                      <UtensilsCrossed className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                      {formatLastDate(m.lastDietDate)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {m.isAtRisk ? (
                      <span className="inline-flex whitespace-nowrap rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                        이탈 위험
                      </span>
                    ) : (
                      <span className="inline-flex whitespace-nowrap rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        양호
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
