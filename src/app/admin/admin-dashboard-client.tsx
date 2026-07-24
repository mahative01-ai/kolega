"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  ClipboardCheck,
  Clock3,
  HeartPulse,
  Home,
  QrCode,
  ShieldCheck,
  History,
  Camera,
  User,
  Users,
  Brush,
  Megaphone,
  Check,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createPersonalQrCredentialAction } from "@/app/member/presensi/actions";
import { WfhForm } from "@/app/member/presensi/wfh-form";
import { WfoJournalForm } from "@/app/member/presensi/wfo-journal-form";
import { DashboardCharts } from "@/components/dashboard-charts";
import { AttendanceSummary } from "@/lib/attendance-report";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  broadcastAnnouncementAction,
} from "./actions";
import { quickReviewRequestAction } from "./requests/actions";
import { quickReviewCorrectionAction } from "./corrections/actions";
import { dedupeCalendarEvents, isApiHolidayCoveredByDbEvent } from "@/lib/calendar-events";
import { formatMinutesAsClock, getCheckoutEligibility } from "@/lib/checkout-policy";
import { ActiveAnnouncementsClient } from "@/components/active-announcements-client";
import { formatMonthLabel } from "@/lib/calendar";

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
      studio?: { name: string } | null;
      note?: string | null;
    }>;
    monthLabel: string;
    personalWorkDayBalance: number;
    selectedMonth: { year: number; monthIndex: number; monthKey?: string };
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
    activeAnnouncements: Array<{
      id: string;
      title: string;
      message: string;
      publishAt: Date | string;
      eventDate: Date | string | null;
      priority: number;
    }>;
  };
  days: { date: Date; dateKey: string; dayNumber: number }[];
  leadingBlankDays: number;
  todayKey: string;
  scheduleByDateMap: Record<string, { workMode: string; note: string | null }>;
  attendanceByDateMap: Record<string, { status: string; isManualCorrection: boolean; workMode: string }>;
};

const statusLabel: Record<string, string> = {
  PRESENT: "Present",
  ON_TIME: "On Time",
  LATE: "Late",
  WFH: "WFH",
  PERMISSION: "Permission",
  SICK: "Sick",
  DISPENSATION: "Dispensation",
  LEAVE: "Replacement Day",
  ALPHA: "Alpha",
  HOLIDAY: "Holiday",
  OFF_DAY: "Holiday",
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

function formatTime(date: Date | null | string) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(date));
}

function formatFullDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
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
  days,
  leadingBlankDays,
  todayKey,
  scheduleByDateMap,
  attendanceByDateMap,
}: Props) {
  const [activeTab, setActiveTab] = useState<"personal" | "studio">(() => defaultTab ?? "personal");
  const prevDate = new Date(data.selectedMonth.year, data.selectedMonth.monthIndex - 1, 1);
  const nextDate = new Date(data.selectedMonth.year, data.selectedMonth.monthIndex + 1, 1);
  const prevMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
  const nextMonthKey = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}`;
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

  const [reviewingRequests, setReviewingRequests] = useState<Record<string, boolean>>({});
  const [reviewingCorrections, setReviewingCorrections] = useState<Record<string, boolean>>({});

  const monthName = data.monthLabel.split(" ")[0];

  const personalMetrics = [
    {
      label: `Attendance ${monthName}`,
      value: data.personalSummary.total,
      icon: ClipboardCheck,
      color: "text-blue-700 dark:text-blue-400",
    },
    {
      label: `Sick Days ${monthName}`,
      value: data.personalSummary.sick,
      icon: HeartPulse,
      color: "text-violet-700 dark:text-violet-400",
    },
    {
      label: `Late Days ${monthName}`,
      value: data.personalSummary.late,
      icon: Clock3,
      color: "text-orange-700 dark:text-orange-400",
    },
    {
      label: `Alpha Days ${monthName}`,
      value: data.personalSummary.alpha,
      icon: AlertTriangle,
      color: "text-red-700 dark:text-red-400",
    },
    {
      label: `WFH ${monthName}`,
      value: data.personalSummary.wfh,
      icon: Home,
      color: "text-sky-700 dark:text-sky-400",
    },
    {
      label: "Workday Balance",
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
      label: `Team Attendance ${monthName}`,
      value: data.summary.total,
      icon: ClipboardCheck,
      color: "text-blue-700 dark:text-blue-400",
    },
    {
      label: `Team Sick Days ${monthName}`,
      value: data.summary.sick,
      icon: HeartPulse,
      color: "text-violet-700 dark:text-violet-400",
    },
    {
      label: `Team Late Days ${monthName}`,
      value: data.summary.late,
      icon: Clock3,
      color: "text-orange-700 dark:text-orange-400",
    },
    {
      label: `Team Alpha Days ${monthName}`,
      value: data.summary.alpha,
      icon: AlertTriangle,
      color: "text-red-700 dark:text-red-400",
    },
    {
      label: `Team WFH ${monthName}`,
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
        setBroadcastErr(getErrorMessage(err, "Failed to broadcast announcement."));
      }
    });
  }

  function handleQuickReviewRequest(requestId: string, approve: boolean) {
    setReviewingRequests((prev) => ({ ...prev, [requestId]: true }));
    startTransition(async () => {
      try {
        await quickReviewRequestAction(requestId, approve);
      } catch (err: unknown) {
        alert(getErrorMessage(err, "Failed to process request."));
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
        alert(getErrorMessage(err, "Failed to process correction."));
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
          My Activity
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
          Studio Management
        </button>
      </div>

      {/* ───── TAB 1: PERSONAL WORKSPACE (AKTIVITAS SAYA) ───── */}
      {activeTab === "personal" && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          <ActiveAnnouncementsClient announcements={data.activeAnnouncements} />

          {data.qrCredential ? (
            <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 shadow-sm animate-in fade-in duration-200 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-center gap-3 text-sm text-zinc-650 dark:text-zinc-400">
                <div className="flex size-9 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
                  <QrCode className="size-4 text-zinc-500" />
                </div>
                <div>
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100">Your active QR Card is ready.</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Use this card for your personal WFO attendance.</p>
                </div>
              </div>
              <Link
                href="/member/qr-card"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "h-8 text-xs flex items-center gap-1.5 cursor-pointer font-sans"
                )}
              >
                <QrCode className="size-3.5" />
                View My Card
              </Link>
            </div>
          ) : (
            <Card className="shadow-none border-dashed border-2 border-zinc-200 dark:border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-zinc-900 dark:text-zinc-50 text-base">
                  <QrCode className="size-5 text-zinc-750 dark:text-zinc-400 animate-pulse" />
                  Setup Your QR Card
                </CardTitle>
                <CardDescription className="text-zinc-550 dark:text-zinc-450 text-xs">
                  Activate your QR Card once to check in at the studio.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <form action={createPersonalQrCredentialAction}>
                  <Button type="submit" size="sm" className="w-full sm:w-auto bg-zinc-950 text-white hover:bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 font-semibold cursor-pointer">
                    <ShieldCheck className="mr-1.5 size-4" />
                    Activate QR Card
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Metrics */}
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {personalMetrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <HoverCard key={metric.label}>
                  <HoverCardTrigger
                    render={
                      <Card className="shadow-none h-full flex flex-col justify-between cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm">
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
                    }
                  />
                  <HoverCardContent side="top" align="center" className="w-auto px-3 py-1.5 text-xs">
                    <span className="font-semibold">{metric.label}:</span> <span className={cn("font-bold", metric.color)}>{metric.value}</span>
                  </HoverCardContent>
                </HoverCard>
              );
            })}
          </section>

          {/* Main Layout Grid */}
          <div className="grid items-start gap-6 lg:grid-cols-[1fr_2fr]">
            <div className="space-y-6">
              {/* Today's Record */}
              <Card className="shadow-none flex flex-col">
                <div>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-zinc-900 dark:text-zinc-50">
                      <div className="flex items-center gap-2">
                        <Clock3 className="size-5 text-blue-700 dark:text-blue-400" />
                        <span>My Attendance Today</span>
                      </div>
                      <Dialog>
                        <DialogTrigger
                          type="button"
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer shrink-0 shadow-none"
                        >
                          <span>Rules & Info</span>
                          <ChevronRight className="size-3.5 text-zinc-500" />
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
                          <DialogHeader>
                            <DialogTitle>Peraturan Jam Masuk & Pulang WFO</DialogTitle>
                            <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400">
                              Ketentuan presensi fisik (Work From Office):
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-3 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                            <div>
                              <h4 className="font-bold text-zinc-900 dark:text-zinc-200">1. Batas Terlambat</h4>
                              <p className="mt-0.5">Jam masuk reguler adalah <b>08:00 WIB</b> dengan toleransi keterlambatan <b>10 menit</b> (08:10 WIB). Check-in setelah itu akan terhitung Late.</p>
                            </div>
                            <div>
                              <h4 className="font-bold text-zinc-900 dark:text-zinc-200">2. Waktu Check-out Early</h4>
                              <p className="mt-0.5">Jam pulang standar adalah <b>16:00 WIB</b>. Melakukan Check-out sebelum jam pulang akan mencatat menit early checkout.</p>
                            </div>
                            <div>
                              <h4 className="font-bold text-zinc-900 dark:text-zinc-200">3. WFO Journal Wajib</h4>
                              <p className="mt-0.5">WFO Journal wajib diisi dan disimpan sebelum Anda melakukan Check-out di sore hari.</p>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </CardTitle>
                    <CardDescription className="text-zinc-500 dark:text-zinc-400">
                      {formatFullDate(new Date())}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3 grid-cols-3">
                    <div className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/10 p-2.5 shadow-sm">
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">Check-in</p>
                      <p className="mt-1 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                        {formatTime(data.todayRecord?.checkInAt ?? null)}
                      </p>
                    </div>
                    <div className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/10 p-2.5 shadow-sm">
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">Check-out</p>
                      <p className="mt-1 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                        {formatTime(data.todayRecord?.checkOutAt ?? null)}
                      </p>
                    </div>
                    <div className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/10 p-2.5 shadow-sm">
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">Status</p>
                      <div className="mt-1">
                        {data.todayRecord ? (
                          <Badge
                            className={cn("text-[10px] font-semibold px-1.5 py-0 border shadow-none", statusColor[data.todayRecord.status])}
                          >
                            {statusLabel[data.todayRecord.status] ?? data.todayRecord.status}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 text-[10px] px-1.5 py-0 shadow-none">
                            Absent
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>

                  {isWfhMode && (
                    <CardContent className="border-t border-zinc-100 dark:border-zinc-800 pt-3 mt-3">
                      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 bg-zinc-50/50 dark:bg-zinc-900/10">
                        <h3 className="text-xs font-semibold mb-2 text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5">
                          <Home className="size-3.5 text-emerald-600" />
                          WFH Attendance
                        </h3>
                        <WfhForm
                          hasCheckedIn={!!data.todayRecord?.checkInAt}
                          hasCheckedOut={!!data.todayRecord?.checkOutAt}
                          checkInPlan={data.todayRecord?.wfhPlan}
                        />
                      </div>
                    </CardContent>
                  )}

                  {!isWfhMode && data.todayRecord?.checkInAt && (
                    <CardContent className="border-t border-zinc-100 dark:border-zinc-800 pt-3 mt-3">
                      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 bg-zinc-50/50 dark:bg-zinc-900/10">
                        <h3 className="text-xs font-semibold mb-2 text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5 font-sans">
                          <ClipboardCheck className="size-3.5 text-emerald-600" />
                          Today&apos;s WFO Journal
                        </h3>
                        <WfoJournalForm
                          initialJournal={data.todayRecord.wfhReport}
                          hasCheckedIn={!!data.todayRecord?.checkInAt}
                          hasCheckedOut={!!data.todayRecord?.checkOutAt}
                        />
                      </div>
                    </CardContent>
                  )}
                </div>

                <CardContent className="mt-auto pt-3 border-t border-zinc-150 dark:border-zinc-850 flex flex-wrap gap-2 justify-between">
                  <Link
                    href="/member/presensi/riwayat"
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "flex items-center gap-1 text-xs")}
                  >
                    <History className="size-3.5" />
                    History
                  </Link>
                  
                  {!isWfhMode && (!data.todayRecord || !data.todayRecord.checkOutAt) && (
                    (data.todayRecord?.checkInAt && !data.todayRecord?.wfhReport?.trim()) ? (
                      <span
                        aria-disabled="true"
                        title="Please fill and save your Today's WFO Journal before checking out."
                        className={cn(
                          buttonVariants({ variant: "default", size: "sm" }),
                          "flex cursor-not-allowed items-center gap-1 text-xs bg-amber-100 dark:bg-amber-950/40 text-amber-850 dark:text-amber-300 border border-amber-200 dark:border-amber-900"
                        )}
                      >
                        <FileText className="size-3.5 text-amber-600" />
                        Fill WFO Journal First
                      </span>
                    ) : isCheckoutLocked ? (
                      <span
                        aria-disabled="true"
                        title={`Check-out opens at ${checkoutAvailableTime}`}
                        className={cn(
                          buttonVariants({ variant: "default", size: "sm" }),
                          "flex cursor-not-allowed items-center gap-1 text-xs bg-zinc-200 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
                        )}
                      >
                        <Camera className="size-3.5" />
                        Locked {checkoutAvailableTime}
                      </span>
                    ) : (
                      <Link
                        href={data.todayRecord?.checkInAt ? "/login?action=checkout" : "/member/presensi"}
                        className={cn(
                          buttonVariants({ variant: "default", size: "sm" }),
                          "flex items-center gap-1 text-xs bg-zinc-950 dark:bg-zinc-100 hover:bg-zinc-900 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 cursor-pointer"
                        )}
                      >
                        <Camera className="size-3.5" />
                        {data.todayRecord?.checkInAt ? "Scan Out" : "Scan In"}
                      </Link>
                    )
                  )}
                </CardContent>
              </Card>

            </div>

            {/* Work Calendar */}
            <Card className="shadow-none border border-zinc-200 dark:border-zinc-800">
              <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-150 dark:border-zinc-800 pb-3">
                <div>
                  <CardTitle className="text-zinc-900 dark:text-zinc-50 text-base">My Work Calendar</CardTitle>
                  <CardDescription className="text-zinc-550 dark:text-zinc-455 text-xs">
                    Your personal work mode calendar for this month.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1">
                  <Link
                    href={`/admin?month=${prevMonthKey}`}
                    className={cn(buttonVariants({ variant: "outline", size: "icon" }), "h-8 w-8 cursor-pointer")}
                    title="Previous Month"
                  >
                    <ChevronLeft className="size-4" />
                  </Link>
                  <span className="text-xs font-bold min-w-[110px] text-center select-none text-zinc-850 dark:text-zinc-200">
                    {formatMonthLabel(data.selectedMonth.year, data.selectedMonth.monthIndex)}
                  </span>
                  <Link
                    href={`/admin?month=${nextMonthKey}`}
                    className={cn(buttonVariants({ variant: "outline", size: "icon" }), "h-8 w-8 cursor-pointer")}
                    title="Next Month"
                  >
                    <ChevronRight className="size-4" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-7 border border-zinc-250 dark:border-zinc-800 rounded overflow-hidden">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                    <div key={d} className="bg-zinc-50 dark:bg-zinc-900/50 py-1.5 text-center text-[10px] font-bold text-zinc-650 border-b border-zinc-200 dark:border-zinc-800">
                      {d}
                    </div>
                  ))}
                  {Array.from({ length: leadingBlankDays }, (_, idx) => (
                    <div key={`blank-${idx}`} className="bg-zinc-50/50 dark:bg-zinc-900/10 border-b border-r border-zinc-150 dark:border-zinc-800 min-h-12" />
                  ))}
                  {days.map((day) => {
                    const schedule = scheduleByDateMap[day.dateKey];
                    const attendanceRecord = attendanceByDateMap[day.dateKey];
                    const isToday = day.dateKey === todayKey;
                    const dayHolidays = adminHolidaysMap.get(day.dateKey) ?? [];
                    const isSundayOrMonday = day.date.getDay() === 0 || day.date.getDay() === 1;

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
                          "min-h-16 p-1 bg-white dark:bg-zinc-950 flex flex-col justify-between transition-colors border-b border-r border-zinc-150 dark:border-zinc-800",
                          isToday && "bg-zinc-50 dark:bg-zinc-900/50"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={cn(
                              "inline-flex size-5 items-center justify-center rounded-full text-[10px] font-semibold",
                              isToday
                                ? "bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950"
                                : "text-zinc-500 dark:text-zinc-400"
                            )}
                          >
                            {day.dayNumber}
                          </span>
                          <div className="flex items-center gap-1 flex-wrap justify-end">
                            {isRealHoliday ? (
                              <span className="rounded px-1 py-0.5 text-[8px] font-semibold border bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-300 border-red-200 dark:border-red-900">
                                Holiday
                              </span>
                            ) : attendanceRecord ? (
                              <div className="flex flex-col items-end gap-0.5">
                                <span className={cn("rounded px-1 py-0.5 text-[8px] font-semibold border uppercase", statusColor[attendanceRecord.status] || "bg-zinc-100 text-zinc-700 border-zinc-200")}>
                                  {attendanceRecord.status === "PRESENT" ? "Present" : attendanceRecord.status}
                                </span>
                                {attendanceRecord.isManualCorrection && (
                                  <span className="text-[7px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 px-1 py-0.2 rounded border border-blue-100 dark:border-blue-900/50">
                                    Corrected
                                  </span>
                                )}
                              </div>
                            ) : schedule ? (
                              <span className={cn(
                                "rounded px-1 py-0.5 text-[8px] font-medium border",
                                schedule.workMode === "WFH"
                                  ? "bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-900"
                                  : "bg-zinc-100 dark:bg-zinc-900 text-zinc-655 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800"
                              )}>
                                {schedule.workMode}
                              </span>
                            ) : isSundayOrMonday ? null : (
                              <span className="rounded px-1 py-0.5 text-[8px] font-medium border bg-zinc-100 dark:bg-zinc-900 text-zinc-655 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800">
                                WFO
                              </span>
                            )}
                          </div>
                        </div>

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
                                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-650 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700"
                              )}
                              title={h.title}
                            >
                              {h.title}
                            </div>
                          ))}

                          {isRealHoliday ? (
                            <div className="text-[8px] font-bold px-1 py-0.5 rounded border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-center select-none font-semibold">
                              Holiday
                            </div>
                          ) : attendanceRecord ? (
                            <p className="truncate text-[8px] text-zinc-500 font-medium italic">
                              Mode: {attendanceRecord.workMode}
                            </p>
                          ) : schedule?.note ? (
                            <p className="truncate text-[8px] text-zinc-400 font-medium" title={schedule.note}>
                              {schedule.note}
                            </p>
                          ) : hasReplacement ? (
                            <p className="truncate text-[8px] text-zinc-500 font-semibold" title="Replacement Workday">
                              Replacement (WFO)
                            </p>
                          ) : isSundayOrMonday ? null : (
                            <p className="truncate text-[8px] text-zinc-300 dark:text-zinc-600 font-medium">
                              Default WFO
                            </p>
                          )}
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
                <HoverCard key={metric.label}>
                  <HoverCardTrigger
                    render={
                      <Card className="shadow-none h-full flex flex-col justify-between cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm">
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
                    }
                  />
                  <HoverCardContent side="top" align="center" className="w-auto px-3 py-1.5 text-xs">
                    <span className="font-semibold">{metric.label}:</span> <span className={cn("font-bold", metric.color)}>{metric.value}</span>
                  </HoverCardContent>
                </HoverCard>
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
                  Quick Approvals
                </CardTitle>
                <CardDescription className="text-xs text-zinc-500">
                  Quickly review member requests and attendance corrections for your studio.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {/* 1. Requests (Sakit, Cuti, Izin) */}
                {data.pendingRequestList && data.pendingRequestList.length > 0 && (
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Requests and Sick Leave</h4>
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
                                Date: {new Date(req.startDate).toLocaleDateString("id-ID", { day: "numeric", month: "short" })} - {new Date(req.endDate).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
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
                                Reject
                              </Button>
                              <Button
                                size="sm"
                                variant="default"
                                className="h-7 text-[10px] bg-emerald-600 text-white hover:bg-emerald-700 border-0"
                                onClick={() => handleQuickReviewRequest(req.id, true)}
                                disabled={isPending || isReviewing}
                              >
                                {isReviewing ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3 mr-1" />}
                                Approve
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
                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Attendance Corrections</h4>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {data.pendingCorrectionList.map((corr) => {
                        const isReviewing = reviewingCorrections[corr.id] || false;
                        return (
                          <div key={corr.id} className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 bg-zinc-50/50 dark:bg-zinc-900/10 flex flex-col justify-between gap-3 text-xs">
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-semibold text-zinc-800 dark:text-zinc-200">{corr.requestedBy.name}</span>
                                <Badge variant="outline" className="text-[10px] border-amber-300 bg-amber-50 text-amber-800 font-semibold">Correction: {corr.newStatus}</Badge>
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
                                Reject
                              </Button>
                              <Button
                                size="sm"
                                variant="default"
                                className="h-7 text-[10px] bg-emerald-600 text-white hover:bg-emerald-700 border-0"
                                onClick={() => handleQuickReviewCorrection(corr.id, true)}
                                disabled={isPending || isReviewing}
                              >
                                {isReviewing ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3 mr-1" />}
                                Approve
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
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">All Clear!</p>
              <p className="text-xs text-zinc-500 mt-0.5">No requests or attendance corrections are waiting for approval.</p>
            </div>
          )}

          {/* Picket Duty Info & Broadcast Announcement */}
          <div className="grid gap-6 md:grid-cols-3">
            {/* Picket Duty Info */}
            <Card className="md:col-span-2 shadow-none">
              <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-zinc-900 dark:text-zinc-50">
                  <Brush className="size-4 text-blue-700 dark:text-blue-400" />
                  Today&apos;s Picket Duty
                </CardTitle>
                <CardDescription className="text-zinc-500 dark:text-zinc-400">
                  Daily studio clean-up and order responsibility.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {data.picketToday.length === 0 ? (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    There are no picket duty officers assigned for today.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {data.picketToday.map((p) => (
                      <div key={p.id} className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/10 text-xs">
                        <div className="flex items-center justify-between font-semibold">
                          <span className="text-sm text-zinc-900 dark:text-zinc-100">{p.user.name}</span>
                          <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-650 dark:text-zinc-400 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">
                            Studio: {p.studio?.name ?? "N/A"}
                          </span>
                        </div>
                        {p.note ? (
                          <div className="mt-2 text-zinc-600 dark:text-zinc-400 italic bg-zinc-100/50 dark:bg-zinc-950/20 p-2 rounded border border-zinc-200/50 dark:border-zinc-800/50">
                            Note: &ldquo;{p.note}&rdquo;
                          </div>
                        ) : (
                          <p className="mt-1 text-[10px] text-zinc-400">No special instructions provided.</p>
                        )}
                      </div>
                    ))}
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
                    Broadcast Announcement
                  </CardTitle>
                  <CardDescription className="text-xs text-zinc-500">
                    Send a quick message to every member dashboard in your studio.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    placeholder="Write a studio announcement..."
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
                  Broadcast Message
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Recent Attendance (Tabel Presensi Tim) */}
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                <Users className="size-5 text-blue-700 dark:text-blue-400" />
                Today&apos;s Team Attendance
              </CardTitle>
              <CardDescription className="text-zinc-500 dark:text-zinc-400">
                Attendance list for studio staff {data.studio?.name ?? ""} today.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Attendance Location</TableHead>
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
                        No staff attendance data for today.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.recentAttendance.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          <div>{item.user.name}</div>
                          <div className="text-xs font-normal text-zinc-500">{item.user.email}</div>
                        </TableCell>
                        <TableCell>{item.locationStudio?.name ?? "No location required"}</TableCell>
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

