"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthlyGrowthReport } from "@/lib/member-growth-report";
import { ChartBox } from "./ChartBox";
import { CHART } from "./chartTheme";

const tooltipStyle = {
  backgroundColor: CHART.tooltipBg,
  border: `1px solid ${CHART.tooltipBorder}`,
  borderRadius: "12px",
  color: CHART.tooltipText,
};

type MonthlyChartsProps = {
  data: MonthlyGrowthReport;
};

function mergeBigThreeChart(data: MonthlyGrowthReport) {
  const dateSet = new Set<string>();
  data.bigThree.squat.forEach((p) => dateSet.add(p.date));
  data.bigThree.deadlift.forEach((p) => dateSet.add(p.date));
  data.bigThree.bench.forEach((p) => dateSet.add(p.date));

  const dates = [...dateSet].sort();

  const squatMap = new Map(data.bigThree.squat.map((p) => [p.date, p]));
  const deadMap = new Map(data.bigThree.deadlift.map((p) => [p.date, p]));
  const benchMap = new Map(data.bigThree.bench.map((p) => [p.date, p]));

  return dates.map((date) => ({
    label:
      squatMap.get(date)?.label ??
      deadMap.get(date)?.label ??
      benchMap.get(date)?.label ??
      date.slice(5),
    squat: squatMap.get(date)?.estimated1RM ?? null,
    deadlift: deadMap.get(date)?.estimated1RM ?? null,
    bench: benchMap.get(date)?.estimated1RM ?? null,
  }));
}

export function MonthlyCharts({ data }: MonthlyChartsProps) {
  const lineData = mergeBigThreeChart(data);
  const hasBigThree = lineData.length > 0;

  return (
    <div className="space-y-4">
      <div className="card border border-lime-200 bg-gradient-to-br from-lime-50 to-white p-6 text-center">
        <p className="text-sm text-gray-500">한 달간 총 출석률</p>
        <p className="mt-2 text-5xl font-black text-lime-600">
          {data.attendanceRatePct}
          <span className="text-2xl text-lime-500/80">%</span>
        </p>
        <p className="mt-2 text-sm text-gray-500">
          {data.workoutDays}일 / {data.daysInMonth}일 운동 기록
        </p>
      </div>

      <div className="card border border-lime-100 p-4">
        <p className="text-xs text-gray-500">월간 총 볼륨</p>
        <p className="mt-1 text-2xl font-black text-lime-700">
          {data.totalVolumeKg.toLocaleString()}
          <span className="ml-1 text-sm font-semibold text-gray-500">kg</span>
        </p>
      </div>

      <section className="card border border-gray-100 p-4">
        <h3 className="mb-1 text-sm font-bold text-gray-800">
          3대 운동 추정 1RM 성장
        </h3>
        <p className="mb-3 text-[11px] text-gray-400">
          Epley 공식 기준 · 스쿼트 / 데드리프트 / 벤치프레스
        </p>

        {!hasBigThree ? (
          <p className="py-12 text-center text-sm text-gray-500">
            이번 달 3대 운동 기록이 없습니다.
            <br />
            운동명에 스쿼트·데드·벤치를 포함해 기록해 보세요.
          </p>
        ) : (
          <ChartBox height={256}>
              <LineChart data={lineData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: CHART.tick, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: CHART.tick, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  unit="kg"
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11, color: CHART.tick }} />
                <Line
                  type="monotone"
                  dataKey="squat"
                  name="스쿼트"
                  stroke={CHART.primary}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: CHART.primary }}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="deadlift"
                  name="데드리프트"
                  stroke={CHART.secondary}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: CHART.secondary }}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="bench"
                  name="벤치"
                  stroke="#4d7c0f"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#4d7c0f" }}
                  connectNulls
                />
              </LineChart>
          </ChartBox>
        )}
      </section>
    </div>
  );
}
