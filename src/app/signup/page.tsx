"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role") as "trainer" | "member" | null;

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const role = roleParam || "member";

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role,
          full_name: fullName,
          invite_code: role === "member" ? inviteCode.toUpperCase() : undefined,
        },
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (role === "member" && inviteCode.trim()) {
      const { data: trainer } = await supabase
        .from("profiles")
        .select("id")
        .eq("invite_code", inviteCode.toUpperCase())
        .eq("role", "trainer")
        .single();

      if (trainer && data.user) {
        await supabase.from("trainer_members").insert({
          trainer_id: trainer.id,
          member_id: data.user.id,
        });
      }
    }

    router.push(role === "trainer" ? "/trainer" : "/member");
    router.refresh();
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12">
      <Link href="/" className="mb-8 text-sm text-gray-500">
        ← 홈으로
      </Link>

      <h1 className="text-2xl font-bold">
        {role === "trainer" ? "트레이너 회원가입" : "회원 가입"}
      </h1>

      <form onSubmit={handleSignup} className="mt-8 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-600">
            이름
          </label>
          <input
            required
            className="input-field"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="홍길동"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-600">
            이메일
          </label>
          <input
            type="email"
            required
            className="input-field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-600">
            비밀번호
          </label>
          <input
            type="password"
            required
            minLength={6}
            className="input-field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {role === "member" && (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-600">
              트레이너 초대 코드 (선택)
            </label>
            <input
              className="input-field uppercase"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="6자리 코드"
              maxLength={6}
            />
            <p className="mt-1 text-xs text-gray-400">
              트레이너에게 받은 코드를 입력하면 자동으로 연결됩니다
            </p>
          </div>
        )}

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "가입 중..." : "회원가입"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        이미 계정이 있으신가요?{" "}
        <Link
          href={`/login?role=${role}`}
          className="font-medium text-blue-600"
        >
          로그인
        </Link>
      </p>

      <div className="mt-4 flex justify-center gap-4 text-sm">
        <Link
          href="/signup?role=member"
          className={role === "member" ? "font-semibold text-blue-600" : "text-gray-400"}
        >
          회원
        </Link>
        <span className="text-gray-300">|</span>
        <Link
          href="/signup?role=trainer"
          className={role === "trainer" ? "font-semibold text-blue-600" : "text-gray-400"}
        >
          트레이너
        </Link>
      </div>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
