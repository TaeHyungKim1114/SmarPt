"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import type { Message } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

type ChatProps = {
  trainerId: string;
  memberId: string;
  currentUserId: string;
};

export function Chat({ trainerId, memberId, currentUserId }: ChatProps) {
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const composingRef = useRef(false);

  const loadMessages = useCallback(async () => {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("trainer_id", trainerId)
      .eq("member_id", memberId)
      .order("created_at", { ascending: true });

    if (error) {
      setLoadError("메시지를 불러오지 못했습니다: " + error.message);
      return;
    }
    setLoadError(null);
    setMessages(data || []);
  }, [supabase, trainerId, memberId]);

  const appendMessage = useCallback((msg: Message) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
  }, []);

  useEffect(() => {
    loadMessages();

    const channel = supabase
      .channel(`chat:${trainerId}:${memberId}:${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const msg = payload.new as Message;
          if (msg.trainer_id === trainerId && msg.member_id === memberId) {
            appendMessage(msg);
          }
        }
      )
      .subscribe();

    const poll = setInterval(loadMessages, 15000);

    return () => {
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [trainerId, memberId, loadMessages, appendMessage, supabase]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const resizeTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  useEffect(() => {
    resizeTextarea();
  }, [input]);

  const send = async () => {
    if (composingRef.current || sending) return;

    const text = input.trim();
    if (!text) return;

    setSending(true);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    const { data, error } = await supabase
      .from("messages")
      .insert({
        trainer_id: trainerId,
        member_id: memberId,
        sender_id: currentUserId,
        content: text,
      })
      .select()
      .single();

    if (error) {
      alert("전송 실패: " + error.message);
      setInput(text);
      setSending(false);
      return;
    }

    if (data) {
      appendMessage(data as Message);
    }

    setSending(false);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter" || e.shiftKey) return;
    if (e.nativeEvent.isComposing || composingRef.current) return;
    e.preventDefault();
    void send();
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] min-w-0 flex-col overflow-hidden">
      {loadError && (
        <p className="shrink-0 bg-red-50 px-4 py-2 text-center text-xs text-red-600">
          {loadError}
        </p>
      )}

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-4">
        {messages.map((msg) => {
          const isMine = msg.sender_id === currentUserId;
          return (
            <div
              key={msg.id}
              className={`mb-3 flex min-w-0 ${isMine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`min-w-0 max-w-[min(85%,20rem)] shrink rounded-2xl px-4 py-2.5 text-sm ${
                  isMine
                    ? "rounded-br-md bg-lime-600 text-white"
                    : "rounded-bl-md bg-white shadow-sm"
                }`}
              >
                <p className="whitespace-pre-wrap">
                  {msg.content}
                </p>
                <p
                  className={`mt-1 text-[10px] ${
                    isMine ? "text-lime-200" : "text-gray-400"
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

      <form
        className="shrink-0 border-t border-gray-100 bg-white p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <div className="flex min-w-0 items-end gap-2">
          <textarea
            ref={textareaRef}
            rows={1}
            className="input-field max-h-[120px] min-h-[44px] min-w-0 flex-1 resize-none overflow-y-auto py-2.5 leading-relaxed"
            placeholder="메시지 입력..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => {
              composingRef.current = true;
            }}
            onCompositionEnd={() => {
              composingRef.current = false;
            }}
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="btn-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-xl p-0"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
