import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  HeartPulse,
  Home,
  ShieldMinus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DashboardShell } from "@/components/dashboard-shell";
import {
  formatMonthLabel,
  getMonthRange,
  normalizeReportMonth,
  summarizeAttendanceStatuses,
} from "@/lib/attendance-report";
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
} from "@/lib/calendar";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  PRESENT: "Hadir",
  ON_TIME: "Tepat Waktu",
  LATE: "Terlambat",
  WFH: "WFH",
  PERMISSION: "Izin",
  SICK: "Sakit",
  LEAVE: "Cuti",
  ALPHA: "Alpha",
  HOLIDAY: "Libur",
  OFF_DAY: "Libur",
};

const statusColor: Record<string, string> = {
  PRESENT: "bg-emerald-100 text-emerald-800",
  ON_TIME: "bg-emerald-100 text-emerald-800",
  LATE: "bg-orange-100 text-orange-800",
  WFH: "bg-blue-100 text-blue-800",
  PERMISSION: "bg-amber-100 text-amber-800",
  SICK: "bg-violet-100 text-violet-800",
  LEAVE: "bg-sky-100 text-sky-800",
  ALPHA: "bg-red-100 text-red-800",
  HOLIDAY: "bg-zinc-200 text-zinc-700",
  OFF_DAY: "bg-zinc-200 text-zinc-700",
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

async function getAdminDashboardData(userId: string, defaultStudioId: string | null, selectedMonthKey?: string) {
  const reportMonth = normalizeReportMonth();
  const { start, endExclusive } = getMonthRange(reportMonth);
  const studioFilter = defaultStudioId ? { ownerStudioId: defaultStudioId } : {};
  const userFilter = defaultStudioId ? { defaultStudioId } : {};

  const month = parseMonthKey(selectedMonthKey);
  const monthStart = dateOnly(new Date(month.year, month.monthIndex, 1));
  const monthEnd = dateOnly(new Date(month.year, month.monthIndex + 1, 0));

  const [
    studio,
    activeMembers,
    groups,
    pendingRequests,
    recentAttendance,
    personalSchedules,
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
    prisma.request.count({
      where: {
        status: "PENDING",
        user: userFilter,
      },
    }),
    prisma.attendanceRecord.findMany({
      take: 8,
      where: studioFilter,
      orderBy: [{ attendanceDate: "desc" }, { createdAt: "desc" }],
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
  ]);

  return {
    studio,
    activeMembers,
    summary: summarizeAttendanceStatuses(groups),
    pendingRequests,
    recentAttendance,
    personalSchedules,
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
  const todayKey = formatDateKey(dateOnly());

  const metrics = [
    {
      label: `Jumlah Presensi ${data.monthLabel}`,
      value: data.summary.total,
      icon: ClipboardCheck,
      color: "text-blue-700",
    },
    {
      label: `Izin ${data.monthLabel}`,
      value: data.summary.permission,
      icon: ShieldMinus,
      color: "text-amber-700",
    },
    {
      label: `Sakit ${data.monthLabel}`,
      value: data.summary.sick,
      icon: HeartPulse,
      color: "text-violet-700",
    },
    {
      label: `Terlambat ${data.monthLabel}`,
      value: data.summary.late,
      icon: Clock3,
      color: "text-orange-700",
    },
    {
      label: `Tepat Waktu ${data.monthLabel}`,
      value: data.summary.onTime,
      icon: CheckCircle2,
      color: "text-emerald-700",
    },
    {
      label: `Alpha ${data.monthLabel}`,
      value: data.summary.alpha,
      icon: AlertTriangle,
      color: "text-red-700",
    },
    {
      label: `WFH ${data.monthLabel}`,
      value: data.summary.wfh,
      icon: Home,
      color: "text-sky-700",
    },
  ];

  return (
    <DashboardShell
      user={currentUser}
      currentPath="/admin"
      badge="Welcome, Admin"
      title="Dashboard Admin"
      description={`${data.activeMembers} user aktif dan ${data.pendingRequests} request pending. Scope laporan dikunci ke ${data.studio?.name ?? "studio Admin"}.`}
    >
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {metrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <Card key={metric.label}>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Icon className={`size-4 ${metric.color}`} />
                  {metric.label}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className={`text-3xl font-semibold ${metric.color}`}>
                  {metric.value.toLocaleString("id-ID")}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <CardHeader>
            <CardTitle>Presensi Tim Terbaru</CardTitle>
            <CardDescription>
              Catatan terbaru dari PostgreSQL untuk seluruh user aktif dalam
              scope studio Admin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Default Studio</TableHead>
                  <TableHead>Lokasi</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentAttendance.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-24 text-center text-sm text-zinc-500"
                    >
                      Belum ada data presensi.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.recentAttendance.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        <div>{item.user.name}</div>
                        <div className="text-xs text-zinc-500">
                          {item.user.email}
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(item.attendanceDate)}</TableCell>
                      <TableCell>{item.ownerStudio.name}</TableCell>
                      <TableCell>
                        {item.locationStudio?.name ?? "Tidak perlu lokasi"}
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

        <Card id="kalender-kerja">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Kalender Kerja Saya</CardTitle>
              <CardDescription>
                Mode kerja Anda bulan {formatCalendarMonth(data.selectedMonth.year, data.selectedMonth.monthIndex)}.
              </CardDescription>
            </div>
            <form className="flex items-center gap-2">
              <Input
                id="month"
                name="month"
                type="month"
                defaultValue={data.selectedMonth.monthKey}
                className="h-8 w-36 text-sm"
              />
              <Button type="submit" size="sm">
                Filter
              </Button>
            </form>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 overflow-hidden rounded-md border border-zinc-200 bg-white">
              {dayLabels.map((label) => (
                <div
                  key={label}
                  className="border-b border-zinc-200 bg-zinc-50 py-2 text-center text-xs font-medium text-zinc-600"
                >
                  {label}
                </div>
              ))}
              {Array.from({ length: leadingBlankDays }, (_, index) => (
                <div
                  key={`blank-${index}`}
                  className="min-h-12 border-b border-r border-zinc-100 bg-zinc-50"
                />
              ))}
              {days.map((day) => {
                const schedule = scheduleByDate.get(day.dateKey);
                const isWfh = schedule?.workMode === "WFH";
                const isToday = day.dateKey === todayKey;

                return (
                  <div
                    key={day.dateKey}
                    className={cn(
                      "min-h-12 border-b border-r border-zinc-100 p-1 flex flex-col justify-between",
                      isToday && "bg-zinc-50"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "text-xs font-semibold",
                          isToday
                            ? "flex size-5 items-center justify-center rounded-full bg-zinc-950 text-[10px] text-white"
                            : "text-zinc-700"
                        )}
                      >
                        {day.dayNumber}
                      </span>
                      <span
                        className={cn(
                          "rounded px-1 py-0.5 text-[8px] font-medium",
                          isWfh
                            ? "bg-blue-100 text-blue-800"
                            : "bg-zinc-100 text-zinc-600"
                        )}
                      >
                        {isWfh ? "WFH" : "WFO"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
