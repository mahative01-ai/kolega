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
  ArrowRight,
  Building2,
  Users
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
import { ConfettiTrigger } from "@/components/confetti-trigger";
import { DailySignalsBanner } from "@/components/daily-signals-banner";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { getDailySignals } from "@/lib/daily-signals";
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
  PRESENT: "Present",
  ON_TIME: "On Time",
  LATE: "Late",
  WFH: "WFH",
  PERMISSION: "Permission",
  SICK: "Sick Leave",
  DISPENSATION: "Dispensation",
  LEAVE: "Replacement Leave",
  ALPHA: "Alpha",
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
  DISPENSATION: "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900",
  LEAVE: "bg-sky-100 dark:bg-sky-950/50 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-900",
  ALPHA: "bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-300 border-red-200 dark:border-red-900",
  HOLIDAY: "bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700",
  OFF_DAY: "bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700",
};

type TrendPoint = {
  dateLabel: string;
  count: number;
};

async function getSuperAdminDashboardData(selectedMonthKey?: string) {
  const month = normalizeReportMonth(selectedMonthKey);
  const { start: monthStart, endExclusive: monthEnd } = getMonthRange(month);

  const todayKey = getJakartaDateKey();
  const todayDate = dateOnlyFromKey(todayKey);

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
    workDayBalanceUsers,
  ] = await Promise.all([
    prisma.studio.findMany({
      where: {
        isActive: true,
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
      },
      _count: { _all: true },
    }),
    prisma.attendanceRecord.count({
      where: {
        attendanceDate: { gte: monthStart, lt: monthEnd },
        locationValidationStatus: "OUTSIDE_RADIUS",
      },
    }),
    prisma.request.count({
      where: {
        status: "PENDING",
      },
    }),
    prisma.attendanceRecord.findMany({
      where: {
        attendanceDate: todayDate,
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
      },
      _count: { _all: true },
      orderBy: { attendanceDate: "asc" },
    }),
    prisma.user.findMany({
      where: {
        role: { not: "SUPER_ADMIN" },
        accountStatus: "ACTIVE",
      },
      select: {
        workDayBalance: true,
      },
    }),
  ]);

  const workDayBalanceSummary = {
    debt: workDayBalanceUsers.filter((user) => user.workDayBalance < 0).length,
    surplus: workDayBalanceUsers.filter((user) => user.workDayBalance > 0).length,
    settled: workDayBalanceUsers.filter((user) => user.workDayBalance === 0).length,
    totalDebtDays: workDayBalanceUsers.reduce(
      (total, user) => total + (user.workDayBalance < 0 ? Math.abs(user.workDayBalance) : 0),
      0
    ),
  };

  const dailyTrend: TrendPoint[] = [];
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

  const studioRows = await Promise.all(
    studios.map(async (studio) => {
      const [
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
        studioAdmins,
        studioMembers,
        activePlacements,
        attendanceThisMonth,
        outsideRadius,
      };
    })
  );

  const dailySignals = await getDailySignals({
    id: "super-admin",
    role: "SUPER_ADMIN",
  });

  return {
    attendanceSummary: summarizeAttendanceStatuses(attendanceGroups),
    outsideRadiusThisMonth,
    pendingRequests,
    recentAttendance,
    studioRows,
    picketToday,
    dailyTrend,
    workDayBalanceSummary,
    dailySignals,
    monthLabel: formatMonthLabel(month),
  };
}

