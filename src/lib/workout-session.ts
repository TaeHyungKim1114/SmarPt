export type WorkoutSessionState = {
  started: boolean;
  workoutElapsedSec: number;
  workoutRunning: boolean;
  workoutLastTickAt: number | null;
  restElapsedSec: number;
  restRunning: boolean;
  restLastTickAt: number | null;
};

export const WORKOUT_SESSION_EVENT = "smartpt-workout-session-changed";

export const defaultSessionState = (): WorkoutSessionState => ({
  started: false,
  workoutElapsedSec: 0,
  workoutRunning: false,
  workoutLastTickAt: null,
  restElapsedSec: 0,
  restRunning: false,
  restLastTickAt: null,
});

function storageKey(memberId: string, date: string) {
  return `smartpt-workout-session:${memberId}:${date}`;
}

export function notifyWorkoutSessionChange(memberId: string, date: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(WORKOUT_SESSION_EVENT, {
      detail: { memberId, date },
    })
  );
}

/** 다른 컴포넌트 setState 중 렌더 경고를 피하기 위해 마이크로태스크로 전파 */
export function scheduleWorkoutSessionBroadcast(
  memberId: string,
  date: string
): void {
  if (typeof window === "undefined") return;
  queueMicrotask(() => notifyWorkoutSessionChange(memberId, date));
}

export function tickElapsed(
  state: WorkoutSessionState,
  now: number
): WorkoutSessionState {
  let next = { ...state };

  if (state.workoutRunning && state.workoutLastTickAt) {
    const delta = Math.floor((now - state.workoutLastTickAt) / 1000);
    if (delta > 0) {
      next.workoutElapsedSec += delta;
      next.workoutLastTickAt = now;
    }
  } else if (state.workoutRunning) {
    next.workoutLastTickAt = now;
  }

  if (state.restRunning && state.restLastTickAt) {
    const delta = Math.floor((now - state.restLastTickAt) / 1000);
    if (delta > 0) {
      next.restElapsedSec += delta;
      next.restLastTickAt = now;
    }
  } else if (state.restRunning) {
    next.restLastTickAt = now;
  }

  return next;
}

export function loadWorkoutSession(
  memberId: string,
  date: string
): WorkoutSessionState {
  if (typeof window === "undefined") return defaultSessionState();
  try {
    const raw = localStorage.getItem(storageKey(memberId, date));
    if (!raw) return defaultSessionState();
    const parsed = JSON.parse(raw) as Partial<WorkoutSessionState>;
    return { ...defaultSessionState(), ...parsed };
  } catch {
    return defaultSessionState();
  }
}

export function writeWorkoutSession(
  memberId: string,
  date: string,
  state: WorkoutSessionState
): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey(memberId, date), JSON.stringify(state));
}

/** 타이머 틱 등 — storage만 갱신, 다른 컴포넌트에는 알리지 않음 */
export function saveWorkoutSession(
  memberId: string,
  date: string,
  state: WorkoutSessionState
): void {
  writeWorkoutSession(memberId, date, state);
}

/** 시작/종료 등 — storage + 다른 hook 인스턴스 동기화 */
export function saveWorkoutSessionWithBroadcast(
  memberId: string,
  date: string,
  state: WorkoutSessionState
): void {
  writeWorkoutSession(memberId, date, state);
  scheduleWorkoutSessionBroadcast(memberId, date);
}

export function clearWorkoutSession(memberId: string, date: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(storageKey(memberId, date));
  scheduleWorkoutSessionBroadcast(memberId, date);
}

export function formatTimer(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const WORKOUT_DURATION_RE = /⏱️\s*총\s*운동시간:\s*(\d{1,2}:\d{2}(?::\d{2})?)/;
const REST_DURATION_RE = /💤\s*총\s*휴식시간:\s*(\d{1,2}:\d{2}(?::\d{2})?)/;

function parseDurationToken(token: string): number {
  const parts = token.split(":").map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

export function parseWorkoutDurationSec(notes: string | null | undefined): number {
  if (!notes) return 0;
  const match = notes.match(WORKOUT_DURATION_RE);
  return match ? parseDurationToken(match[1]) : 0;
}

export function parseRestDurationSec(notes: string | null | undefined): number {
  if (!notes) return 0;
  const match = notes.match(REST_DURATION_RE);
  return match ? parseDurationToken(match[1]) : 0;
}

export function appendDurationToNotes(
  notes: string,
  workoutSec: number,
  restSec: number
): string {
  const base = notes
    .replace(/\n?⏱️ 총 운동시간:.*$/m, "")
    .replace(/\n?💤 총 휴식시간:.*$/m, "")
    .trim();
  const lines: string[] = [];
  if (base) lines.push(base);
  if (workoutSec > 0) {
    lines.push(`⏱️ 총 운동시간: ${formatTimer(workoutSec)}`);
  }
  if (restSec > 0) {
    lines.push(`💤 총 휴식시간: ${formatTimer(restSec)}`);
  }
  return lines.join("\n");
}
