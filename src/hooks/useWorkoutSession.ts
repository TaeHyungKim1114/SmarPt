"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  clearMemberActiveWorkout,
  setMemberActiveWorkout,
  touchMemberActiveWorkout,
} from "@/lib/active-workout-sync";
import {
  clearWorkoutSession,
  defaultSessionState,
  loadWorkoutSession,
  saveWorkoutSession,
  saveWorkoutSessionWithBroadcast,
  tickElapsed,
  WORKOUT_SESSION_EVENT,
  writeWorkoutSession,
  type WorkoutSessionState,
} from "@/lib/workout-session";

export type ResumeWorkoutOptions = {
  workoutElapsedSec?: number;
  restElapsedSec?: number;
};

export function useWorkoutSession(memberId: string, date: string) {
  const supabase = createClient();
  const [session, setSession] = useState<WorkoutSessionState>(defaultSessionState);

  const reloadFromStorage = useCallback(() => {
    setSession(loadWorkoutSession(memberId, date));
  }, [memberId, date]);

  useEffect(() => {
    reloadFromStorage();

    const onSessionChange = (event: Event) => {
      const detail = (event as CustomEvent<{ memberId: string; date: string }>)
        .detail;
      if (detail?.memberId === memberId && detail?.date === date) {
        queueMicrotask(() => reloadFromStorage());
      }
    };

    window.addEventListener(WORKOUT_SESSION_EVENT, onSessionChange);
    return () =>
      window.removeEventListener(WORKOUT_SESSION_EVENT, onSessionChange);
  }, [memberId, date, reloadFromStorage]);

  useEffect(() => {
    if (!session.workoutRunning && !session.restRunning) return;
    const id = window.setInterval(() => {
      setSession((prev) => tickElapsed(prev, Date.now()));
    }, 1000);
    return () => window.clearInterval(id);
  }, [session.workoutRunning, session.restRunning]);

  useEffect(() => {
    if (!session.started) return;
    writeWorkoutSession(memberId, date, session);
  }, [session, memberId, date]);

  useEffect(() => {
    if (!session.started) return;
    void touchMemberActiveWorkout(supabase, memberId);
    const id = window.setInterval(() => {
      void touchMemberActiveWorkout(supabase, memberId);
    }, 30_000);
    return () => window.clearInterval(id);
  }, [session.started, memberId, supabase]);

  const persist = useCallback(
    (next: WorkoutSessionState, broadcast = true) => {
      setSession(next);
      if (broadcast) {
        saveWorkoutSessionWithBroadcast(memberId, date, next);
      } else {
        saveWorkoutSession(memberId, date, next);
      }
    },
    [memberId, date]
  );

  const applySession = useCallback(
    (updater: (prev: WorkoutSessionState) => WorkoutSessionState) => {
      setSession((prev) => {
        const next = updater(prev);
        saveWorkoutSession(memberId, date, next);
        return next;
      });
    },
    [memberId, date]
  );

  const beginActiveSession = useCallback(
    (opts?: ResumeWorkoutOptions) => {
      const now = Date.now();
      const next: WorkoutSessionState = {
        started: true,
        workoutElapsedSec: opts?.workoutElapsedSec ?? 0,
        restElapsedSec: opts?.restElapsedSec ?? 0,
        workoutRunning: true,
        workoutLastTickAt: now,
        restRunning: false,
        restLastTickAt: null,
      };
      persist(next, true);
      void setMemberActiveWorkout(supabase, memberId, date);
    },
    [persist, supabase, memberId, date]
  );

  const startWorkout = useCallback(() => {
    beginActiveSession();
  }, [beginActiveSession]);

  const resumeWorkout = useCallback(
    (opts: ResumeWorkoutOptions) => {
      beginActiveSession(opts);
    },
    [beginActiveSession]
  );

  const endWorkoutSession = useCallback(() => {
    setSession(defaultSessionState());
    clearWorkoutSession(memberId, date);
    void clearMemberActiveWorkout(supabase, memberId);
  }, [supabase, memberId, date]);

  const toggleWorkout = useCallback(() => {
    const now = Date.now();
    applySession((prev) => {
      let next = tickElapsed(prev, now);
      if (next.workoutRunning) {
        next = {
          ...next,
          workoutRunning: false,
          workoutLastTickAt: null,
        };
      } else {
        next = {
          ...next,
          started: true,
          workoutRunning: true,
          workoutLastTickAt: now,
        };
        void setMemberActiveWorkout(supabase, memberId, date);
      }
      return next;
    });
  }, [applySession, supabase, memberId, date]);

  const resetWorkout = useCallback(() => {
    applySession((prev) => ({
      ...prev,
      workoutElapsedSec: 0,
      workoutRunning: false,
      workoutLastTickAt: null,
    }));
  }, [applySession]);

  const toggleRest = useCallback(() => {
    const now = Date.now();
    applySession((prev) => {
      let next = tickElapsed(prev, now);
      if (next.restRunning) {
        return {
          ...next,
          restRunning: false,
          restLastTickAt: null,
        };
      }
      return {
        ...next,
        restRunning: true,
        restLastTickAt: now,
      };
    });
  }, [applySession]);

  const resetRest = useCallback(() => {
    applySession((prev) => ({
      ...prev,
      restElapsedSec: 0,
      restRunning: false,
      restLastTickAt: null,
    }));
  }, [applySession]);

  const getElapsedNow = useCallback(() => {
    return tickElapsed(session, Date.now());
  }, [session]);

  return {
    session,
    startWorkout,
    resumeWorkout,
    endWorkoutSession,
    toggleWorkout,
    resetWorkout,
    toggleRest,
    resetRest,
    getElapsedNow,
  };
}
