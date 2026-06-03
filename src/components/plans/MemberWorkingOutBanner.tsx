import { Dumbbell } from "lucide-react";

export function MemberWorkingOutBanner() {
  return (
    <div className="flex items-start gap-3 rounded-2xl border-2 border-amber-200 bg-amber-50 px-4 py-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
        <Dumbbell className="h-5 w-5 text-amber-600" />
      </div>
      <div>
        <p className="font-bold text-amber-900">회원님이 운동중입니다!</p>
        <p className="mt-0.5 text-sm text-amber-800/90">
          운동이 끝난 뒤 루틴을 수정할 수 있습니다. (기록 저장 시 해제)
        </p>
      </div>
    </div>
  );
}
