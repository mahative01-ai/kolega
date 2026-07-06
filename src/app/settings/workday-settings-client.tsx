"use client";

import { useState, useTransition } from "react";
import { Loader2, Clock, ShieldAlert, KeyRound, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  upsertWeeklyWorkRulesAction,
  updateStudioWeekStartAction,
  updateStudioPolicyAction,
} from "./actions";

type DayRule = {
  dayOfWeek: number;
  isWorkday: boolean;
  isOptional: boolean;
  workStartTime: string;
  workEndTime: string;
};

type StudioPolicy = {
  checkInTime: string;
  checkOutTime: string;
  graceMinutes: number;
  alphaCutoffTime: string;
};

type Studio = {
  id: string;
  name: string;
  weekStartDay: number;
  weeklyWorkRules: DayRule[];
  policies: StudioPolicy[];
};

type Props = {
  studios: Studio[];
};

// Display order: Mon(1), Tue(2), Wed(3), Thu(4), Fri(5), Sat(6), Sun(0)
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DAY_LABELS_DISPLAY = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

const WEEK_START_OPTIONS = [
  { label: "Senin", value: 1 },
  { label: "Selasa", value: 2 },
  { label: "Minggu", value: 0 },
  { label: "Sabtu", value: 6 },
];

function defaultRules(): DayRule[] {
  return DISPLAY_ORDER.map((day) => ({
    dayOfWeek: day,
    isWorkday: day >= 1 && day <= 5, // Mon–Fri default workday
    isOptional: false,
    workStartTime: "08:00",
    workEndTime: "16:00",
  }));
}

function cycleState(rule: DayRule): DayRule {
  if (!rule.isWorkday) {
    // Off → Required
    return { ...rule, isWorkday: true, isOptional: false };
  } else if (!rule.isOptional) {
    // Required → Optional
    return { ...rule, isWorkday: true, isOptional: true };
  } else {
    // Optional → Off
    return { ...rule, isWorkday: false, isOptional: false };
  }
}

