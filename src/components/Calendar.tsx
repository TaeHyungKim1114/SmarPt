"use client";

import { useMemo, useState } from "react";
import {
  addMonths,
  format,
  getDay,
  isSameDay,
  isSameMonth,
  subMonths,
} from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getMonthDays, toDateString } from "@/lib/utils";

type CalendarProps = {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  workoutDates?: string[];
  dietDates?: string[];
};

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function Calendar({
  selectedDate,
  onSelectDate,
  workoutDates = [],
  dietDates = [],
}: CalendarProps) {
  const [viewMonth, setViewMonth] = useState(selectedDate);

  const days = useMemo(() => getMonthDays(viewMonth), [viewMonth]);
  const startPad = getDay(days[0]);

  const workoutSet = useMemo(() => new Set(workoutDates), [workoutDates]);
  const dietSet = useMemo(() => new Set(dietDates), [dietDates]);

  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setViewMonth(subMonths(viewMonth, 1))}
          className="rounded-lg p-2 hover:bg-gray-100"
          aria-label="이전 달"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-bold">
          {format(viewMonth, "yyyy년 M월", { locale: ko })}
        </h2>
        <button
          type="button"
          onClick={() => setViewMonth(addMonths(viewMonth, 1))}
          className="rounded-lg p-2 hover:bg-gray-100"
          aria-label="다음 달"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="mb-2 grid grid-cols-7 text-center text-xs font-medium text-gray-400">
        {WEEKDAYS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {Array.from({ length: startPad }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {days.map((day) => {
          const key = toDateString(day);
          const hasWorkout = workoutSet.has(key);
          const hasDiet = dietSet.has(key);
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, new Date());
          const inMonth = isSameMonth(day, viewMonth);

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDate(day)}
              className={`mx-auto flex h-11 w-11 flex-col items-center justify-center rounded-full text-sm transition ${
                isSelected
                  ? "bg-lime-600 font-bold text-white"
                  : isToday
                    ? "bg-lime-50 font-semibold text-lime-600"
                    : inMonth
                      ? "text-gray-800 hover:bg-gray-100"
                      : "text-gray-300"
              }`}
            >
              <span>{format(day, "d")}</span>
              <span className="mt-0.5 flex h-1.5 gap-0.5">
                {hasWorkout && (
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isSelected ? "bg-white" : "bg-lime-500"
                    }`}
                  />
                )}
                {hasDiet && (
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isSelected ? "bg-emerald-200" : "bg-emerald-500"
                    }`}
                  />
                )}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex justify-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-lime-500" />
          운동
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          식단
        </span>
      </div>
    </div>
  );
}
