"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, PieChart, TrendingUp } from "lucide-react";

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
  const [activeDonutSlice, setActiveDonutSlice] = useState<"WFO" | "WFH" | null>(null);

  // ── 1. Donut Chart Calculations (WFO vs WFH) ─────────────────────────────
  const wfoCount = summary.onTime + summary.late;
  const wfhCount = summary.wfh;
  const totalPresence = wfoCount + wfhCount;

  const donutData = useMemo(() => {
    if (totalPresence === 0) return { wfoPercent: 50, wfhPercent: 50, isEmpty: true };
    const wfoPercent = Math.round((wfoCount / totalPresence) * 100);
    const wfhPercent = 100 - wfoPercent;
    return { wfoPercent, wfhPercent, isEmpty: false };
  }, [wfoCount, wfhCount, totalPresence]);

  const radius = 36;
  const circumference = 2 * Math.PI * radius; // ~226.19
  const wfoStrokeDash = (donutData.wfoPercent / 100) * circumference;
  const wfhStrokeDash = (donutData.wfhPercent / 100) * circumference;

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
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {/* 1. Donut Chart Card */}
      <Card className="shadow-none flex flex-col justify-between">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-zinc-900 dark:text-zinc-50">
            <PieChart className="size-4 text-blue-700 dark:text-blue-400" />
            Kehadiran WFO vs WFH
          </CardTitle>
          <CardDescription>Perbandingan rasio kehadiran bulan ini</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-4 flex-1">
          {totalPresence === 0 ? (
            <div className="text-center py-8 text-zinc-400 dark:text-zinc-600 text-xs">
              Belum ada data presensi WFO / WFH
            </div>
          ) : (
            <div className="flex items-center gap-8 w-full justify-around">
              {/* SVG Donut */}
              <div className="relative size-32">
                <svg viewBox="0 0 100 100" className="size-full -rotate-90">
                  {/* WFO Circle (Base / bottom layer) */}
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="transparent"
                    stroke="#10b981" /* emerald-500 */
                    strokeWidth="12"
                    strokeDasharray={circumference}
                    className="transition-all duration-300 cursor-pointer"
                    onMouseEnter={() => setActiveDonutSlice("WFO")}
                    onMouseLeave={() => setActiveDonutSlice(null)}
                  />
                  {/* WFH Circle (Top layer offset) */}
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="transparent"
                    stroke="#3b82f6" /* blue-500 */
                    strokeWidth="12"
                    strokeDasharray={`${wfhStrokeDash} ${circumference}`}
                    strokeDashoffset={-wfoStrokeDash}
                    className="transition-all duration-300 cursor-pointer"
                    onMouseEnter={() => setActiveDonutSlice("WFH")}
                    onMouseLeave={() => setActiveDonutSlice(null)}
                  />
                </svg>
                {/* Donut Center Display */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <p className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">
                    {activeDonutSlice === "WFH" 
                      ? `${donutData.wfhPercent}%` 
                      : activeDonutSlice === "WFO"
                        ? `${donutData.wfoPercent}%`
                        : `${donutData.wfoPercent}%`
                    }
                  </p>
                  <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">
                    {activeDonutSlice === "WFH" 
                      ? "WFH" 
                      : activeDonutSlice === "WFO"
                        ? "WFO"
                        : "WFO (Default)"
                    }
                  </p>
                </div>
              </div>

              {/* Legends */}
              <div className="flex flex-col gap-2.5 text-xs text-zinc-600 dark:text-zinc-400 font-medium">
                <div className="flex items-center gap-2">
                  <span className="size-3 rounded-full bg-emerald-500" />
                  <div>
                    <p className="font-semibold text-zinc-900 dark:text-zinc-200">WFO: {wfoCount} kali</p>
                    <p className="text-[10px] text-zinc-400">{donutData.wfoPercent}% dari total</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="size-3 rounded-full bg-blue-500" />
                  <div>
                    <p className="font-semibold text-zinc-900 dark:text-zinc-200">WFH: {wfhCount} kali</p>
                    <p className="text-[10px] text-zinc-400">{donutData.wfhPercent}% dari total</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Composition Horizontal Bars Card */}
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

      {/* 3. Trend Line Chart Card */}
      <Card className="shadow-none flex flex-col justify-between md:col-span-2 lg:col-span-1">
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