export default async function SuperAdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const [currentUser, params] = await Promise.all([
    requireRole("SUPER_ADMIN"),
    searchParams,
  ]);

  const data = await getSuperAdminDashboardData(params.month);
  const currentDate = new Date();
  const birthDate = currentUser.birthDate ? new Date(currentUser.birthDate) : null;
  const isBirthday = birthDate &&
    birthDate.getUTCDate() === currentDate.getDate() &&
    birthDate.getUTCMonth() === currentDate.getMonth();
  const metrics = [
    {
      label: `Total Attendance ${data.monthLabel}`,
      value: data.attendanceSummary.total,
      icon: ClipboardCheck,
      color: "text-blue-700 dark:text-blue-400",
    },
    {
      label: `Sick ${data.monthLabel}`,
      value: data.attendanceSummary.sick,
      icon: HeartPulse,
      color: "text-violet-700 dark:text-violet-400",
    },
    {
      label: `Late ${data.monthLabel}`,
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
    {
      label: "Minus Workdays",
      value: data.workDayBalanceSummary.debt,
      icon: ShieldAlert,
      color: "text-red-700 dark:text-red-400",
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
      description={`Hello ${currentUser.name}. This page is for Owners to view a summary of Mahative and Kipa in one place.`}
    >
      {isBirthday && (
        <>
          <ConfettiTrigger preset="fireworks" />
          <div className="rounded-xl border border-pink-200 dark:border-pink-900 bg-pink-50 dark:bg-pink-950/20 p-5 text-sm text-pink-850 dark:text-pink-300 mb-6 flex items-center gap-4 shadow-sm">
            <span className="text-3xl">🎂</span>
            <div>
              <h3 className="font-bold text-base text-pink-900 dark:text-pink-400">Happy Birthday, {currentUser.name}! 🎉</h3>
            </div>
          </div>
        </>
      )}

      <DailySignalsBanner signals={data.dailySignals} currentUserId={currentUser.id} />

      <div className="space-y-6">
        {/* Metrics Grid */}
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 animate-in fade-in-50 duration-200">
          {metrics.map((metric) => {
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
                          {metric.value.toLocaleString("en-US")}
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
          <DashboardCharts summary={data.attendanceSummary} dailyTrend={data.dailyTrend} />
        </section>

        {/* Studio Summary & Live Operations Panel */}
        <section className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
          {/* Studio Summary */}
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                <Building2 className="size-5 text-blue-700 dark:text-blue-400" />
                Studio Summary
              </CardTitle>
              <CardDescription className="text-zinc-500 dark:text-zinc-400">
                Super Admin centrally monitors data across all active studios.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Studio</TableHead>
                    <TableHead>Radius</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Placement</TableHead>
                    <TableHead>Attendance This Month</TableHead>
                    <TableHead>Outside Radius</TableHead>
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
                  Live Operations & Monitoring
                </CardTitle>
                <CardDescription className="text-zinc-500 dark:text-zinc-400">
                  Latest verification statistics and geofence warnings.
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
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Awaiting Owner approval</p>
                  </div>
                  <Link
                    href="/admin/requests"
                    className="rounded-full bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-950/50 text-blue-700 dark:text-blue-400 font-bold px-3 py-1 text-xs transition-colors flex items-center gap-0.5"
                  >
                    {data.pendingRequests} Requests
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
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Out-of-radius attendance this month</p>
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
                    {data.outsideRadiusThisMonth} Times
                  </Badge>
                </div>

                <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/10 p-3">
                  <p className="font-bold text-zinc-700 dark:text-zinc-300 text-xs flex items-center gap-1">
                    <Clock3 className="size-3 text-zinc-400" />
                    WORKDAY BALANCE
                  </p>
                  <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                    Replacement debt, surplus, and cleared members.
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="rounded-md border border-red-200 bg-red-50 p-2 text-center dark:border-red-900 dark:bg-red-950/20">
                      <div className="text-lg font-bold text-red-700 dark:text-red-300">{data.workDayBalanceSummary.debt}</div>
                      <div className="text-[10px] font-semibold text-red-700 dark:text-red-300">Minus</div>
                    </div>
                    <div className="rounded-md border border-emerald-200 bg-emerald-50 p-2 text-center dark:border-emerald-900 dark:bg-emerald-950/20">
                      <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{data.workDayBalanceSummary.surplus}</div>
                      <div className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">Surplus</div>
                    </div>
                    <div className="rounded-md border border-zinc-200 bg-white p-2 text-center dark:border-zinc-800 dark:bg-zinc-950">
                      <div className="text-lg font-bold text-zinc-700 dark:text-zinc-300">{data.workDayBalanceSummary.settled}</div>
                      <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">Cleared</div>
                    </div>
                  </div>
                  <div className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                    Total active debt: <span className="font-semibold text-red-700 dark:text-red-300">{data.workDayBalanceSummary.totalDebtDays} days</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Picket Duty Info */}
            <Card className="shadow-none">
              <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-zinc-900 dark:text-zinc-50">
                  <Brush className="size-4 text-blue-700 dark:text-blue-400" />
                  Today&apos;s Picket Duty
                </CardTitle>
                <CardDescription className="text-zinc-500 dark:text-zinc-400">
                  Active picket schedules for Kipa & Mahative today.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {data.picketToday.length === 0 ? (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    There are no picket duty officers assigned for today.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {/* Group by studio */}
                    {Array.from(new Set(data.picketToday.map((p) => p.studio.name))).map((studioName) => {
                      const studioPickets = data.picketToday.filter((p) => p.studio.name === studioName);
                      return (
                        <div key={studioName} className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/10 space-y-2">
                          <p className="text-xs font-bold text-zinc-900 dark:text-zinc-150 uppercase tracking-wider">
                            Studio: {studioName}
                          </p>
                          <div className="space-y-1.5 pl-2 text-xs">
                            {studioPickets.map((p) => (
                              <div key={p.id} className="text-zinc-750 dark:text-zinc-350">
                                • <span className="font-medium text-zinc-850 dark:text-zinc-205">{p.user.name}</span>
                                {p.note && (
                                  <span className="text-[10px] text-zinc-500 italic block pl-3">
                                    Note: &ldquo;{p.note}&rdquo;
                                  </span>
                                )}
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
            <CardTitle className="text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <Users className="size-5 text-blue-700 dark:text-blue-400" />
              Cross-Studio Team Attendance Today
            </CardTitle>
            <CardDescription className="text-zinc-500 dark:text-zinc-400">
              Today&apos;s attendance list of staff across Mahative and Kipa studios.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Default Studio</TableHead>
                  <TableHead>Attendance Location</TableHead>
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
