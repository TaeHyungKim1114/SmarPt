"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { WeeklyGrowthReport } from "@/lib/member-growth-report";
import { ChartBox } from "./ChartBox";
import { CHART } from "./chartTheme";

const tooltipStyle = {
  backgroundColor: CHART.tooltipBg,
  border: `1px solid ${CHART.tooltipBorder}`,
  borderRadius: "12px",
  color: CHART.tooltipText,
};

type WeeklyChartsProps = {
  data: WeeklyGrowthReport;
};

export function WeeklyCharts({ data }: WeeklyChartsProps) {
  const attendanceChart = data.attendanceByDay.map((d) => ({
    label: d.label,
    value: d.attended ? 1 : 0,
    attended: d.attended,
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="card border border-lime-100 bg-lime-50/50 p-4">
          <p className="text-xs text-gray-500">주간 총 운동 시간</p>
          <p className="mt-1 text-2xl font-black text-lime-700">
            {data.totalWorkoutMinutes}
            <span className="ml-1 text-sm font-semibold text-gray-500">분</span>
          </p>
          <p className="mt-1 text-[10px] text-gray-400">세트당 약 3분 기준</p>
        </div>
        <div className="card border border-lime-100 p-4">
          <p className="text-xs text-gray-500">주간 누적 볼륨</p>
          <p className="mt-1 text-2xl font-black text-lime-600">
            {data.totalVolumeKg.toLocaleString()}
            <span className="ml-1 text-sm font-semibold text-gray-500">kg</span>
          </p>
        </div>
      </div>

      <section className="card border border-gray-100 p-4">
        <h3 className="mb-3 text-sm font-bold text-gray-800">요일별 출석</h3>
        <ChartBox height={192}>
            <BarChart data={attendanceChart} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: CHART.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide domain={[0, 1]} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v) => [v === 1 ? "출석" : "미출석", ""]}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={36}>
                {attendanceChart.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.attended ? CHART.primary : CHART.muted}
                  />
                ))}
              </Bar>
            </BarChart>
        </ChartBox>
      </section>

      <section className="card border border-gray-100 p-4">
        <h3 className="mb-3 text-sm font-bold text-gray-800">요일별 운동 시간 (분)</h3>
        <ChartBox height={192}>
            <BarChart data={data.workoutMinutesByDay} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: CHART.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: CHART.tick, fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v) => [`${v}분`, "운동 시간"]}
              />
              <Bar dataKey="minutes" fill={CHART.secondary} radius={[6, 6, 0, 0]} maxBarSize={36} />
            </BarChart>
        </ChartBox>
      </section>

      <section className="card border border-gray-100 p-4">
        <h3 className="mb-3 text-sm font-bold text-gray-800">요일별 누적 볼륨 (kg)</h3>
        <ChartBox height={208}>
            <BarChart data={data.volumeByDay} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: CHART.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: CHART.tick, fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v) => [`${Number(v).toLocaleString()}kg`, "볼륨"]}
              />
              <Bar dataKey="volumeKg" fill={CHART.tertiary} radius={[6, 6, 0, 0]} maxBarSize={40} />
            </BarChart>
        </ChartBox>
      </section>
    </div>
  );
}
