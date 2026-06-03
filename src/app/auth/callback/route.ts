import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/member";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: profile } = user
        ? await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single()
        : { data: null };

      const dest = profile?.role === "trainer" ? "/trainer" : "/member";
      return NextResponse.redirect(`${origin}${next.startsWith("/") ? next : dest}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback`);
}
