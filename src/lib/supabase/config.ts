const PLACEHOLDER_MARKERS = ["your-project", "your-anon-key", "example.com"];

export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";

  return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseEnv();

  if (!url || !anonKey) return false;

  const validKey =
    anonKey.startsWith("sb_publishable_") ||
    (anonKey.startsWith("eyJ") && anonKey.length >= 100);
  if (!validKey) return false;
  if (!url.startsWith("https://") || !url.includes(".supabase.co")) {
    return false;
  }
  if (PLACEHOLDER_MARKERS.some((m) => url.includes(m) || anonKey.includes(m))) {
    return false;
  }

  return true;
}

export const SUPABASE_SETUP_MESSAGE =
  ".env.local에 Project URL과 Publishable key(또는 legacy anon key)를 넣어 주세요. (Dashboard → Project Settings → API) 설정 후 dev 서버를 재시작하세요.";
