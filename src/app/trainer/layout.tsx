import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/BottomNav";

export default async function TrainerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login?error=no_profile");
  if (profile.role !== "trainer") redirect("/member");

  return (
    <div className="mx-auto min-h-screen max-w-lg pb-20">
      {children}
      <BottomNav role="trainer" />
    </div>
  );
}
