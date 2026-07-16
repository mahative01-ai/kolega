"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  ClipboardCheck,
  Clock3,
  Download,
  HeartPulse,
  Home,
  QrCode,
  ShieldCheck,
  History,
  Camera,
  CalendarDays,
  User,
  Users,
  Brush,
  Megaphone,
  Check,
  X,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createPersonalQrCredentialAction } from "@/app/member/presensi/actions";
import { WfhForm } from "@/app/member/presensi/wfh-form";
import { DashboardCharts } from "@/components/dashboard-charts";
import { AttendanceSummary } from "@/lib/attendance-report";
import {
  broadcastAnnouncementAction,
  quickAssignPicketAction,
  quickRemovePicketAction
} from "./actions";
import { quickReviewRequestAction } from "./requests/actions";
import { quickReviewCorrectionAction } from "./corrections/actions";
import { dedupeCalendarEvents, isApiHolidayCoveredByDbEvent } from "@/lib/calendar-events";
import { formatMinutesAsClock, getCheckoutEligibility } from "@/lib/checkout-policy";

type Props = {
  currentUser: {
    id: string;
    name: string;
    email: string;
    role: string;
    defaultStudioId: string | null;
  };
  defaultTab?: "personal" | "studio";
  data: {
    studio: { name: string; address: string | null } | null;
    activeMembers: number;
    summary: AttendanceSummary;
    pendingRequests: number;
    recentAttendance: Array<{
      id: string;
      workMode: string;
      status: string;
      checkInAt: Date | null;
      checkOutAt: Date | null;
      user: { name: string; email: string };
      locationStudio: { name: string } | null;
    }>;
    picketToday: Array<{
      id: string;
      user: { name: string };
    }>;
    monthLabel: string;
    personalWorkDayBalance: number;
    selectedMonth: { year: number; monthIndex: number };
    personalSummary: AttendanceSummary;
    personalSchedules: Array<{
      workDate: Date;
      workMode: string;
      note: string | null;
    }>;
    qrCredential: { qrUid: string; issuedAt: Date } | null;
    todayRecord: {
      checkInAt: Date | null;
      checkOutAt: Date | null;
      status: string;
      workMode: string;
      wfhPlan?: string | null;
      wfhReport?: string | null;
    } | null;
    todaySchedule?: {
      workMode: string;
    } | null;
    attendancePolicy?: {
      checkInTime: string;
      checkOutTime: string;
    } | null;
    dailyTrend?: Array<{ dateLabel: string; count: number }>;
    pendingRequestList?: Array<{
      id: string;
      userId: string;
      type: string;
      startDate: Date;
      endDate: Date;
      reason: string;
      user: { name: string; email: string };
    }>;
    pendingCorrectionList?: Array<{
      id: string;
      attendanceRecordId: string;
      newStatus: string | null;
      reason: string;
      requestedBy: { name: string; email: string };
    }>;
    studioMembers?: Array<{
      id: string;
      name: string;
    }>;
    calendarEvents?: Array<{
      id: string;
      title: string;
      type: string;
      startDate: Date;
      endDate: Date;
    }>;
    apiHolidays?: Array<{
      dateKey: string;
      label: string;
      isCutiBersama: boolean;
    }>;
  };
  qrSvg: string | null;
  days: { date: Date; dateKey: string; dayNumber: number }[];
  leadingBlankDays: number;
  todayKey: string;
  scheduleByDateMap: Record<string, { workMode: string; note: string | null }>;
};

const statusLabel: Record<string, string> = {
  PRESENT: "Hadir",
  ON_TIME: "Tepat Waktu",
  LATE: "Terlambat",
  WFH: "WFH",
  PERMISSION: "Izin",
  SICK: "Sakit",
  DISPENSATION: "Dispensasi",
  LEAVE: "Cuti",
  ALPHA: "Alpha",
  HOLIDAY: "Libur",
  OFF_DAY: "Libur",
};

