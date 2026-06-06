"use client";

import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

type ProfileNameEditorProps = {
  profile: Profile | null;
  onUpdated?: (fullName: string) => void;
};

export function ProfileNameEditor({
  profile,
  onUpdated,
}: ProfileNameEditorProps) {
  const supabase = createClient();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setName(profile?.full_name ?? "");
  }, [profile?.full_name]);

  const cancel = () => {
    setName(profile?.full_name ?? "");
    setEditing(false);
    setMessage(null);
  };

  const save = async () => {
    if (!profile) return;

    const trimmed = name.trim();
    if (!trimmed) {
      setMessage("이름을 입력해 주세요.");
      return;
    }

    if (trimmed === profile.full_name) {
      setEditing(false);
      setMessage(null);
      return;
    }

    setSaving(true);
    setMessage(null);

    const { error } = await supabase
      .from("profiles")
      .update({ full_name: trimmed })
      .eq("id", profile.id);

    setSaving(false);

    if (error) {
      setMessage("이름 변경에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      return;
    }

    onUpdated?.(trimmed);
    setEditing(false);
    setMessage("이름이 변경되었습니다.");
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-gray-500">이름</p>
        {!editing && profile && (
          <button
            type="button"
            onClick={() => {
              setEditing(true);
              setMessage(null);
            }}
            className="flex items-center gap-1 text-sm text-lime-600"
          >
            <Pencil className="h-3.5 w-3.5" />
            변경
          </button>
        )}
      </div>

      {editing ? (
        <div className="mt-1 space-y-2">
          <input
            className="input-field w-full"
            value={name}
            maxLength={30}
            placeholder="이름"
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void save();
              if (e.key === "Escape") cancel();
            }}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="btn-primary flex-1"
            >
              {saving ? "저장 중..." : "저장"}
            </button>
            <button
              type="button"
              onClick={cancel}
              disabled={saving}
              className="btn-secondary flex-1"
            >
              취소
            </button>
          </div>
        </div>
      ) : (
        <p className="font-semibold">{profile?.full_name}</p>
      )}

      {message && (
        <p
          className={`mt-2 text-sm ${
            message.includes("실패") || message.includes("입력")
              ? "text-red-600"
              : "text-lime-600"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
