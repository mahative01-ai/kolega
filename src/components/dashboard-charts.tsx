"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ClipboardList, TrendingUp } from "lucide-react";

type AttendanceSummary = {
  total: number;
  sick: number;
  late: number;
  onTime: number;
  alpha: number;
  wfh: number;
  permission: number;
  leave: number;
};

type TrendPoint = {
  dateLabel: string;
  count: number;
};

type Props = {
  summary: AttendanceSummary;
  dailyTrend?: TrendPoint[];
};

export function DashboardCharts({ summary, dailyTrend }: Props) {


  // ── 2. Horizontal Composition Calculations ──────────────────────────────
  const totalSummary = summary.total;
  const composition = useMemo(() => {
    if (totalSummary === 0) return [];
    const items = [
      { label: "Tepat Waktu", count: summary.onTime, color: "bg-emerald-500", textColor: "text-emerald-500" },
      { label: "Terlambat", count: summary.late, color: "bg-orange-500", textColor: "text-orange-500" },
      { label: "Sakit / Izin / Cuti", count: summary.sick + summary.permission + summary.leave, color: "bg-blue-500", textColor: "text-blue-500" },
      { label: "Alpha", count: summary.alpha, color: "bg-red-500", textColor: "text-red-500" },
    ];
    return items.map(item => ({
      ...item,
      percent: Math.round((item.count / totalSummary) * 100)
    }));
  }, [summary, totalSummary]);

  // ── 3. Line Chart Trend Calculations ─────────────────────────────────────
  const trendPoints = useMemo(() => {
    if (!dailyTrend || dailyTrend.length === 0) return null;
    const maxVal = Math.max(...dailyTrend.map(d => d.count), 5);
    const width = 300;
    const height = 100;
    const padding = 15;

    const points = dailyTrend.map((d, index) => {
      const x = padding + (index * (width - 2 * padding)) / (dailyTrend.length - 1);
      const y = height - padding - (d.count * (height - 2 * padding)) / maxVal;
      return { x, y, dateLabel: d.dateLabel, count: d.count };
    });

    const pathString = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    const areaString = points.length > 0 
      ? `${pathString} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`
      : "";

    return { points, pathString, areaString, width, height };
  }, [dailyTrend]);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* 1. Composition Horizontal Bars Card */}
      <Card className="shadow-none flex flex-col justify-between">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-zinc-900 dark:text-zinc-50">
            <ClipboardList className="size-4 text-violet-700 dark:text-violet-400" />
            Komposisi Status Kehadiran
          </CardTitle>
          <CardDescription>Persentase status dari total {totalSummary} catatan</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 py-4 flex-1 flex flex-col justify-center">
          {totalSummary === 0 ? (
            <div className="text-center py-8 text-zinc-400 dark:text-zinc-600 text-xs">
              Belum ada data status presensi
            </div>
          ) : (
            <div className="space-y-3.5 w-full">
              {composition.map(item => (
                <div key={item.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-zinc-600 dark:text-zinc-400">{item.label}</span>
                    <span className={item.textColor}>{item.count} ({item.percent}%)</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${item.color}`}
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Trend Line Chart Card */}
      <Card className="shadow-none flex flex-col justify-between">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-zinc-900 dark:text-zinc-50">
            <TrendingUp className="size-4 text-emerald-700 dark:text-emerald-400" />
            Tren Kehadiran
          </CardTitle>
          <CardDescription>Grafik tren kehadiran 7 hari terakhir</CardDescription>
        </CardHeader>
        <CardContent className="py-4 flex-1 flex flex-col justify-center items-center">
          {!trendPoints ? (
            <div className="text-center py-8 text-zinc-400 dark:text-zinc-600 text-xs">
              Data tren harian belum memadai
            </div>
          ) : (
            <div className="w-full">
              <svg viewBox={`0 0 ${trendPoints.width} ${trendPoints.height}`} className="w-full h-24 overflow-visible">
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {/* Area under the line */}
                <path d={trendPoints.areaString} fill="url(#areaGrad)" />
                {/* Trend line */}
                <path
                  d={trendPoints.pathString}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Points */}
                {trendPoints.points.map((p, idx) => (
                  <g key={idx} className="group/point">
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r="4"
                      className="fill-white stroke-emerald-500 stroke-[2] hover:r-5 cursor-pointer transition-all"
                    />
                    {/* Tooltip hint on hover */}
                    <text
                      x={p.x}
                      y={p.y - 8}
                      textAnchor="middle"
                      className="hidden group-hover/point:block text-[9px] fill-zinc-700 dark:fill-zinc-300 font-bold"
                    >
                      {p.count}
                    </text>
                  </g>
                ))}
              </svg>
              {/* Date Labels Footer */}
              <div className="flex justify-between px-2.5 mt-2.5 text-[9px] text-zinc-400 font-medium">
                {dailyTrend?.map((d, i) => (
                  <span key={i} className="text-center">
                    {d.dateLabel.slice(5)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