export function WorkdaySettingsClient({ studios }: Props) {
  const [selectedStudioId, setSelectedStudioId] = useState(studios[0]?.id ?? "");
  const [isPending, startTransition] = useTransition();
  const [savedMsg, setSavedMsg] = useState("");
  const [error, setError] = useState("");

  // Local rules state per studio
  const [rulesMap, setRulesMap] = useState<Record<string, DayRule[]>>(() => {
    const map: Record<string, DayRule[]> = {};
    for (const studio of studios) {
      const defaults = defaultRules();
      map[studio.id] = DISPLAY_ORDER.map((day) => {
        const existing = studio.weeklyWorkRules.find((r) => r.dayOfWeek === day);
        const def = defaults.find((r) => r.dayOfWeek === day)!;
        return existing ?? def;
      });
    }
    return map;
  });

  const [weekStartMap, setWeekStartMap] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    for (const studio of studios) {
      map[studio.id] = studio.weekStartDay;
    }
    return map;
  });

  // Local policies state per studio
  const [policiesMap, setPoliciesMap] = useState<Record<string, StudioPolicy>>(() => {
    const map: Record<string, StudioPolicy> = {};
    for (const studio of studios) {
      const activePolicy = studio.policies?.[0] ?? {
        checkInTime: "08:00",
        checkOutTime: "16:00",
        graceMinutes: 10,
        alphaCutoffTime: "12:00",
      };
      map[studio.id] = activePolicy;
    }
    return map;
  });

  const currentRules = rulesMap[selectedStudioId] ?? defaultRules();
  const currentWeekStart = weekStartMap[selectedStudioId] ?? 1;
  const currentPolicy = policiesMap[selectedStudioId] ?? {
    checkInTime: "08:00",
    checkOutTime: "16:00",
    graceMinutes: 10,
    alphaCutoffTime: "12:00",
  };

  function toggleDay(idx: number) {
    setRulesMap((prev) => {
      const rules = [...(prev[selectedStudioId] ?? defaultRules())];
      rules[idx] = cycleState(rules[idx]);
      return { ...prev, [selectedStudioId]: rules };
    });
  }

  function updatePolicyField<K extends keyof StudioPolicy>(key: K, value: StudioPolicy[K]) {
    setPoliciesMap((prev) => {
      const policy = { ...(prev[selectedStudioId] ?? currentPolicy) };
      policy[key] = value;
      return { ...prev, [selectedStudioId]: policy };
    });
  }

  // Count required workdays this month (calendar-based)
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let requiredDays = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const jsDay = new Date(year, month, d).getDay(); // 0=Sun, 6=Sat
    const rule = currentRules.find((r) => r.dayOfWeek === jsDay);
    if (rule?.isWorkday && !rule.isOptional) requiredDays++;
  }

  const monthLabel = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(now);

  function handleSave() {
    setSavedMsg("");
    setError("");
    startTransition(async () => {
      try {
        await upsertWeeklyWorkRulesAction(selectedStudioId, currentRules);
        await updateStudioWeekStartAction(selectedStudioId, currentWeekStart);
        await updateStudioPolicyAction(selectedStudioId, {
          checkInTime: currentPolicy.checkInTime,
          checkOutTime: currentPolicy.checkOutTime,
          graceMinutes: Number(currentPolicy.graceMinutes),
          alphaCutoffTime: currentPolicy.alphaCutoffTime,
        });
        setSavedMsg("Semua pengaturan berhasil disimpan.");
        setTimeout(() => setSavedMsg(""), 3000);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Gagal menyimpan.");
      }
    });
  }

  return (
    <div className="grid gap-6">
      {/* Studio Selector */}
      {studios.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {studios.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedStudioId(s.id)}
              className={`rounded-lg border px-4 py-1.5 text-sm font-medium transition-colors ${
                selectedStudioId === s.id
                  ? "border-zinc-950 bg-zinc-950 text-white"
                  : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {/* 1. Grace Period & Presence Time Policy Form */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-none">
        <div className="mb-4">
          <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Kebijakan Jam & Toleransi Presensi (Grace Period)</p>
          <p className="text-sm text-zinc-500">
            Sesuaikan aturan keterlambatan dan jam kerja untuk anggota studio.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <div className="grid gap-1.5">
            <Label htmlFor="policy-in" className="text-zinc-700 dark:text-zinc-300">Jam Masuk (Check-in)</Label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
              <Input
                id="policy-in"
                type="time"
                value={currentPolicy.checkInTime}
                onChange={(e) => updatePolicyField("checkInTime", e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="policy-out" className="text-zinc-700 dark:text-zinc-300">Jam Pulang (Check-out)</Label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
              <Input
                id="policy-out"
                type="time"
                value={currentPolicy.checkOutTime}
                onChange={(e) => updatePolicyField("checkOutTime", e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="policy-grace" className="text-zinc-700 dark:text-zinc-300">Toleransi Terlambat (Menit)</Label>
            <div className="relative">
              <ShieldAlert className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
              <Input
                id="policy-grace"
                type="number"
                value={currentPolicy.graceMinutes}
                onChange={(e) => updatePolicyField("graceMinutes", Number(e.target.value))}
                className="pl-9"
                placeholder="10"
                min={0}
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="policy-cutoff" className="text-zinc-700 dark:text-zinc-300">Batas Absen (Alpha Cutoff)</Label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
              <Input
                id="policy-cutoff"
                type="time"
                value={currentPolicy.alphaCutoffTime}
                onChange={(e) => updatePolicyField("alphaCutoffTime", e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Work Days */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-none">
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Hari Kerja Mingguan</span>
          </div>
          <p className="text-sm text-zinc-500">
            Klik untuk cycling: <span className="font-medium text-zinc-700 dark:text-zinc-300">Off</span> →{" "}
            <span className="font-medium text-zinc-900 dark:text-zinc-50">Wajib</span> →{" "}
            <span className="font-medium text-amber-600">Opsional</span> → Off
          </p>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {currentRules.map((rule, idx) => {
            const label = DAY_LABELS_DISPLAY[idx];
            const isOptional = rule.isWorkday && rule.isOptional;
            const isRequired = rule.isWorkday && !rule.isOptional;

            return (
              <button
                key={rule.dayOfWeek}
                onClick={() => toggleDay(idx)}
                className={`relative flex flex-col items-center justify-center rounded-xl border-2 w-14 h-14 text-sm font-bold transition-all ${
                  isRequired
                    ? "border-zinc-900 bg-zinc-900 dark:border-zinc-100 dark:bg-zinc-100 text-white dark:text-zinc-950"
                    : isOptional
                    ? "border-amber-400 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300"
                    : "border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-400"
                }`}
                title={isRequired ? "Hari Wajib" : isOptional ? "Opsional" : "Libur"}
              >
                {label}
                {isOptional && (
                  <span className="absolute -top-1.5 -right-1.5 text-[9px] bg-amber-400 text-white rounded-full px-1 leading-tight font-medium">
                    opt
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-zinc-500">
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-full bg-zinc-900 dark:bg-zinc-100" />
            Wajib:{" "}
            {currentRules
              .filter((r) => r.isWorkday && !r.isOptional)
              .map((r) => DAY_LABELS_DISPLAY[DISPLAY_ORDER.indexOf(r.dayOfWeek)])
              .join(", ") || "-"}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-full bg-amber-400" />
            Opsional:{" "}
            {currentRules
              .filter((r) => r.isWorkday && r.isOptional)
              .map((r) => DAY_LABELS_DISPLAY[DISPLAY_ORDER.indexOf(r.dayOfWeek)])
              .join(", ") || "-"}
          </span>
        </div>
        {currentRules.some((r) => r.isOptional) && (
          <p className="mt-3 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg px-3 py-2">
            💡 Hari opsional dihitung hadir jika masuk, tapi tidak dihitung alpha jika tidak masuk.
          </p>
        )}
      </div>

      {/* Week Starts On + Monthly Count */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Week Starts On */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-none">
          <div className="mb-4">
            <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Minggu Dimulai</p>
            <p className="text-sm text-zinc-500">Digunakan untuk laporan mingguan</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {WEEK_START_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() =>
                  setWeekStartMap((prev) => ({ ...prev, [selectedStudioId]: opt.value }))
                }
                className={`rounded-lg border py-2 text-sm font-medium transition-colors ${
                  currentWeekStart === opt.value
                    ? "border-zinc-900 bg-zinc-900 dark:border-zinc-100 dark:bg-zinc-100 text-white dark:text-zinc-950"
                    : "border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Monthly Count */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-none">
          <div className="mb-4">
            <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Jumlah Hari Kerja Bulanan</p>
            <p className="text-sm text-zinc-500">Cara hitung total hari kerja per bulan</p>
          </div>
          <div
            className="rounded-lg border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 p-3 cursor-default"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-emerald-900 dark:text-emerald-300">Berbasis Kalender</span>
              <Badge className="text-[10px] bg-emerald-500 text-white border-0">Aktif</Badge>
            </div>
            <p className="text-xs text-emerald-700 dark:text-emerald-400">Hitung hari wajib di tiap bulan secara dinamis</p>
            <p className="mt-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              {monthLabel}: {requiredDays} hari wajib
            </p>
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="flex items-center justify-end gap-3">
        {savedMsg && <p className="text-sm text-emerald-700 font-medium">{savedMsg}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
          Simpan Pengaturan Studio
        </Button>
      </div>
    </div>
  );
}
