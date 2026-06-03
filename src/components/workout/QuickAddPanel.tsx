"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import {
  getQuickAddExercises,
  resetQuickAddExercises,
  saveQuickAddExercises,
} from "@/lib/workout-quick-add";

type QuickAddPanelProps = {
  memberId: string;
  onAdd: (name: string) => void;
};

export function QuickAddPanel({ memberId, onAdd }: QuickAddPanelProps) {
  const [items, setItems] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);

  useEffect(() => {
    setItems(getQuickAddExercises(memberId));
  }, [memberId]);

  const openEdit = () => {
    setDraft([...items]);
    setEditing(true);
  };

  const saveEdit = () => {
    saveQuickAddExercises(memberId, draft);
    setItems(getQuickAddExercises(memberId));
    setEditing(false);
  };

  const cancelEdit = () => setEditing(false);

  return (
    <div className="card">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-gray-500">빠른 추가</p>
        {!editing && (
          <button
            type="button"
            onClick={openEdit}
            className="flex items-center gap-1 text-xs font-medium text-lime-600"
          >
            <Pencil className="h-3.5 w-3.5" />
            편집
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          {draft.map((name, i) => (
            <div key={i} className="flex gap-2">
              <input
                className="input-field flex-1 py-2 text-sm"
                value={name}
                onChange={(e) => {
                  const next = [...draft];
                  next[i] = e.target.value;
                  setDraft(next);
                }}
                placeholder="운동 이름"
              />
              <button
                type="button"
                onClick={() => setDraft(draft.filter((_, j) => j !== i))}
                className="rounded-lg p-2 text-red-400 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setDraft([...draft, ""])}
            className="flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-gray-200 py-2 text-sm text-gray-500"
          >
            <Plus className="h-4 w-4" />
            항목 추가
          </button>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                resetQuickAddExercises(memberId);
                setDraft(getQuickAddExercises(memberId));
              }}
              className="btn-secondary flex-1 py-2 text-sm"
            >
              기본값
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="btn-secondary flex-1 py-2 text-sm"
            >
              취소
            </button>
            <button
              type="button"
              onClick={saveEdit}
              className="btn-primary flex-1 py-2 text-sm"
            >
              저장
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => onAdd(name)}
              className="rounded-full bg-lime-50 px-3 py-1.5 text-sm font-medium text-lime-700 transition hover:bg-lime-100"
            >
              + {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function WorkoutStartModal({
  open,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="닫기"
        onClick={onCancel}
      />
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-4 right-4 rounded-lg p-1 text-gray-400 hover:bg-gray-100"
        >
          <X className="h-5 w-5" />
        </button>
        <h3 className="text-lg font-bold text-gray-900">운동을 시작하시겠습니까?</h3>
        <p className="mt-2 text-sm text-gray-500">
          시작하면 운동 시간이 측정됩니다. 하단에서 운동·휴식 타이머를 사용할 수
          있어요.
        </p>
        <div className="mt-6 flex gap-2">
          <button type="button" onClick={onCancel} className="btn-secondary flex-1">
            나중에
          </button>
          <button type="button" onClick={onConfirm} className="btn-primary flex-1">
            시작하기
          </button>
        </div>
      </div>
    </div>
  );
}
