"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role") as "trainer" | "member" | null;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const role = roleParam || "member";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    router.push(profile?.role === "trainer" ? "/trainer" : "/member");
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
          className="font-medium text-blue-600"
        >
          회원가입
        </Link>
      </p>

      <div className="mt-4 flex justify-center gap-4 text-sm">
        <Link
          href="/login?role=member"
          className={role === "member" ? "font-semibold text-blue-600" : "text-gray-400"}
        >
          회원
        </Link>
        <span className="text-gray-300">|</span>
        <Link
          href="/login?role=trainer"
          className={role === "trainer" ? "font-semibold text-blue-600" : "text-gray-400"}
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
