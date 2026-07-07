import {
  AlertTriangle,
  ClipboardCheck,
  Clock3,
  HeartPulse,
  Home,
  ShieldAlert,
  ClipboardList,
  Building,
  Brush,
  ArrowRight
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DashboardShell } from "@/components/dashboard-shell";
import { RecentAttendanceTableClient } from "./recent-attendance-table-client";
import {
  formatMonthLabel,
  getMonthRange,
  normalizeReportMonth,
  summarizeAttendanceStatuses,
} from "@/lib/attendance-report";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getJakartaDateKey, dateOnlyFromKey } from "@/lib/attendance-time";
import { cn } from "@/lib/utils";
import { DashboardCharts } from "@/components/dashboard-charts";

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

type TrendPoint = {
  dateLabel: string;
  count: number;
};

async function getSuperAdminDashboardData(actor: { id: string; role: string; defaultStudioId: string | null }) {
  const month = normalizeReportMonth();
  const { start: monthStart, endExclusive: monthEnd } = getMonthRange(month);

  const todayKey = getJakartaDateKey();
  const todayDate = dateOnlyFromKey(todayKey);

  const isGlobalSuperAdmin = actor.role === "SUPER_ADMIN" && actor.defaultStudioId === null;

  // Last 7 days for daily trend chart
  const trendStart = new Date();
  trendStart.setDate(trendStart.getDate() - 6);
  trendStart.setHours(0, 0, 0, 0);

  const [
    studios,
    attendanceGroups,
    outsideRadiusThisMonth,
    pendingRequests,
    recentAttendance,
    picketToday,
    rawDailyTrend,
  ] = await Promise.all([
    prisma.studio.findMany({
      where: {
        isActive: true,
        ...(isGlobalSuperAdmin ? {} : { id: actor.defaultStudioId ?? "__none__" }),
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        address: true,
        radiusMeters: true,
      },
    }),
    prisma.attendanceRecord.groupBy({
      by: ["status"],
      where: {
        attendanceDate: { gte: monthStart, lt: monthEnd },
        ...(isGlobalSuperAdmin
          ? {}
          : {
              OR: [
                { ownerStudioId: actor.defaultStudioId ?? "__none__" },
                { locationStudioId: actor.defaultStudioId ?? "__none__" },
              ],
            }),
      },
      _count: { _all: true },
    }),
    prisma.attendanceRecord.count({
      where: {
        attendanceDate: { gte: monthStart, lt: monthEnd },
        locationValidationStatus: "OUTSIDE_RADIUS",
        ...(isGlobalSuperAdmin
          ? {}
          : {
              OR: [
                { ownerStudioId: actor.defaultStudioId ?? "__none__" },
                { locationStudioId: actor.defaultStudioId ?? "__none__" },
              ],
            }),
      },
    }),
    prisma.request.count({
      where: {
        status: "PENDING",
        ...(isGlobalSuperAdmin
          ? {}
          : {
              user: {
                OR: [
                  { defaultStudioId: actor.defaultStudioId ?? "__none__" },
                  { placements: { some: { studioId: actor.defaultStudioId ?? "__none__", status: "ACTIVE" as const } } },
                ],
              },
            }),
      },
    }),
    prisma.attendanceRecord.findMany({
      where: {
        attendanceDate: todayDate,
        ...(isGlobalSuperAdmin
          ? {}
          : {
              OR: [
                { ownerStudioId: actor.defaultStudioId ?? "__none__" },
                { locationStudioId: actor.defaultStudioId ?? "__none__" },
              ],
            }),
      },
      orderBy: [{ checkInAt: "desc" }, { createdAt: "desc" }],
      include: {
        user: {
          select: {
            name: true,
            email: true,
            role: true,
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
        picketDate: todayDate,
        ...(isGlobalSuperAdmin ? {} : { studioId: actor.defaultStudioId ?? "__none__" }),
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
    prisma.attendanceRecord.groupBy({
      by: ["attendanceDate"],
      where: {
        attendanceDate: { gte: trendStart },
        ...(isGlobalSuperAdmin
          ? {}
          : {
              OR: [
                { ownerStudioId: actor.defaultStudioId ?? "__none__" },
                { locationStudioId: actor.defaultStudioId ?? "__none__" },
              ],
            }),
      },
      _count: { _all: true },
      orderBy: { attendanceDate: "asc" },
    }),
  ]);

  const dailyTrend: TrendPoint[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);

    const match = rawDailyTrend.find(
      (t) => t.attendanceDate.getTime() === d.getTime()
    );

    const dateLabel = new Intl.DateTimeFormat("id-ID", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
    }).format(d);

    dailyTrend.push({
      dateLabel,
      count: match?._count._all ?? 0,
    });
  }

  const studioRows = await Promise.all(
    studios.map(async (studio) => {
      const [
        defaultMembers,
        studioAdmins,
        studioMembers,
        activePlacements,
        attendanceThisMonth,
        outsideRadius,
      ] = await Promise.all([
        prisma.user.count({
          where: {
            defaultStudioId: studio.id,
            accountStatus: "ACTIVE",
          },
        }),
        prisma.user.count({
          where: {
            defaultStudioId: studio.id,
            accountStatus: "ACTIVE",
            role: "ADMIN",
          },
        }),
        prisma.user.count({
          where: {
            defaultStudioId: studio.id,
            accountStatus: "ACTIVE",
            role: "MEMBER",
          },
        }),
        prisma.placement.count({
          where: {
            studioId: studio.id,
            status: "ACTIVE",
          },
        }),
        prisma.attendanceRecord.count({
          where: {
            ownerStudioId: studio.id,
            attendanceDate: { gte: monthStart, lt: monthEnd },
          },
        }),
        prisma.attendanceRecord.count({
          where: {
            locationStudioId: studio.id,
            attendanceDate: { gte: monthStart, lt: monthEnd },
            locationValidationStatus: "OUTSIDE_RADIUS",
          },
        }),
      ]);

      return {
        ...studio,
        defaultMembers,
        studioAdmins,
        studioMembers,
        activePlacements,
        attendanceThisMonth,
        outsideRadius,
      };
    })
  );

  return {
    attendanceSummary: summarizeAttendanceStatuses(attendanceGroups),
    outsideRadiusThisMonth,
    pendingRequests,
    recentAttendance,
    studioRows,
    picketToday,
    dailyTrend,
    monthLabel: formatMonthLabel(month),
  };
}

export default async function SuperAdminDashboardPage() {
  const currentUser = await requireRole("SUPER_ADMIN");

  const data = await getSuperAdminDashboardData(currentUser);
  const metrics = [
    {
      label: `Jumlah Presensi ${data.monthLabel}`,
      value: data.attendanceSummary.total,
      icon: ClipboardCheck,
      color: "text-blue-700 dark:text-blue-400",
    },
    {
      label: `Sakit ${data.monthLabel}`,
      value: data.attendanceSummary.sick,
      icon: HeartPulse,
      color: "text-violet-700 dark:text-violet-400",
    },
    {
      label: `Terlambat ${data.monthLabel}`,
      value: data.attendanceSummary.late,
      icon: Clock3,
      color: "text-orange-700 dark:text-orange-400",
    },
    {
      label: `Alpha ${data.monthLabel}`,
      value: data.attendanceSummary.alpha,
      icon: AlertTriangle,
      color: "text-red-700 dark:text-red-400",
    },
    {
      label: `WFH ${data.monthLabel}`,
      value: data.attendanceSummary.wfh,
      icon: Home,
      color: "text-sky-700 dark:text-sky-400",
    },
  ];

  const serializedRecentAttendance = data.recentAttendance.map((item) => ({
    id: item.id,
    attendanceDate: item.attendanceDate.toISOString(),
    workMode: item.workMode,
    status: item.status,
    wfhPlan: item.wfhPlan,
    wfhReport: item.wfhReport,
    checkInAt: item.checkInAt ? item.checkInAt.toISOString() : null,
    checkOutAt: item.checkOutAt ? item.checkOutAt.toISOString() : null,
    user: item.user,
    ownerStudio: item.ownerStudio,
    locationStudio: item.locationStudio,
  }));

  return (
    <DashboardShell
      user={currentUser}
      currentPath="/super-admin"
      badge="Welcome, Super Admin"
      title="Super Admin Dashboard"
      description={`Halo ${currentUser.name}. Halaman ini khusus Owner untuk melihat ringkasan Mahative dan Kipa dalam satu tempat.`}
    >
      <div className="space-y-6">
        {/* Metrics Grid */}
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 animate-in fade-in-50 duration-200">
          {metrics.map((metric) => {
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
          <DashboardCharts summary={data.attendanceSummary} dailyTrend={data.dailyTrend} />
        </section>

        {/* Studio Summary & Live Operations Panel */}
        <section className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
          {/* Studio Summary */}
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-zinc-900 dark:text-zinc-50">Ringkasan Studio</CardTitle>
              <CardDescription className="text-zinc-500 dark:text-zinc-400">
                Super Admin memantau data seluruh studio aktif secara terpusat.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Studio</TableHead>
                    <TableHead>Radius</TableHead>
                    <TableHead>Default Member</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Placement</TableHead>
                    <TableHead>Presensi Bulan Ini</TableHead>
                    <TableHead>Luar Radius</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.studioRows.map((studio) => (
                    <TableRow key={studio.id}>
                      <TableCell className="font-medium">
                        <div className="text-zinc-900 dark:text-zinc-100">{studio.name}</div>
                        {studio.address && (
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">
                            {studio.address}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{studio.radiusMeters} m</TableCell>
                      <TableCell>{studio.defaultMembers}</TableCell>
                      <TableCell>{studio.studioAdmins}</TableCell>
                      <TableCell>{studio.studioMembers}</TableCell>
                      <TableCell>{studio.activePlacements}</TableCell>
                      <TableCell>{studio.attendanceThisMonth}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "shadow-none px-2 py-0.5 border",
                            studio.outsideRadius > 0
                              ? "bg-orange-100 dark:bg-orange-950/50 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-900"
                              : "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900"
                          )}
                        >
                          {studio.outsideRadius}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Live Action/Alert Center */}
          <div className="space-y-4">
            <Card className="shadow-none">
              <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-zinc-900 dark:text-zinc-50">
                  <ShieldAlert className="size-4 text-blue-700 dark:text-blue-400" />
                  Operasional & Monitoring Live
                </CardTitle>
                <CardDescription className="text-zinc-500 dark:text-zinc-400">
                  Statistik verifikasi dan warning geofence terkini.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-3 text-sm">
                {/* Pending Request Badge Button */}
                <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/10">
                  <div className="space-y-0.5">
                    <p className="font-bold text-zinc-700 dark:text-zinc-300 text-xs flex items-center gap-1">
                      <ClipboardList className="size-3 text-zinc-400" />
                      PENDING REQUESTS
                    </p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Menunggu persetujuan Owner</p>
                  </div>
                  <Link
                    href="/admin/requests"
                    className="rounded-full bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-950/50 text-blue-700 dark:text-blue-400 font-bold px-3 py-1 text-xs transition-colors flex items-center gap-0.5"
                  >
                    {data.pendingRequests} Izin
                    <ArrowRight className="size-3" />
                  </Link>
                </div>

                {/* Outside Radius Geofence Warning */}
                <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/10">
                  <div className="space-y-0.5">
                    <p className="font-bold text-zinc-700 dark:text-zinc-300 text-xs flex items-center gap-1">
                      <ShieldAlert className="size-3 text-zinc-400" />
                      SOFT WARNING GEOFENCE
                    </p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Presensi luar radius bulan ini</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "px-2.5 py-0.5 font-semibold text-xs shadow-none border",
                      data.outsideRadiusThisMonth > 0
                        ? "bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-900"
                        : "bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800"
                    )}
                  >
                    {data.outsideRadiusThisMonth} Kali
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Picket Duty Info */}
            <Card className="shadow-none">
              <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-zinc-900 dark:text-zinc-50">
                  <Brush className="size-4 text-blue-700 dark:text-blue-400" />
                  Petugas Piket Hari Ini
                </CardTitle>
                <CardDescription className="text-zinc-500 dark:text-zinc-400">
                  Jadwal piket aktif Kipa & Mahative hari ini.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {data.picketToday.length === 0 ? (
                  <p className="text-center py-4 text-xs text-zinc-400 dark:text-zinc-500">
                    Tidak ada jadwal piket hari ini.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {/* Group by studio */}
                    {Array.from(new Set(data.picketToday.map((p) => p.studio.name))).map((studioName) => {
                      const studioPickets = data.picketToday.filter((p) => p.studio.name === studioName);
                      return (
                        <div key={studioName} className="space-y-1">
                          <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 flex items-center gap-1">
                            <Building className="size-3 text-zinc-400" />
                            {studioName.toUpperCase()}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {studioPickets.map((picket) => (
                              <div
                                key={picket.id}
                                className="rounded bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800 px-2 py-0.5 text-[10px] font-medium"
                              >
                                {picket.user.name}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Recent Attendance across all studios */}
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-zinc-900 dark:text-zinc-50">Kehadiran Tim Lintas Studio Hari Ini</CardTitle>
            <CardDescription className="text-zinc-500 dark:text-zinc-400">
              Daftar kehadiran staf lintas studio Mahative dan Kipa hari ini.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Default Studio</TableHead>
                  <TableHead>Lokasi Presensi</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Check-out</TableHead>
                </TableRow>
              </TableHeader>
              <RecentAttendanceTableClient
                records={serializedRecentAttendance}
                statusColor={statusColor}
                statusLabel={statusLabel}
              />
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
