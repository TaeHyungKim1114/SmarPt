import Link from "next/link";
import { Dumbbell, Users } from "lucide-react";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12">
      <div className="mb-10 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white">
          <Dumbbell className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">SmarPt</h1>
        <p className="mt-2 text-gray-500">
          트레이너와 회원을 연결하는
          <br />
          운동·식단 기록 앱
        </p>
      </div>

      <div className="space-y-3">
        <Link
          href="/login?role=member"
          className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm transition hover:shadow-md"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Dumbbell className="h-6 w-6" />
          </div>
          <div>
            <p className="font-semibold">회원으로 시작</p>
            <p className="text-sm text-gray-500">운동·식단 기록 및 트레이너와 채팅</p>
          </div>
        </Link>

        <Link
          href="/login?role=trainer"
          className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm transition hover:shadow-md"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="font-semibold">트레이너로 시작</p>
            <p className="text-sm text-gray-500">회원 운동·식단 확인 및 코칭</p>
          </div>
        </Link>
      </div>

      <p className="mt-8 text-center text-sm text-gray-400">
        계정이 없으신가요?{" "}
        <Link href="/signup" className="font-medium text-blue-600">
          회원가입
        </Link>
      </p>
    </main>
  );
}
