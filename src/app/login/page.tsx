"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getAuthErrorMessage } from "@/lib/auth-messages";
import {
  isSupabaseConfigured,
  SUPABASE_SETUP_MESSAGE,
} from "@/lib/supabase/config";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role") as "trainer" | "member" | null;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const role = roleParam || "member";
  const callbackError = searchParams.get("error");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!isSupabaseConfigured()) {
      setError(SUPABASE_SETUP_MESSAGE);
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      const msg =
        authError.message === "Failed to fetch"
          ? "Supabase에 연결할 수 없습니다. .env.local URL/키 확인 후 npm run dev 를 다시 실행하세요."
          : getAuthErrorMessage(authError.message);
      setError(msg);
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (profileError || !profile) {
      setError(
        "로그인은 됐지만 프로필이 없습니다. Supabase에서 schema.sql과 fix-missing-profiles.sql을 실행한 뒤 다시 시도해 주세요."
      );
      setLoading(false);
      return;
    }

    router.push(profile.role === "trainer" ? "/trainer" : "/member");
    router.refresh();
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12">
      <Link href="/" className="mb-8 text-sm text-gray-500">
        ← 홈으로
      </Link>

      <h1 className="text-2xl font-bold">
        {role === "trainer" ? "트레이너 로그인" : "회원 로그인"}
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        SmarPt 계정으로 로그인하세요
      </p>

      {callbackError === "auth_callback" && (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          이메일 인증 링크 처리에 실패했습니다. Supabase URL Configuration에{" "}
          <code className="text-xs">http://localhost:3000/auth/callback</code>이
          등록됐는지 확인한 뒤 다시 로그인해 보세요.
        </p>
      )}

      {callbackError === "no_profile" && (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          프로필이 없습니다. Supabase SQL Editor에서{" "}
          <code className="text-xs">fix-missing-profiles.sql</code>을 실행해 주세요.
        </p>
      )}

      {!isSupabaseConfigured() && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {SUPABASE_SETUP_MESSAGE}
        </p>
      )}

      <form onSubmit={handleLogin} className="mt-8 space-y-4">
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
            placeholder="you@example.com"
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
            placeholder="••••••••"
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "로그인 중..." : "로그인"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        계정이 없으신가요?{" "}
        <Link
          href={`/signup?role=${role}`}
          className="font-medium text-lime-600"
        >
          회원가입
        </Link>
      </p>

      <div className="mt-4 flex justify-center gap-4 text-sm">
        <Link
          href="/login?role=member"
          className={role === "member" ? "font-semibold text-lime-600" : "text-gray-400"}
        >
          회원
        </Link>
        <span className="text-gray-300">|</span>
        <Link
          href="/login?role=trainer"
          className={role === "trainer" ? "font-semibold text-lime-600" : "text-gray-400"}
        >
          트레이너
        </Link>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
