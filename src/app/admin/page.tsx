import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/dashboard-shell";
import { AdminDashboardClient } from "./admin-dashboard-client";
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
import {
  dateOnly,
  formatDateKey,
  getCalendarDays,
  parseMonthKey,
  getIndonesianHolidays,
} from "@/lib/calendar";

export const dynamic = "force-dynamic";

async function getAdminDashboardData(userId: string, defaultStudioId: string | null, selectedMonthKey?: string) {
  const reportMonth = normalizeReportMonth(selectedMonthKey);
  const { start, endExclusive } = getMonthRange(reportMonth);
  const studioFilter = defaultStudioId ? { ownerStudioId: defaultStudioId } : {};
  const userFilter = defaultStudioId ? { defaultStudioId } : {};

  const month = parseMonthKey(selectedMonthKey);
  const monthStart = dateOnly(new Date(month.year, month.monthIndex, 1));
  const monthEnd = dateOnly(new Date(month.year, month.monthIndex + 1, 0));

  const todayKey = getJakartaDateKey();
  const todayDate = dateOnlyFromKey(todayKey);

  // Last 7 days for daily trend chart
  const trendStart = new Date();
  trendStart.setDate(trendStart.getDate() - 6);
  trendStart.setHours(0, 0, 0, 0);

  const [
    studio,
    activeMembers,
    personalBalance,
    groups,
    personalGroups,
    pendingRequests,
    recentAttendance,
    picketToday,
    personalSchedules,
    qrCredential,
    todayRecord,
    todaySchedule,
    rawDailyTrend,
    pendingRequestList,
    pendingCorrectionList,
    studioMembers,
    calendarEvents,
    apiHolidays,
    attendancePolicy,
    monthlyAttendance,
    activeAnnouncements,
  ] = await Promise.all([
    prisma.studio.findUnique({
      where: { id: defaultStudioId ?? "__none__" },
      select: { name: true, address: true },
    }),
    prisma.user.count({
      where: {
        ...userFilter,
        accountStatus: "ACTIVE",
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { workDayBalance: true },
    }),
    prisma.attendanceRecord.groupBy({
      by: ["status"],
      where: {
        ...studioFilter,
        attendanceDate: { gte: start, lt: endExclusive },
      },
      _count: { _all: true },
    }),
    prisma.attendanceRecord.groupBy({
      by: ["status"],
      where: {
        userId,
        attendanceDate: { gte: start, lt: endExclusive },
      },
      _count: { _all: true },
    }),
    prisma.request.count({
      where: {
        status: "PENDING",
        user: userFilter,
      },
    }),
    prisma.attendanceRecord.findMany({
      where: {
        ...studioFilter,
        attendanceDate: todayDate,
      },
      orderBy: [{ checkInAt: "desc" }, { createdAt: "desc" }],
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
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
    prisma.picketSchedule.findMany({
      where: {
        studioId: defaultStudioId ?? "__none__",
        picketDate: todayDate,
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
        studio: {
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
    prisma.attendanceRecord.groupBy({
      by: ["attendanceDate"],
      where: {
        ...studioFilter,
        attendanceDate: { gte: trendStart },
      },
      _count: { _all: true },
      orderBy: { attendanceDate: "asc" },
    }),
    prisma.request.findMany({
      where: {
        status: "PENDING",
        user: userFilter,
      },
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.attendanceCorrection.findMany({
      where: {
        status: "PENDING",
        attendanceRecord: {
          ownerStudioId: defaultStudioId ?? "__none__",
        },
      },
      include: {
        requestedBy: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.user.findMany({
      where: {
        ...userFilter,
        accountStatus: "ACTIVE",
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.calendarEvent.findMany({
      where: {
        startDate: { lte: monthEnd },
        endDate: { gte: monthStart },
        OR: [
          { studioId: null },
          { studioId: defaultStudioId ?? "__none__" },
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
    defaultStudioId
      ? prisma.attendancePolicy.findFirst({
          where: {
            studioId: defaultStudioId,
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
    prisma.announcement.findMany({
      where: {
        isActive: true,
        publishAt: { lte: new Date() },
        AND: [
          {
            OR: [
              { allStudios: true },
              { targetStudioId: defaultStudioId ?? "__none__" },
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
  ]);

  const dailyTrend: { dateLabel: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);

    const match = rawDailyTrend.find(
      (t) => t.attendanceDate.getTime() === d.getTime()
    );

    const dateLabel = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
    }).format(d);

    dailyTrend.push({
      dateLabel,
      count: match?._count._all ?? 0,
    });
  }

  const dailySignals = await getDailySignals({
    id: userId,
    role: "ADMIN",
    defaultStudioId,
  });

  return {
    studio,
    activeMembers,
    dailySignals,
    personalWorkDayBalance: personalBalance?.workDayBalance ?? 0,
    summary: summarizeAttendanceStatuses(groups),
    personalSummary: summarizeAttendanceStatuses(personalGroups),
    pendingRequests,
    recentAttendance,
    picketToday,
    personalSchedules,
    qrCredential,
    todayRecord,
    todaySchedule,
    dailyTrend,
    pendingRequestList,
    pendingCorrectionList,
    studioMembers,
    calendarEvents,
    apiHolidays,
    attendancePolicy,
    monthlyAttendance,
    activeAnnouncements,
    monthLabel: formatMonthLabel(reportMonth),
    selectedMonth: month,
  };
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; tab?: string }>;
}) {
  const [currentUser, params] = await Promise.all([
    requireRole("ADMIN"),
    searchParams,
  ]);

  const data = await getAdminDashboardData(currentUser.id, currentUser.defaultStudioId, params.month);
  const currentDate = new Date();
  const birthDate = currentUser.birthDate ? new Date(currentUser.birthDate) : null;
  const isBirthday = birthDate &&
    birthDate.getUTCDate() === currentDate.getDate() &&
    birthDate.getUTCMonth() === currentDate.getMonth();

  const { leadingBlankDays, days } = getCalendarDays(
    data.selectedMonth.year,
    data.selectedMonth.monthIndex
  );

  // Convert schedules array to record/map for client lookups
  const scheduleByDateMap: Record<string, { workMode: string; note: string | null }> = {};
  for (const sched of data.personalSchedules) {
    scheduleByDateMap[formatDateKey(sched.workDate)] = {
      workMode: sched.workMode,
      note: sched.note,
    };
  }

  // Convert attendance array to record/map for client lookups
  const attendanceByDateMap: Record<string, { status: string; isManualCorrection: boolean; workMode: string }> = {};
  for (const rec of data.monthlyAttendance) {
    attendanceByDateMap[formatDateKey(rec.attendanceDate)] = {
      status: rec.status,
      isManualCorrection: rec.isManualCorrection,
      workMode: rec.workMode,
    };
  }

  const todayKey = formatDateKey(dateOnly());
  const defaultTab = params.tab === "studio" ? "studio" : "personal";

  return (
    <DashboardShell
      user={currentUser}
      currentPath="/admin"
      badge="Welcome, Admin"
      title="Admin Dashboard"
      description={`Hello ${currentUser.name}. This page contains your personal attendance and studio operational modules.`}
    >
      {isBirthday && (
        <>
          <ConfettiTrigger preset="fireworks" />
          <div className="rounded-xl border border-pink-200 dark:border-pink-900 bg-pink-50 dark:bg-pink-950/20 p-5 text-sm text-pink-850 dark:text-pink-300 mb-6 flex items-center gap-4 shadow-sm">
            <span className="text-3xl">🎂</span>
            <div>
              <h3 className="font-bold text-base text-pink-900 dark:text-pink-400">Happy Birthday, {currentUser.name}! 🎉</h3>
              <p className="text-xs text-pink-700 dark:text-pink-400 mt-0.5">May your day be filled with joy and happiness. Thank you for your amazing contribution to the team!</p>
            </div>
          </div>
        </>
      )}

      <DailySignalsBanner signals={data.dailySignals} currentUserId={currentUser.id} />

      <AdminDashboardClient
        currentUser={currentUser}
        defaultTab={defaultTab}
        data={data}
        days={days}
        leadingBlankDays={leadingBlankDays}
        todayKey={todayKey}
        scheduleByDateMap={scheduleByDateMap}
        attendanceByDateMap={attendanceByDateMap}
      />
    </DashboardShell>
  );
}
