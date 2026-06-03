"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, MessageCircle, User, Users } from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

type BottomNavProps = {
  role: "member" | "trainer";
};

export function BottomNav({ role }: BottomNavProps) {
  const pathname = usePathname();

  const memberItems: NavItem[] = [
    { href: "/member", label: "기록", icon: Calendar },
    { href: "/member/chat", label: "채팅", icon: MessageCircle },
    { href: "/member/profile", label: "내 정보", icon: User },
  ];

  const trainerItems: NavItem[] = [
    { href: "/trainer", label: "회원", icon: Users },
    { href: "/trainer/profile", label: "내 정보", icon: User },
  ];

  const items = role === "member" ? memberItems : trainerItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-lg justify-around px-2 py-2">
        {items.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href ||
            (href !== `/${role}` && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 text-xs font-medium transition ${
                active ? "text-blue-600" : "text-gray-400"
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? "text-blue-600" : ""}`} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
