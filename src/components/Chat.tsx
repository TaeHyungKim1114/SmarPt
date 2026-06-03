"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import type { Message, Profile } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

type ChatProps = {
  trainerId: string;
  memberId: string;
  currentUserId: string;
  otherUser?: Profile | null;
};

export function Chat({
  trainerId,
  memberId,
  currentUserId,
  otherUser,
}: ChatProps) {
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadMessages = async () => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("trainer_id", trainerId)
      .eq("member_id", memberId)
      .order("created_at", { ascending: true });
    setMessages(data || []);
  };

  useEffect(() => {
    loadMessages();

    const channel = supabase
      .channel(`chat:${trainerId}:${memberId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `trainer_id=eq.${trainerId}`,
        },
        (payload) => {
          const msg = payload.new as Message;
          if (msg.member_id === memberId) {
            setMessages((prev) => [...prev, msg]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [trainerId, memberId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput("");

    const { error } = await supabase.from("messages").insert({
      trainer_id: trainerId,
      member_id: memberId,
      sender_id: currentUserId,
      content: text,
    });

    if (error) {
      alert("전송 실패: " + error.message);
      setInput(text);
    }
    setSending(false);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {otherUser && (
        <div className="border-b border-gray-100 bg-white px-4 py-3">
          <p className="font-semibold">{otherUser.full_name}</p>
          <p className="text-xs text-gray-400">트레이너와의 채팅</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <p className="text-center text-sm text-gray-400">
            아직 메시지가 없습니다. 첫 메시지를내보세요!
          </p>
        )}
        {messages.map((msg) => {
          const isMine = msg.sender_id === currentUserId;
          return (
            <div
              key={msg.id}
              className={`mb-3 flex ${isMine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                  isMine
                    ? "rounded-br-md bg-blue-600 text-white"
                    : "rounded-bl-md bg-white shadow-sm"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                <p
                  className={`mt-1 text-[10px] ${
                    isMine ? "text-blue-200" : "text-gray-400"
                  }`}
                >
                  {format(new Date(msg.created_at), "a h:mm", { locale: ko })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-gray-100 bg-white p-3">
        <div className="flex gap-2">
          <input
            className="input-field flex-1 py-2.5"
            placeholder="메시지 입력..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          />
          <button
            type="button"
            onClick={send}
            disabled={sending || !input.trim()}
            className="btn-primary flex h-12 w-12 items-center justify-center rounded-xl p-0"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