const statusColor: Record<string, string> = {
  PRESENT: "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900",
  ON_TIME: "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900",
  LATE: "bg-orange-100 dark:bg-orange-950/50 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-900",
  WFH: "bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-900",
  PERMISSION: "bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900",
  SICK: "bg-violet-100 dark:bg-violet-950/50 text-violet-800 dark:text-violet-300 border-violet-200 dark:border-violet-900",
  DISPENSATION: "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900",
  LEAVE: "bg-sky-100 dark:bg-sky-950/50 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-900",
  ALPHA: "bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-300 border-red-200 dark:border-red-900",
  HOLIDAY: "bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700",
  OFF_DAY: "bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700",
};

const workModeLabels: Record<string, string> = {
  WFO: "WFO (Kantor)",
  WFH: "WFH (Rumah)",
};

const workModeStyles: Record<string, string> = {
  WFO: "bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700",
  WFH: "bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-900",
};

function formatTime(date: Date | null | string) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(date));
}

function formatFullDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "full",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function AdminDashboardClient({
  defaultTab,
  data,
  qrSvg,
  days,
  leadingBlankDays,
  todayKey,
  scheduleByDateMap,
}: Props) {
  const [activeTab, setActiveTab] = useState<"personal" | "studio">(() => defaultTab ?? "personal");
  const isWfhMode = data.todaySchedule?.workMode === "WFH" || data.todayRecord?.workMode === "WFH";
  const checkoutEligibility = data.todayRecord?.checkInAt && !data.todayRecord.checkOutAt
    ? getCheckoutEligibility({
        checkInAt: data.todayRecord.checkInAt,
        policy: data.attendancePolicy,
      })
    : null;
  const isCheckoutLocked = Boolean(checkoutEligibility && !checkoutEligibility.isAllowed);
  const checkoutAvailableTime = checkoutEligibility
    ? formatMinutesAsClock(checkoutEligibility.allowedCheckoutMinutes)
    : null;

  const adminHolidaysMap = useMemo(() => {
    const map = new Map<string, { title: string; type: string }[]>();
    const apiHolidays = data.apiHolidays ?? [];
    const calendarEvents = data.calendarEvents ?? [];

    const mappedApiHolidays = apiHolidays
      .filter((h) => {
        const [hY, hM] = h.dateKey.split("-").map(Number);
        return hY === data.selectedMonth.year && hM === (data.selectedMonth.monthIndex + 1);
      })
      .map((h) => {
        const dateVal = new Date(`${h.dateKey}T00:00:00.000Z`);
        return {
          type: h.isCutiBersama ? "COMPANY_LEAVE" : "NATIONAL_HOLIDAY",
          title: h.label,
          startDate: dateVal,
          endDate: dateVal,
        };
      });

    const filteredApiHolidays = mappedApiHolidays.filter(
      (hEv) => !isApiHolidayCoveredByDbEvent(hEv, calendarEvents)
    );

    const allCalendarEvents = dedupeCalendarEvents([...calendarEvents, ...filteredApiHolidays]);

    for (const ev of allCalendarEvents) {
      const start = new Date(ev.startDate).getTime();
      const end = new Date(ev.endDate).getTime();
      for (const day of days) {
        const [y, m, d] = day.dateKey.split("-").map(Number);
        const dayTs = Date.UTC(y, m - 1, d);
        if (dayTs >= start && dayTs <= end) {
          const existing = map.get(day.dateKey) ?? [];
          existing.push({ title: ev.title, type: ev.type });
          map.set(day.dateKey, existing);
        }
      }
    }
    return map;
  }, [data.apiHolidays, data.calendarEvents, data.selectedMonth, days]);

  // Category 4 - State & Transitions
  const [isPending, startTransition] = useTransition();
  const [announcementMsg, setAnnouncementMsg] = useState("");
  const [broadcastErr, setBroadcastErr] = useState("");
  const [broadcastSucc, setBroadcastSucc] = useState("");

  const [picketUserId, setPicketUserId] = useState("");
  const [removingPickets, setRemovingPickets] = useState<Record<string, boolean>>({});
  const [reviewingRequests, setReviewingRequests] = useState<Record<string, boolean>>({});
  const [reviewingCorrections, setReviewingCorrections] = useState<Record<string, boolean>>({});

  const personalMetrics = [
    {
      label: `Kehadiran Saya ${data.monthLabel}`,
      value: data.personalSummary.total,
      icon: ClipboardCheck,
      color: "text-blue-700 dark:text-blue-400",
    },
    {
      label: `Sakit Saya ${data.monthLabel}`,
      value: data.personalSummary.sick,
      icon: HeartPulse,
      color: "text-violet-700 dark:text-violet-400",
    },
    {
      label: `Terlambat Saya ${data.monthLabel}`,
      value: data.personalSummary.late,
      icon: Clock3,
      color: "text-orange-700 dark:text-orange-400",
    },
    {
      label: `Alpha Saya ${data.monthLabel}`,
      value: data.personalSummary.alpha,
      icon: AlertTriangle,
      color: "text-red-700 dark:text-red-400",
    },
    {
      label: `WFH Saya ${data.monthLabel}`,
      value: data.personalSummary.wfh,
      icon: Home,
      color: "text-sky-700 dark:text-sky-400",
    },
    {
      label: "Saldo Hari Kerja",
      value: data.personalWorkDayBalance,
      icon: ShieldCheck,
      color:
        data.personalWorkDayBalance < 0
          ? "text-red-700 dark:text-red-400"
          : data.personalWorkDayBalance > 0
            ? "text-emerald-700 dark:text-emerald-400"
            : "text-zinc-700 dark:text-zinc-300",
    },
  ];

  const studioMetrics = [
    {
      label: `Kehadiran Tim ${data.monthLabel}`,
      value: data.summary.total,
      icon: ClipboardCheck,
      color: "text-blue-700 dark:text-blue-400",
    },
    {
      label: `Sakit Tim ${data.monthLabel}`,
      value: data.summary.sick,
      icon: HeartPulse,
      color: "text-violet-700 dark:text-violet-400",
    },
    {
      label: `Terlambat Tim ${data.monthLabel}`,
      value: data.summary.late,
      icon: Clock3,
      color: "text-orange-700 dark:text-orange-400",
    },
    {
      label: `Alpha Tim ${data.monthLabel}`,
      value: data.summary.alpha,
      icon: AlertTriangle,
      color: "text-red-700 dark:text-red-400",
    },
    {
      label: `WFH Tim ${data.monthLabel}`,
      value: data.summary.wfh,
      icon: Home,
      color: "text-sky-700 dark:text-sky-400",
    },
  ];

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleBroadcast() {
    if (!announcementMsg.trim()) return;
    setBroadcastErr("");
    setBroadcastSucc("");
    startTransition(async () => {
      try {
        const res = await broadcastAnnouncementAction(announcementMsg);
        if (res.success) {
          setBroadcastSucc(res.message);
          setAnnouncementMsg("");
          setTimeout(() => setBroadcastSucc(""), 3000);
        }
      } catch (err: unknown) {
        setBroadcastErr(getErrorMessage(err, "Gagal menyebarkan pengumuman."));
      }
    });
  }

  function handleQuickAssignPicket() {
    if (!picketUserId) return;
    startTransition(async () => {
      try {
        const todayStr = new Date().toISOString().split("T")[0];
        await quickAssignPicketAction(picketUserId, todayStr);
        setPicketUserId("");
      } catch (err: unknown) {
        alert(getErrorMessage(err, "Gagal menunjuk petugas piket."));
      }
    });
  }

  function handleQuickRemovePicket(picketId: string) {
    setRemovingPickets((prev) => ({ ...prev, [picketId]: true }));
    startTransition(async () => {
      try {
        await quickRemovePicketAction(picketId);
      } catch (err: unknown) {
        alert(getErrorMessage(err, "Gagal menghapus piket."));
      } finally {
        setRemovingPickets((prev) => ({ ...prev, [picketId]: false }));
      }
    });
  }

  function handleQuickReviewRequest(requestId: string, approve: boolean) {
    setReviewingRequests((prev) => ({ ...prev, [requestId]: true }));
    startTransition(async () => {
      try {
        await quickReviewRequestAction(requestId, approve);
      } catch (err: unknown) {
        alert(getErrorMessage(err, "Gagal memproses pengajuan."));
      } finally {
        setReviewingRequests((prev) => ({ ...prev, [requestId]: false }));
      }
    });
  }

  function handleQuickReviewCorrection(correctionId: string, approve: boolean) {
    setReviewingCorrections((prev) => ({ ...prev, [correctionId]: true }));
    startTransition(async () => {
      try {
        await quickReviewCorrectionAction(correctionId, approve);
      } catch (err: unknown) {
        alert(getErrorMessage(err, "Gagal memproses koreksi."));
      } finally {
        setReviewingCorrections((prev) => ({ ...prev, [correctionId]: false }));
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={() => setActiveTab("personal")}
          className={cn(
            "px-4 py-2.5 text-sm font-semibold border-b-2 -mb-[2px] transition-colors flex items-center gap-1.5",
            activeTab === "personal"
              ? "border-zinc-950 text-zinc-950 dark:border-zinc-100 dark:text-zinc-100"
              : "border-transparent text-zinc-500 hover:text-zinc-800"
          )}
        >
          <User className="size-4" />
          Aktivitas Saya
        </button>
        <button
          onClick={() => setActiveTab("studio")}
          className={cn(
            "px-4 py-2.5 text-sm font-semibold border-b-2 -mb-[2px] transition-colors flex items-center gap-1.5",
            activeTab === "studio"
              ? "border-zinc-950 text-zinc-950 dark:border-zinc-100 dark:text-zinc-100"
              : "border-transparent text-zinc-500 hover:text-zinc-800"
          )}
        >
          <Users className="size-4" />
          Manajemen Studio
        </button>
      </div>

      {/* ───── TAB 1: PERSONAL WORKSPACE (AKTIVITAS SAYA) ───── */}
      {activeTab === "personal" && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          {/* Metrics */}
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {personalMetrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <Card key={metric.label} className="shadow-none h-full flex flex-col justify-between">
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-2">
                      <Icon className={cn("size-4", metric.color)} />
                      {metric.label}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className={cn("text-3xl font-semibold", metric.color)}>
                      {metric.value.toLocaleString("id-ID")}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </section>

          {/* Today's Record */}
          <Card className="shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-zinc-900 dark:text-zinc-50">
                <Clock3 className="size-5 text-blue-700 dark:text-blue-400" />
                Presensi Pribadi Hari Ini
              </CardTitle>
              <CardDescription className="text-zinc-500 dark:text-zinc-400">
                {formatFullDate(new Date())}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/10 p-3 shadow-none">
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Check-in</p>
                <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  {formatTime(data.todayRecord?.checkInAt ?? null)}
                </p>
              </div>
              <div className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/10 p-3 shadow-none">
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Check-out</p>
                <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  {formatTime(data.todayRecord?.checkOutAt ?? null)}
                </p>
              </div>
              <div className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/10 p-3 shadow-none">
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Status</p>
                <div className="mt-1">
                  {data.todayRecord ? (
                    <Badge
                      className={cn("text-xs font-semibold px-2 py-0.5 border shadow-none", statusColor[data.todayRecord.status])}
                    >
                      {statusLabel[data.todayRecord.status] ?? data.todayRecord.status}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 text-xs px-2 py-0.5 shadow-none">
                      Belum Presensi
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
            <CardContent className="pt-0 flex flex-wrap gap-2">
              <Link
                href="/member/presensi/riwayat"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "flex items-center gap-1.5")}
              >
                <History className="size-4" />
                Lihat Riwayat Presensi Saya
              </Link>
              {!isWfhMode && (!data.todayRecord || !data.todayRecord.checkOutAt) && (
                isCheckoutLocked ? (
                  <span
                    aria-disabled="true"
                    title={`Check-out baru dibuka pukul ${checkoutAvailableTime}`}
                    className={cn(
                      buttonVariants({ variant: "default", size: "sm" }),
                      "flex cursor-not-allowed items-center gap-1.5 bg-zinc-200 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
                    )}
                  >
                    <Camera className="size-4" />
                    Check-out dibuka {checkoutAvailableTime}
                  </span>
                ) : (
                  <Link
                    href={data.todayRecord?.checkInAt ? "/login?action=checkout" : "/member/presensi"}
                    className={cn(buttonVariants({ variant: "default", size: "sm" }), "flex items-center gap-1.5")}
                  >
                    <Camera className="size-4" />
                    {data.todayRecord?.checkInAt ? "Scan Check-out WFO" : "Presensi WFO (Kamera/QR)"}
                  </Link>
                )
              )}
            </CardContent>
            {isWfhMode && (
              <CardContent className="border-t border-zinc-100 dark:border-zinc-800 pt-4">
                <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 bg-zinc-50/50 dark:bg-zinc-900/10">
                  <h3 className="text-sm font-semibold mb-3 text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5">
                    <Home className="size-4 text-emerald-600" />
                    Presensi WFH
                  </h3>
                  <WfhForm
                    hasCheckedIn={!!data.todayRecord?.checkInAt}
                    hasCheckedOut={!!data.todayRecord?.checkOutAt}
                    checkInPlan={data.todayRecord?.wfhPlan}
                  />
                </div>
              </CardContent>
            )}
          </Card>

          {/* QR and Calendar */}
          <div className="grid gap-6 lg:grid-cols-[0.35fr_0.65fr]">
            {/* QR Card */}
            <Card className="shadow-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-zinc-900 dark:text-zinc-50">
                  <QrCode className="size-5 text-zinc-700 dark:text-zinc-400" />
                  QR Card Saya
                </CardTitle>
                <CardDescription className="text-zinc-500 dark:text-zinc-400">
                  Kartu QR digital untuk memindai kehadiran di kantor.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.qrCredential ? (
                  <>
                    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
                      <div
                        className="mx-auto flex size-44 items-center justify-center [&_svg]:size-40 dark:[&_svg_rect]:fill-zinc-900"
                        dangerouslySetInnerHTML={{ __html: qrSvg ?? "" }}
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">QR UID</p>
                      <div className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 px-3 py-1 font-mono text-xs truncate text-zinc-700 dark:text-zinc-300">
                        {data.qrCredential.qrUid}
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <a
                        href="/member/presensi/qr-card?format=html"
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full flex items-center justify-center gap-1.5")}
                      >
                        <Download className="size-4" />
                        Lihat QR Card
                      </a>
                    </div>
                  </>
                ) : (
                  <form action={createPersonalQrCredentialAction}>
                    <Button type="submit" className="w-full">
                      <ShieldCheck className="mr-1.5 size-4" />
                      Aktifkan QR Card
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>

            {/* Calendar */}
            <Card className="shadow-none">
              <CardHeader>
                <CardTitle className="text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                  <CalendarDays className="size-5 text-blue-700 dark:text-blue-400" />
                  Jadwal Kalender Kerja Saya
                </CardTitle>
                <CardDescription className="text-zinc-500 dark:text-zinc-400">
                  Mode kerja kalender pribadi Anda bulan ini.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 border border-zinc-200 dark:border-zinc-800 rounded overflow-hidden">
                  {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((d) => (
                    <div key={d} className="bg-zinc-50 dark:bg-zinc-900/50 py-1.5 text-center text-[10px] font-bold text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
                      {d}
                    </div>
                  ))}
                  {Array.from({ length: leadingBlankDays }, (_, idx) => (
                    <div key={`blank-${idx}`} className="bg-zinc-50/50 dark:bg-zinc-900/10 border-b border-r border-zinc-100 dark:border-zinc-800 min-h-12" />
                  ))}
                  {days.map((day) => {
                    const schedule = scheduleByDateMap[day.dateKey];
                    const isToday = day.dateKey === todayKey;
                    const dayHolidays = adminHolidaysMap.get(day.dateKey) ?? [];

                    const hasHoliday = dayHolidays.some(h => 
                      h.type === "NATIONAL_HOLIDAY" || 
                      h.type === "COMPANY_LEAVE" || 
                      h.type === "REGULAR_OFF_DAY"
                    );
                    const hasReplacement = dayHolidays.some(h => h.type === "REPLACEMENT_WORKDAY");
                    const isRealHoliday = hasHoliday && !hasReplacement;

                    return (
                      <div
                        key={day.dateKey}
                        className={cn(
                          "min-h-16 p-1 bg-white dark:bg-zinc-950 flex flex-col justify-between transition-colors",
                          isToday && "bg-blue-50/30 dark:bg-blue-950/10"
                        )}
                      >
                        <span
                          className={cn(
                            "inline-flex size-5 items-center justify-center rounded-full text-[10px] font-semibold",
                            isToday
                              ? "bg-blue-700 dark:bg-blue-400 text-white dark:text-zinc-950"
                              : "text-zinc-500 dark:text-zinc-400"
                          )}
                        >
                          {day.dayNumber}
                        </span>

                        <div className="space-y-0.5 mt-1">
                          {dayHolidays.map((h, hIdx) => (
                            <div
                              key={hIdx}
                              className={cn(
                                "text-[7px] font-bold px-1 py-0.5 rounded border truncate text-left select-none leading-none",
                                h.type === "NATIONAL_HOLIDAY"
                                  ? "bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900"
                                  : h.type === "COMPANY_LEAVE"
                                  ? "bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-900"
                                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700"
                              )}
                              title={h.title}
                            >
                              {h.title}
                            </div>
                          ))}

                          {isRealHoliday ? (
                            <div className="text-[8px] font-bold px-1 py-0.5 rounded border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-center select-none font-semibold">
                              Libur
                            </div>
                          ) : schedule ? (
                            <div
                              className={cn(
                                "text-[8px] font-bold px-1 py-0.5 rounded border truncate text-center select-none",
                                workModeStyles[schedule.workMode]
                              )}
                              title={schedule.note || workModeLabels[schedule.workMode]}
                            >
                              {schedule.workMode}
                            </div>
                          ) : hasReplacement ? (
                            <div className="text-[8px] font-bold px-1 py-0.5 rounded border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 text-center select-none font-semibold">
                              WFO
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ───── TAB 2: STUDIO OPERATIONAL VIEW (MANAJEMEN STUDIO) ───── */}
      {activeTab === "studio" && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          {/* Studio Metrics */}
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {studioMetrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <Card key={metric.label} className="shadow-none h-full flex flex-col justify-between">
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-2">
                      <Icon className={cn("size-4", metric.color)} />
                      {metric.label}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className={cn("text-3xl font-semibold", metric.color)}>
                      {metric.value.toLocaleString("id-ID")}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </section>

          {/* Visual Charts */}
          <section className="animate-in fade-in-50 duration-200 delay-75">
            <DashboardCharts summary={data.summary} dailyTrend={data.dailyTrend} />
          </section>

          {/* Category 4: Quick Approvals (Pending Request & Corrections) */}
          {((data.pendingRequestList && data.pendingRequestList.length > 0) ||
            (data.pendingCorrectionList && data.pendingCorrectionList.length > 0)) ? (
            <Card className="shadow-none">
              <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <CardTitle className="text-base text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                  <ShieldCheck className="size-5 text-blue-700 dark:text-blue-400" />
                  Persetujuan Cepat (Pending Approvals)
                </CardTitle>
                <CardDescription className="text-xs text-zinc-500">
                  Tinjau pengajuan izin magang & koreksi presensi harian anggota studio Anda di bawah ini secara cepat.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {/* 1. Requests (Sakit, Cuti, Izin) */}
                {data.pendingRequestList && data.pendingRequestList.length > 0 && (
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Izin & Sakit</h4>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {data.pendingRequestList.map((req) => {
                        const isReviewing = reviewingRequests[req.id] || false;
                        return (
                          <div key={req.id} className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 bg-zinc-50/50 dark:bg-zinc-900/10 flex flex-col justify-between gap-3 text-xs">
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-semibold text-zinc-800 dark:text-zinc-200">{req.user.name}</span>
                                <Badge className="text-[10px] font-semibold">{req.type}</Badge>
                              </div>
                              <p className="text-[10px] text-zinc-500 font-medium">
                                Tanggal: {new Date(req.startDate).toLocaleDateString("id-ID", { day: "numeric", month: "short" })} - {new Date(req.endDate).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                              </p>
                              <p className="text-zinc-600 dark:text-zinc-400 mt-2 font-normal italic">&ldquo;{req.reason}&rdquo;</p>
                            </div>
                            <div className="flex justify-end gap-2 border-t border-zinc-100 dark:border-zinc-800 pt-2.5">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[10px] text-red-600 border-red-200 bg-red-50/50 hover:bg-red-50"
                                onClick={() => handleQuickReviewRequest(req.id, false)}
                                disabled={isPending || isReviewing}
                              >
                                {isReviewing ? <Loader2 className="size-3 animate-spin" /> : <X className="size-3 mr-1" />}
                                Tolak
                              </Button>
                              <Button
                                size="sm"
                                variant="default"
                                className="h-7 text-[10px] bg-emerald-600 text-white hover:bg-emerald-700 border-0"
                                onClick={() => handleQuickReviewRequest(req.id, true)}
                                disabled={isPending || isReviewing}
                              >
                                {isReviewing ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3 mr-1" />}
                                Setujui
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. Corrections */}
                {data.pendingCorrectionList && data.pendingCorrectionList.length > 0 && (
                  <div className="space-y-2.5 pt-2">
                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Koreksi Presensi</h4>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {data.pendingCorrectionList.map((corr) => {
                        const isReviewing = reviewingCorrections[corr.id] || false;
                        return (
                          <div key={corr.id} className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 bg-zinc-50/50 dark:bg-zinc-900/10 flex flex-col justify-between gap-3 text-xs">
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-semibold text-zinc-800 dark:text-zinc-200">{corr.requestedBy.name}</span>
                                <Badge variant="outline" className="text-[10px] border-amber-300 bg-amber-50 text-amber-800 font-semibold">Koreksi: {corr.newStatus}</Badge>
                              </div>
                              <p className="text-zinc-600 dark:text-zinc-400 mt-2 font-normal italic">&ldquo;{corr.reason}&rdquo;</p>
                            </div>
                            <div className="flex justify-end gap-2 border-t border-zinc-100 dark:border-zinc-800 pt-2.5">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[10px] text-red-600 border-red-200 bg-red-50/50 hover:bg-red-50"
                                onClick={() => handleQuickReviewCorrection(corr.id, false)}
                                disabled={isPending || isReviewing}
                              >
                                {isReviewing ? <Loader2 className="size-3 animate-spin" /> : <X className="size-3 mr-1" />}
                                Tolak
                              </Button>
                              <Button
                                size="sm"
                                variant="default"
                                className="h-7 text-[10px] bg-emerald-600 text-white hover:bg-emerald-700 border-0"
                                onClick={() => handleQuickReviewCorrection(corr.id, true)}
                                disabled={isPending || isReviewing}
                              >
                                {isReviewing ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3 mr-1" />}
                                Setujui
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 flex flex-col items-center justify-center text-center">
              <div className="rounded-full bg-emerald-50 dark:bg-emerald-950/20 p-2.5 text-emerald-600 mb-3">
                <Check className="size-5" />
              </div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Semua Beres!</p>
              <p className="text-xs text-zinc-500 mt-0.5">Tidak ada pengajuan izin atau koreksi presensi yang menanti persetujuan.</p>
            </div>
          )}

          {/* Picket Duty Info & Broadcast Announcement */}
          <div className="grid gap-6 md:grid-cols-3">
            {/* Picket Duty Info */}
            <Card className="md:col-span-2 shadow-none">
              <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-zinc-900 dark:text-zinc-50">
                  <Brush className="size-4 text-blue-700 dark:text-blue-400" />
                  Petugas Piket Studio Hari Ini
                </CardTitle>
                <CardDescription className="text-zinc-500 dark:text-zinc-400">
                  Staf yang bertanggung jawab atas ketertiban studio hari ini.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {data.picketToday.length === 0 ? (
                  <p className="text-center py-6 text-xs text-zinc-400 dark:text-zinc-500">
                    Belum ada petugas piket yang ditugaskan hari ini.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2.5">
                    {data.picketToday.map((picket) => {
                      const isRemoving = removingPickets[picket.id] || false;
                      return (
                        <div
                          key={picket.id}
                          className="rounded-full border border-blue-100 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20 pl-3.5 pr-2 py-1 text-xs font-semibold text-blue-800 dark:text-blue-300 flex items-center gap-1.5"
                        >
                          <User className="size-3 text-blue-500" />
                          <span>{picket.user.name}</span>
                          <button
                            onClick={() => handleQuickRemovePicket(picket.id)}
                            disabled={isPending || isRemoving}
                            className="rounded-full hover:bg-blue-100 dark:hover:bg-blue-900 p-0.5 text-blue-400 hover:text-red-600 transition-colors shrink-0"
                            title="Hapus petugas piket"
                          >
                            {isRemoving ? <Loader2 className="size-3 animate-spin" /> : <X className="size-3" />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Quick Picket Switcher Selection */}
                {data.studioMembers && data.studioMembers.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-dashed border-zinc-100 dark:border-zinc-800">
                    <Label htmlFor="picket-select" className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Tunjuk Petugas:</Label>
                    <select
                      id="picket-select"
                      value={picketUserId}
                      onChange={(e) => setPicketUserId(e.target.value)}
                      className="rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-2 py-1 text-xs text-zinc-700 dark:text-zinc-300 outline-none"
                    >
                      <option value="">-- Pilih Anggota --</option>
                      {data.studioMembers.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      onClick={handleQuickAssignPicket}
                      disabled={isPending || !picketUserId}
                    >
                      Tunjuk
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Broadcast Announcement Card */}
            <Card className="shadow-none flex flex-col justify-between">
              <div>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5">
                    <Megaphone className="size-4 text-blue-700 dark:text-blue-400" />
                    Broadcast Pengumuman
                  </CardTitle>
                  <CardDescription className="text-xs text-zinc-500">
                    Kirim pesan cepat ke dasbor semua anggota studio Anda.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    placeholder="Tulis pengumuman studio..."
                    className="min-h-20 text-xs resize-none"
                    value={announcementMsg}
                    onChange={(e) => setAnnouncementMsg(e.target.value)}
                  />
                  {broadcastErr && <p className="text-[10px] text-red-600">{broadcastErr}</p>}
                  {broadcastSucc && <p className="text-[10px] text-emerald-600 font-semibold">{broadcastSucc}</p>}
                </CardContent>
              </div>
              <CardContent className="pt-0 flex justify-end">
                <Button
                  size="sm"
                  className="w-full text-xs"
                  onClick={handleBroadcast}
                  disabled={isPending || !announcementMsg.trim()}
                >
                  {isPending ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : null}
                  Sebarkan Pesan
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Recent Attendance (Tabel Presensi Tim) */}
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                <Users className="size-5 text-blue-700 dark:text-blue-400" />
                Presensi Tim Hari Ini
              </CardTitle>
              <CardDescription className="text-zinc-500 dark:text-zinc-400">
                Daftar kehadiran staf studio {data.studio?.name ?? ""} hari ini.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Lokasi Presensi</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Check-in</TableHead>
                    <TableHead>Check-out</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentAttendance.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-sm text-zinc-500">
                        Belum ada data presensi staf hari ini.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.recentAttendance.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          <div>{item.user.name}</div>
                          <div className="text-xs font-normal text-zinc-500">{item.user.email}</div>
                        </TableCell>
                        <TableCell>{item.locationStudio?.name ?? "Tidak perlu lokasi"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300">
                            {item.workMode}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={statusColor[item.status]}>
                            {statusLabel[item.status] ?? item.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatTime(item.checkInAt)}</TableCell>
                        <TableCell>{formatTime(item.checkOutAt)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
