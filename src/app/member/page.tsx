import {
  Clock3,
  Home,
  QrCode,
  ShieldCheck,
  History,
  Camera,
  Brush,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  HeartPulse,
  CalendarDays,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { DashboardShell } from "@/components/dashboard-shell";
import { createPersonalQrCredentialAction } from "@/app/member/presensi/actions";
import { WfhForm } from "@/app/member/presensi/wfh-form";
import { WfoJournalForm } from "@/app/member/presensi/wfo-journal-form";
import { FileText, HelpCircle } from "lucide-react";
import { getHelpRules } from "@/lib/default-help-rules";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ActiveAnnouncementsClient } from "@/components/active-announcements-client";
import { ConfettiTrigger } from "@/components/confetti-trigger";
import { DailySignalsBanner } from "@/components/daily-signals-banner";
import { getDailySignals } from "@/lib/daily-signals";
import {
  formatMonthLabel,
  getMonthRange,
  normalizeReportMonth,
  summarizeAttendanceStatuses,
} from "@/lib/attendance-report";
import { getJakartaDateKey, dateOnlyFromKey } from "@/lib/attendance-time";
import { formatMinutesAsClock, getCheckoutEligibility } from "@/lib/checkout-policy";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import {
  dateOnly,
  dayLabels,
  formatDateKey,
  formatMonthLabel as formatCalendarMonth,
  getCalendarDays,
  parseMonthKey,
  getIndonesianHolidays,
} from "@/lib/calendar";
import { dedupeCalendarEvents, isApiHolidayCoveredByDbEvent } from "@/lib/calendar-events";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  PRESENT: "Present",
  ON_TIME: "On Time",
  LATE: "Late",
  WFH: "WFH",
  PERMISSION: "Permission",
  SICK: "Sick Leave",
  LEAVE: "Replacement Leave",
  ALPHA: "Absent",
  HOLIDAY: "Holiday",
  OFF_DAY: "Off Day",
};

