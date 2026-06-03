const STORAGE_PREFIX = "smartpt-quick-add:";
const DEFAULT_NAMES = ["벤치프레스", "스쿼트", "데드리프트", "랫풀다운", "숄더프레스"];

export function getQuickAddExercises(memberId: string): string[] {
  if (typeof window === "undefined") return [...DEFAULT_NAMES];
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${memberId}`);
    if (!raw) return [...DEFAULT_NAMES];
    const parsed = JSON.parse(raw) as string[];
    if (!Array.isArray(parsed) || parsed.length === 0) return [...DEFAULT_NAMES];
    return parsed.map((s) => String(s).trim()).filter(Boolean);
  } catch {
    return [...DEFAULT_NAMES];
  }
}

export function saveQuickAddExercises(memberId: string, names: string[]): void {
  if (typeof window === "undefined") return;
  const cleaned = names.map((s) => s.trim()).filter(Boolean);
  localStorage.setItem(
    `${STORAGE_PREFIX}${memberId}`,
    JSON.stringify(cleaned.length > 0 ? cleaned : DEFAULT_NAMES)
  );
}

export function resetQuickAddExercises(memberId: string): void {
  saveQuickAddExercises(memberId, [...DEFAULT_NAMES]);
}
