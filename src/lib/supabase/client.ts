import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv, isSupabaseConfigured } from "./config";

export function createClient() {
  const { url, anonKey } = getSupabaseEnv();

  if (!isSupabaseConfigured()) {
    console.error(
      "[SmarPt] Supabase 환경 변수가 없거나 예시 값입니다.",
      "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 를 .env.local 에 설정하세요."
    );
  }

  return createBrowserClient(url, anonKey);
}
