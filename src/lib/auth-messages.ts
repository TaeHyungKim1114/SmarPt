export function getAuthErrorMessage(message: string): string {
  const m = message.toLowerCase();

  if (m.includes("email not confirmed") || m.includes("email_not_confirmed")) {
    return "이메일 인증이 필요합니다. 가입 시 받은 메일의 링크를 누른 뒤 다시 로그인해 주세요. (개발 중이라면 Supabase에서 Confirm email을 끄세요)";
  }
  if (m.includes("invalid login credentials") || m.includes("invalid_credentials")) {
    return "이메일 또는 비밀번호가 올바르지 않습니다.";
  }
  if (m.includes("user already registered")) {
    return "이미 가입된 이메일입니다. 로그인해 주세요.";
  }
  if (m.includes("password")) {
    return "비밀번호는 6자 이상이어야 합니다.";
  }

  return message;
}

export function getAppOrigin(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}
