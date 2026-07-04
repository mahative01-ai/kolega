import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/dashboard-shell";
import { AdminDashboardClient } from "./admin-dashboard-client";
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
} from "@/lib/calendar";
import QRCode from "qrcode";

export const dynamic = "force-dynamic";

async function getAdminDashboardData(userId: string, defaultStudioId: string | null, selectedMonthKey?: string) {
  const reportMonth = normalizeReportMonth();
  const { start, endExclusive } = getMonthRange(reportMonth);
  const studioFilter = defaultStudioId ? { ownerStudioId: defaultStudioId } : {};
  const userFilter = defaultStudioId ? { defaultStudioId } : {};

  const month = parseMonthKey(selectedMonthKey);
  const monthStart = dateOnly(new Date(month.year, month.monthIndex, 1));
  const monthEnd = dateOnly(new Date(month.year, month.monthIndex + 1, 0));

  const todayKey = getJakartaDateKey();
  const todayDate = dateOnlyFromKey(todayKey);

  const [
    studio,
    activeMembers,
    groups,
    personalGroups,
    pendingRequests,
    recentAttendance,
    picketToday,
    personalSchedules,
    qrCredential,
    todayRecord,
  ] = await Promise.all([
    defaultStudioId
      ? prisma.studio.findUnique({
          where: { id: defaultStudioId },
          select: { name: true, address: true },
        })
      : null,
    prisma.user.count({
      where: {
        ...userFilter,
        accountStatus: "ACTIVE",
      },
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
      },
    }),
  ]);

  return {
    studio,
    activeMembers,
    summary: summarizeAttendanceStatuses(groups),
    personalSummary: summarizeAttendanceStatuses(personalGroups),
    pendingRequests,
    recentAttendance,
    picketToday,
    personalSchedules,
    qrCredential,
    todayRecord,
    monthLabel: formatMonthLabel(reportMonth),
    selectedMonth: month,
  };
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const [currentUser, params] = await Promise.all([
    requireRole("ADMIN"),
    searchParams,
  ]);

  const data = await getAdminDashboardData(currentUser.id, currentUser.defaultStudioId, params.month);

  const qrSvg = data.qrCredential
    ? await QRCode.toString(data.qrCredential.qrUid, {
        type: "svg",
        margin: 1,
        width: 180,
        errorCorrectionLevel: "M",
      })
    : null;

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

  const todayKey = formatDateKey(dateOnly());

  return (
    <DashboardShell
      user={currentUser}
      currentPath="/admin"
      badge="Welcome, Admin"
      title="Dashboard Admin"
      description={`Halo ${currentUser.name}. Halaman ini memuat presensi pribadi Anda serta modul operasional studio.`}
    >
      <AdminDashboardClient
        currentUser={currentUser}
        data={data}
        qrSvg={qrSvg}
        days={days}
        leadingBlankDays={leadingBlankDays}
        todayKey={todayKey}
        scheduleByDateMap={scheduleByDateMap}
      />
    </DashboardShell>
  );
}