const statusColor: Record<string, string> = {
  PRESENT: "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900",
  ON_TIME: "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900",
  LATE: "bg-orange-100 dark:bg-orange-950/50 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-900",
  WFH: "bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-900",
  PERMISSION: "bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900",
  SICK: "bg-violet-100 dark:bg-violet-950/50 text-violet-800 dark:text-violet-300 border-violet-200 dark:border-violet-900",
  LEAVE: "bg-sky-100 dark:bg-sky-950/50 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-900",
  ALPHA: "bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-300 border-red-200 dark:border-red-900",
  HOLIDAY: "bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700",
  OFF_DAY: "bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700",
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

async function getMemberDashboardData(userId: string, selectedMonthKey?: string) {
  const reportMonth = normalizeReportMonth(selectedMonthKey);
  const { start, endExclusive } = getMonthRange(reportMonth);

  const month = parseMonthKey(selectedMonthKey);
  const monthStart = dateOnly(new Date(month.year, month.monthIndex, 1));
  const monthEnd = dateOnly(new Date(month.year, month.monthIndex + 1, 0));

  const todayKey = getJakartaDateKey();
  const todayDate = dateOnlyFromKey(todayKey);

  const userObj = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, defaultStudioId: true, workDayBalance: true, picketDay: true, annualLeaveBalance: true, memberStatus: true, notes: true }
  });

  const dailySignals = userObj
    ? await getDailySignals({ id: userId, role: userObj.role, defaultStudioId: userObj.defaultStudioId })
    : { birthdays: [], moodSummary: { totalCheckedIn: 0, sharedMoodCount: 0, mostCommonMood: null }, events: [] };

  const [
    groups,
    recentAttendance,
    personalSchedules,
    qrCredential,
    todayRecord,
    todaySchedule,
    internProfile,
    lateMinutesSum,
    announcements,
    monthlyAttendance,
    picketCalendar,
    calendarEvents,
    apiHolidays,
    attendancePolicy,
  ] = await Promise.all([
    prisma.attendanceRecord.groupBy({
      by: ["status"],
      where: {
        userId,
        attendanceDate: { gte: start, lt: endExclusive },
      },
      _count: { _all: true },
    }),
    prisma.attendanceRecord.findMany({
      take: 8,
      where: { userId },
      orderBy: [{ attendanceDate: "desc" }, { createdAt: "desc" }],
      include: {
        ownerStudio: {
          select: {
            name: true,
          },
        },
        locationStudio: {
          select: {
            name: true,
          },
        },
      },
    }),
    prisma.personalWorkSchedule.findMany({
      where: {
        userId,
        workDate: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
      select: {
        workDate: true,
        workMode: true,
        note: true,
      },
    }),
    prisma.qrCredential.findFirst({
      where: {
        userId,
        status: "ACTIVE",
      },
      orderBy: {
        issuedAt: "desc",
      },
      select: {
        qrUid: true,
        issuedAt: true,
      },
    }),
    prisma.attendanceRecord.findUnique({
      where: {
        userId_attendanceDate: {
          userId,
          attendanceDate: todayDate,
        },
      },
      select: {
        checkInAt: true,
        checkOutAt: true,
        status: true,
        workMode: true,
        wfhPlan: true,
        wfhReport: true,
      },
    }),
    prisma.personalWorkSchedule.findUnique({
      where: {
        userId_workDate: {
          userId,
          workDate: todayDate,
        },
      },
      select: {
        workMode: true,
      },
    }),
    prisma.internProfile.findUnique({
      where: { userId },
      include: {
        mentor: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    }),
    prisma.attendanceRecord.aggregate({
      where: {
        userId,
        attendanceDate: { gte: start, lt: endExclusive },
      },
      _sum: {
        lateMinutes: true,
      },
    }),
    prisma.announcement.findMany({
      where: {
        isActive: true,
        publishAt: { lte: new Date() },
        AND: [
          {
            OR: [
              { allStudios: true },
              { targetStudioId: userObj?.defaultStudioId ?? "__none__" },
            ],
          },
          {
            OR: [
              { expiresAt: null },
              { expiresAt: { gte: new Date() } },
            ],
          },
        ],
      },
      orderBy: [
        { priority: "desc" },
        { eventDate: "asc" },
        { createdAt: "desc" },
      ],
    }),
    prisma.attendanceRecord.findMany({
      where: {
        userId,
        attendanceDate: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
      select: {
        attendanceDate: true,
        status: true,
        isManualCorrection: true,
        workMode: true,
      },
    }),
    prisma.picketSchedule.findMany({
      where: {
        userId,
        picketDate: { gte: monthStart, lte: monthEnd },
      },
      select: {
        picketDate: true,
        note: true,
      },
    }),
    prisma.calendarEvent.findMany({
      where: {
        startDate: { lte: monthEnd },
        endDate: { gte: monthStart },
        OR: [
          { studioId: null },
          { studioId: userObj?.defaultStudioId ?? "__none__" },
        ],
      },
      select: {
        id: true,
        title: true,
        type: true,
        startDate: true,
        endDate: true,
      },
    }),
    getIndonesianHolidays(month.year),
    userObj?.defaultStudioId
      ? prisma.attendancePolicy.findFirst({
          where: {
            studioId: userObj.defaultStudioId,
            isActive: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          select: {
            checkInTime: true,
            checkOutTime: true,
          },
        })
      : Promise.resolve(null),
  ]);

  return {
    summary: summarizeAttendanceStatuses(groups),
    recentAttendance,
    personalSchedules,
    qrCredential,
    todayRecord,
    todaySchedule,
    internProfile,
    lateMakeupMinutes: lateMinutesSum._sum.lateMinutes ?? 0,
    workDayBalance: userObj?.workDayBalance ?? 0,
    annualLeaveBalance: userObj?.annualLeaveBalance ?? 12,
    memberStatus: userObj?.memberStatus ?? "TEAM",
    picketDay: userObj?.picketDay ?? null,
    notes: userObj?.notes ?? null,
    announcements,
    monthlyAttendance,
    picketCalendar,
    calendarEvents,
    apiHolidays,
    attendancePolicy,
    monthLabel: formatMonthLabel(reportMonth),
    selectedMonth: month,
    dailySignals,
  };
}

export default async function MemberDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const [currentUser, params] = await Promise.all([
    requireRole("MEMBER"),
    searchParams,
  ]);

  const [data, helpRules] = await Promise.all([
    getMemberDashboardData(currentUser.id, params.month),
    getHelpRules(),
  ]);
  const currentDate = new Date();
  const birthDate = currentUser.birthDate ? new Date(currentUser.birthDate) : null;
  const isBirthday = birthDate &&
    birthDate.getUTCDate() === currentDate.getDate() &&
    birthDate.getUTCMonth() === currentDate.getMonth();
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
  const { leadingBlankDays, days } = getCalendarDays(
    data.selectedMonth.year,
    data.selectedMonth.monthIndex
  );

  const scheduleByDate = new Map(
    data.personalSchedules.map((schedule) => [
      formatDateKey(schedule.workDate),
      schedule,
    ])
  );
  const attendanceByDate = new Map(
    data.monthlyAttendance.map((rec) => [
      formatDateKey(rec.attendanceDate),
      rec,
    ])
  );
  const prevDate = new Date(data.selectedMonth.year, data.selectedMonth.monthIndex - 1, 1);
  const nextDate = new Date(data.selectedMonth.year, data.selectedMonth.monthIndex + 1, 1);
  const prevMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
  const nextMonthKey = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}`;

  const picketDaysSet = new Set(
    data.picketCalendar.map((p) => formatDateKey(p.picketDate))
  );
  const today = dateOnly();
  const todayKey = formatDateKey(today);
  const memberHolidaysMap = new Map<string, { title: string; type: string }[]>();

  const mappedApiHolidays = data.apiHolidays
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
    (hEv) => !isApiHolidayCoveredByDbEvent(hEv, data.calendarEvents)
  );

  const allCalendarEvents = dedupeCalendarEvents([...data.calendarEvents, ...filteredApiHolidays]);

  for (const ev of allCalendarEvents) {
    const start = ev.startDate.getTime();
    const end = ev.endDate.getTime();
    for (const day of days) {
      const [y, m, d] = day.dateKey.split("-").map(Number);
      const dayTs = Date.UTC(y, m - 1, d);
      if (dayTs >= start && dayTs <= end) {
        const existing = memberHolidaysMap.get(day.dateKey) ?? [];
        existing.push({ title: ev.title, type: ev.type });
        memberHolidaysMap.set(day.dateKey, existing);
      }
    }
  }

  function formatTime(date: Date | null) {
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

  const monthName = data.monthLabel.split(" ")[0];

  const metrics = [
    {
      label: `Attendance ${monthName}`,
      value: data.summary.total,
      icon: CheckCircle2,
      color: "text-blue-700 dark:text-blue-400",
    },
    {
      label: `WFH ${monthName}`,
      value: data.summary.wfh,
      icon: Home,
      color: "text-sky-700 dark:text-sky-400",
    },
    {
      label: `Sick Leave ${monthName}`,
      value: data.summary.sick,
      icon: HeartPulse,
      color: "text-violet-700 dark:text-violet-400",
    },
    {
      label: `Leave ${monthName}`,
      value: data.summary.leave,
      icon: Calendar,
      color: "text-emerald-700 dark:text-emerald-400",
    },
    {
      label: `Late ${monthName}`,
      value: data.summary.late,
      subValue: data.lateMakeupMinutes > 0 ? `Owed: ${data.lateMakeupMinutes} m` : "None",
      icon: Clock3,
      color: "text-orange-700 dark:text-orange-400",
    },
    {
      label: `Alpha ${monthName}`,
      value: data.summary.alpha,
      icon: AlertTriangle,
      color: "text-red-700 dark:text-red-400",
    },
    ...(data.memberStatus === "TEAM" ? [{
      label: "Annual Leave Balance",
      value: data.annualLeaveBalance,
      subValue: `${data.annualLeaveBalance} days remaining`,
      icon: CalendarDays,
      color: "text-blue-700 dark:text-blue-400",
    }] : []),
    {
      label: "Workday Balance",
      value: data.workDayBalance,
      subValue:
        data.workDayBalance < 0
          ? `Owed ${Math.abs(data.workDayBalance)} d`
          : data.workDayBalance > 0
            ? `Surplus ${data.workDayBalance} d`
            : "None",
      icon: ShieldCheck,
      color:
        data.workDayBalance < 0
          ? "text-red-700 dark:text-red-400"
          : data.workDayBalance > 0
            ? "text-emerald-700 dark:text-emerald-400"
            : "text-zinc-700 dark:text-zinc-300",
    },
  ];

  return (
    <DashboardShell
      user={currentUser}
      currentPath="/member"
      badge="Welcome, Member"
      title="Member Dashboard"
      description={`Hello ${currentUser.name}. This dashboard focuses on your personal attendance, schedule, QR card, and request submissions.`}
    >
      {isBirthday && (
        <>
          <ConfettiTrigger preset="fireworks" />
          <div className="rounded-xl border border-pink-200 dark:border-pink-900 bg-pink-50 dark:bg-pink-950/20 p-5 text-sm text-pink-850 dark:text-pink-300 mb-6 flex items-center gap-4 shadow-sm">
            <span className="text-3xl">🎂</span>
            <div>
              <h3 className="font-bold text-base text-pink-900 dark:text-pink-400">Happy Birthday, {currentUser.name}! 🎉</h3>
              <p className="text-xs text-pink-700 dark:text-pink-400 mt-0.5">Wishing you a wonderful day filled with happiness. Thank you for your amazing contributions to the team!</p>
            </div>
          </div>
        </>
      )}

      <DailySignalsBanner signals={data.dailySignals} currentUserId={currentUser.id} />

      <ActiveAnnouncementsClient announcements={data.announcements} />

      {/* Metrics Grid */}
      <section className={cn(
        "grid gap-3 sm:grid-cols-2 md:grid-cols-4 my-6 animate-in fade-in-50 duration-200",
        metrics.length === 7 ? "xl:grid-cols-7" : "xl:grid-cols-8"
      )}>
        {metrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <HoverCard key={metric.label}>
              <HoverCardTrigger
                render={
                  <Card className="shadow-none h-full flex flex-col justify-between cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm">
                    <CardHeader className="p-3.5 pb-1">
                      <CardDescription className="flex items-center gap-1.5 text-[11px] font-medium">
                        <Icon className={cn("size-4 shrink-0", metric.color)} />
                        <span className="truncate select-none">{metric.label}</span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-3.5 pt-0">
                      <p className={cn("text-2xl font-bold tracking-tight", metric.color)}>
                        {metric.value.toLocaleString("en-US")}
                      </p>
                      {metric.subValue && (
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate font-medium">
                          {metric.subValue}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                }
              />
              <HoverCardContent side="top" align="center" className="w-auto px-3 py-1.5 text-xs">
                <span className="font-semibold">{metric.label}:</span>{" "}
                <span className={cn("font-bold", metric.color)}>{metric.value}</span>
                {metric.subValue && ` (${metric.subValue})`}
              </HoverCardContent>
            </HoverCard>
          );
        })}
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_2fr] my-6">
        <div className="space-y-6">
          {/* Today's Attendance */}
          <Card className="shadow-none flex flex-col">
            <div>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-zinc-900 dark:text-zinc-50">
                  <Clock3 className="size-5 text-blue-700 dark:text-blue-400" />
                  <span>Today&apos;s Attendance</span>
                  <Dialog>
                    <DialogTrigger asChild>
                      <HelpCircle className="size-4 text-zinc-400 hover:text-zinc-600 cursor-pointer shrink-0" />
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
                      <DialogHeader>
                        <DialogTitle>WFO Check-in & Check-out Rules</DialogTitle>
                        <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400">
                          Regulations for physical presence (Work From Office):
                        </DialogDescription>
                      </DialogHeader>
                      {helpRules.rules_wfo ? (
                        <div
                          className="rules-rich-editor space-y-3 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400"
                          dangerouslySetInnerHTML={{ __html: helpRules.rules_wfo }}
                        />
                      ) : (
                        <div className="rules-rich-editor space-y-3 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                          <div>
                            <h4 className="font-bold text-zinc-900 dark:text-zinc-200">1. Late Limit</h4>
                            <p className="mt-0.5">Regular check-in is at <b>08:00 AM</b> with a grace period of <b>10 minutes</b> (08:10 AM). Checking in after this will be marked as Late.</p>
                          </div>
                          <div>
                            <h4 className="font-bold text-zinc-900 dark:text-zinc-200">2. Absent (Alpha) Threshold</h4>
                            <p className="mt-0.5">Employees who have not checked in by <b>12:00 PM (noon)</b> will automatically be marked as Absent (Alpha) for that day.</p>
                          </div>
                          <div>
                            <h4 className="font-bold text-zinc-900 dark:text-zinc-200">3. Early Check-out Lock</h4>
                            <p className="mt-0.5">The check-out button is locked until the minimum work duration (8 hours from check-in) is met to prevent premature checkout.</p>
                          </div>
                          <div className="rounded-lg bg-zinc-50 dark:bg-zinc-900/50 p-2.5 border border-zinc-100 dark:border-zinc-800/80">
                            <h4 className="font-bold text-orange-700 dark:text-orange-400">Personal Matters & Early Checkout</h4>
                            <p className="mt-0.5 text-zinc-600 dark:text-zinc-400">If you must leave early for urgent personal matters, you must compensate for the missing hours. The remaining minutes will be added to your time debt balance (Late Owed) to be replaced on another day.</p>
                          </div>
                        </div>
                      )}
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
                      rulesPlanContent={helpRules.rules_wfh_plan}
                      rulesReportContent={helpRules.rules_wfh_report}
                    />
                  </div>
                </CardContent>
              )}

              {!isWfhMode && data.todayRecord?.checkInAt && (
                <CardContent className="border-t border-zinc-100 dark:border-zinc-800 pt-3 mt-3">
                  <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 bg-zinc-50/50 dark:bg-zinc-900/10">
                    <h3 className="text-xs font-semibold mb-2 text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5 font-sans">
                      <FileText className="size-3.5 text-emerald-600" />
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
                    href={data.todayRecord?.checkInAt ? "/login?action=checkout" : "/login"}
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

          {data.notes && (
            <Card className="shadow-none border border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/10">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-zinc-50">
                  <FileText className="size-4 text-blue-600 dark:text-blue-450" />
                  Admin / Management Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-zinc-600 dark:text-zinc-400 whitespace-pre-line leading-relaxed pb-3">
                {data.notes}
              </CardContent>
            </Card>
          )}

        </div>

        {/* Work Calendar Card */}
        <Card id="kalender-kerja" className="shadow-none border border-zinc-200 dark:border-zinc-800">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-150 dark:border-zinc-800 pb-3">
            <div>
              <CardTitle className="text-zinc-900 dark:text-zinc-50 text-base">My Work Calendar</CardTitle>
              <CardDescription className="text-zinc-550 dark:text-zinc-450 text-xs">
                Work schedule and attendance status.
              </CardDescription>
            </div>
            <div className="flex items-center gap-1">
              <Link
                href={`/member?month=${prevMonthKey}`}
                className={cn(buttonVariants({ variant: "outline", size: "icon" }), "h-8 w-8 cursor-pointer")}
                title="Previous Month"
              >
                <ChevronLeft className="size-4" />
              </Link>
              <span className="text-xs font-bold min-w-[110px] text-center select-none text-zinc-850 dark:text-zinc-200">
                {formatCalendarMonth(data.selectedMonth.year, data.selectedMonth.monthIndex)}
              </span>
              <Link
                href={`/member?month=${nextMonthKey}`}
                className={cn(buttonVariants({ variant: "outline", size: "icon" }), "h-8 w-8 cursor-pointer")}
                title="Next Month"
              >
                <ChevronRight className="size-4" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-7 overflow-hidden rounded-md border border-zinc-250 dark:border-zinc-800 bg-white dark:bg-zinc-950">
              {dayLabels.map((label) => (
                <div
                  key={label}
                  className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 py-2 text-center text-xs font-semibold text-zinc-650 dark:text-zinc-400"
                >
                  {label}
                </div>
              ))}
              {Array.from({ length: leadingBlankDays }, (_, index) => (
                <div
                  key={`blank-${index}`}
                  className="min-h-16 border-b border-r border-zinc-150 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/10"
                />
              ))}
              {days.map((day) => {
                const schedule = scheduleByDate.get(day.dateKey);
                const attendanceRecord = attendanceByDate.get(day.dateKey);
                const isWfh = schedule?.workMode === "WFH";
                const isToday = day.dateKey === todayKey;
                const isPicket = picketDaysSet.has(day.dateKey);
                const dayHolidays = memberHolidaysMap.get(day.dateKey) ?? [];

                const hasHoliday = dayHolidays.some(h => 
                  h.type === "NATIONAL_HOLIDAY" || 
                  h.type === "COMPANY_LEAVE" || 
                  h.type === "REGULAR_OFF_DAY"
                );
                const hasReplacement = dayHolidays.some(h => h.type === "REPLACEMENT_WORKDAY");
                const isRealHoliday = hasHoliday && !hasReplacement;
                const isSundayOrMonday = day.date.getDay() === 0 || day.date.getDay() === 1;

                return (
                  <div
                    key={day.dateKey}
                    className={cn(
                      "min-h-16 border-b border-r border-zinc-150 dark:border-zinc-800 p-1 flex flex-col justify-between bg-white dark:bg-zinc-950",
                      isToday && "bg-zinc-50 dark:bg-zinc-900/50"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "text-xs font-semibold",
                          isToday
                            ? "flex size-5 items-center justify-center rounded-full bg-zinc-950 dark:bg-zinc-100 text-[10px] text-white dark:text-zinc-950"
                            : "text-zinc-700 dark:text-zinc-300"
                        )}
                      >
                        {day.dayNumber}
                      </span>
                      <div className="flex items-center gap-1 flex-wrap justify-end">
                        {isPicket && (
                          <span className="rounded bg-amber-100 dark:bg-amber-950/40 text-amber-850 dark:text-amber-300 border border-amber-200 dark:border-amber-900 px-1 py-0.5 text-[8px] font-bold">
                            🧹
                          </span>
                        )}
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
                        ) : isWfh ? (
                          <span className="rounded px-1 py-0.5 text-[8px] font-medium border bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-900">
                            WFH
                          </span>
                        ) : isSundayOrMonday ? null : (
                          <span className="rounded px-1 py-0.5 text-[8px] font-medium border bg-zinc-100 dark:bg-zinc-900 text-zinc-655 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800">
                            WFO
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-1 space-y-1">
                      {dayHolidays.map((h, hIdx) => (
                        <div
                          key={hIdx}
                          className={cn(
                            "rounded px-1.5 py-0.5 text-[8px] font-bold border truncate max-w-full select-none text-left leading-tight",
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
                        <p className="truncate text-[8px] text-zinc-400 font-medium">
                          Holiday
                        </p>
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

      <div className="mt-6 grid items-stretch gap-4 md:grid-cols-2">
        <Card className="shadow-none border border-zinc-200 dark:border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-zinc-900 dark:text-zinc-50">
              <Brush className="size-4 text-amber-600" />
              Picket Schedule
            </CardTitle>
            <CardDescription className="text-xs text-zinc-500">
              Today&apos;s cleaning duty information.
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-4 pt-1 text-sm">
            {data.picketDay && data.picketDay.trim() !== "" ? (
              <p className="text-zinc-750 dark:text-zinc-355">
                Your cleaning duty is on <span className="font-semibold text-amber-750 dark:text-amber-400">{data.picketDay}</span>.
              </p>
            ) : (
              <p className="text-zinc-500 dark:text-zinc-400">You are not assigned to picket duty today.</p>
            )}
          </CardContent>
        </Card>

        {data.qrCredential ? (
          <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 shadow-sm animate-in fade-in duration-200 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-405">
              <div className="flex size-9 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
                <QrCode className="size-4 text-zinc-500" />
              </div>
              <div>
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">Your active QR Card is ready.</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Use this card for WFO check-in and check-out.</p>
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
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[0.35fr_0.65fr] mt-6">
        {data.internProfile ? (
          <Card className="shadow-none flex flex-col justify-between">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                Internship Supervision
              </CardTitle>
              <CardDescription className="text-xs text-zinc-500">Mentor information and remaining internship period</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
              {/* Mentor Info */}
              <div className="rounded-md border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/10 p-3 flex flex-col gap-1">
                <p className="text-[10px] uppercase tracking-wider font-bold text-zinc-400">Supervisor / Mentor</p>
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  {data.internProfile.mentor?.name ?? "Not assigned yet"}
                </p>
                {data.internProfile.mentor?.email && (
                  <p className="text-xs text-zinc-500">{data.internProfile.mentor.email}</p>
                )}
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">Internship Period</span>
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                    {Math.max(0, Math.ceil((new Date(data.internProfile.endDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))} Days Left
                  </span>
                </div>
                {(() => {
                  const start = new Date(data.internProfile.startDate).getTime();
                  const end = new Date(data.internProfile.endDate).getTime();
                  const todayTime = today.getTime();
                  const totalDays = Math.max(1, end - start);
                  const passedDays = Math.max(0, todayTime - start);
                  const percent = Math.min(100, Math.round((passedDays / totalDays) * 100));

                  return (
                    <div className="space-y-1">
                      <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[9px] text-zinc-400">
                        <span>{new Date(data.internProfile.startDate).toLocaleDateString("en-US", { day: "numeric", month: "short" })}</span>
                        <span className="font-bold text-zinc-600 dark:text-zinc-400">{percent}% completed</span>
                        <span>{new Date(data.internProfile.endDate).toLocaleDateString("en-US", { day: "numeric", month: "short" })}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card className={cn("shadow-none", !data.internProfile && "lg:col-span-2")}>
          <CardHeader>
            <CardTitle className="text-zinc-900 dark:text-zinc-50">My Attendance History</CardTitle>
            <CardDescription className="text-zinc-500 dark:text-zinc-400">
              Recent records for the logged-in account.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Default Studio</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentAttendance.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="h-24 text-center text-sm text-zinc-500"
                    >
                      No attendance records yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.recentAttendance.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{formatDate(item.attendanceDate)}</TableCell>
                      <TableCell>{item.ownerStudio.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300">{item.workMode}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={statusColor[item.status]}
                        >
                          {statusLabel[item.status] ?? item.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
