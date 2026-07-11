import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  HeartPulse,
  Home,
} from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { DashboardShell } from "@/components/dashboard-shell";
import { AttendanceReportExportClient } from "./export-client";
import { LaporanPresensiTabsClient } from "./laporan-presensi-tabs-client";
import {
  ATTENDANCE_STATUS_COLOR,
  ATTENDANCE_STATUS_LABEL,
  formatMonthLabel,
  getMonthRange,
  normalizeReportMonth,
  summarizeAttendanceStatuses,
} from "@/lib/attendance-report";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const FILTERABLE_STATUSES = [
  "ON_TIME",
  "LATE",
  "WFH",
  "SICK",
  "LEAVE",
  "ALPHA",
] as const;

function normalizeStatus(value?: string) {
  return FILTERABLE_STATUSES.find((status) => status === value) ?? "ALL";
}

export default async function AttendanceReportPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; studio?: string; status?: string }>;
}) {
  const [currentUser, params] = await Promise.all([
    requireRole("SUPER_ADMIN"),
    searchParams,
  ]);
  const month = normalizeReportMonth(params.month);
  const status = normalizeStatus(params.status);
  const { start, endExclusive } = getMonthRange(month);

  const isGlobalSuperAdmin = currentUser.role === "SUPER_ADMIN" && currentUser.defaultStudioId === null;

  const availableStudios =
    isGlobalSuperAdmin
      ? await prisma.studio.findMany({
          where: { isActive: true },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        })
      : currentUser.defaultStudioId && currentUser.defaultStudio
        ? [
            {
              id: currentUser.defaultStudioId,
              name: currentUser.defaultStudio.name,
            },
          ]
        : [];

  const selectedStudioId =
    !isGlobalSuperAdmin
      ? (currentUser.defaultStudioId ?? "__unassigned__")
      : availableStudios.some((studio) => studio.id === params.studio)
        ? params.studio
        : undefined;

  const baseWhere: Prisma.AttendanceRecordWhereInput = {
    attendanceDate: { gte: start, lt: endExclusive },
    ...(!isGlobalSuperAdmin
      ? {
          OR: [
            { ownerStudioId: selectedStudioId },
            { locationStudioId: selectedStudioId }
          ]
        }
      : selectedStudioId
        ? { ownerStudioId: selectedStudioId }
        : {}),
  };

  const detailWhere: Prisma.AttendanceRecordWhereInput = {
    ...baseWhere,
    ...(status !== "ALL" ? { status } : {}),
  };

  const [groups, records] = await Promise.all([
    prisma.attendanceRecord.groupBy({
      by: ["status"],
      where: baseWhere,
      _count: { _all: true },
    }),
    prisma.attendanceRecord.findMany({
      take: 500,
      where: detailWhere,
      orderBy: [{ attendanceDate: "desc" }, { user: { name: "asc" } }],
      select: {
        id: true,
        attendanceDate: true,
        workMode: true,
        status: true,
        checkInAt: true,
        checkOutAt: true,
        lateMinutes: true,
        earlyCheckoutMinutes: true,
        locationValidationStatus: true,
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
        ownerStudio: { select: { name: true } },
        locationStudio: { select: { name: true } },
        wfhPlan: true,
        wfhReport: true,
      },
    }),
  ]);
  const summary = summarizeAttendanceStatuses(groups);
  const metrics = [
    {
      label: "Jumlah Presensi",
      value: summary.total,
      icon: ClipboardCheck,
      color: "text-blue-700",
    },
    {
      label: "Sakit",
      value: summary.sick,
      icon: HeartPulse,
      color: "text-violet-700",
    },
    {
      label: "Terlambat",
      value: summary.late,
      icon: Clock3,
      color: "text-orange-700",
    },
    {
      label: "Tepat Waktu",
      value: summary.onTime,
      icon: CheckCircle2,
      color: "text-emerald-700",
    },
    {
      label: "Alpha",
      value: summary.alpha,
      icon: AlertTriangle,
      color: "text-red-700",
    },
    {
      label: "WFH",
      value: summary.wfh,
      icon: Home,
      color: "text-sky-700",
    },
  ];

  // Serialize records to match the export component expectations
  const serializedRecords = records.map(r => ({
    id: r.id,
    attendanceDate: r.attendanceDate.toISOString(),
    workMode: r.workMode,
    status: r.status,
    checkInAt: r.checkInAt ? r.checkInAt.toISOString() : null,
    checkOutAt: r.checkOutAt ? r.checkOutAt.toISOString() : null,
    lateMinutes: r.lateMinutes,
    earlyCheckoutMinutes: r.earlyCheckoutMinutes,
    user: r.user,
    ownerStudio: r.ownerStudio,
    locationStudio: r.locationStudio,
    wfhPlan: r.wfhPlan,
    wfhReport: r.wfhReport,
  }));

  return (
    <DashboardShell
      user={currentUser}
      currentPath="/laporan-presensi"
      badge="Data PostgreSQL"
      title="Laporan Presensi"
      description={`${formatMonthLabel(month)}. ${
        isGlobalSuperAdmin
          ? "Scope dapat mencakup seluruh studio."
          : `Scope dikunci ke ${currentUser.defaultStudio?.name ?? "studio Admin"}.`
      }`}
    >
      {/* CSS @media print helper to hide shell UI */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          aside, header, form, button, .no-print, [data-slot="dialog-portal"] {
            display: none !important;
          }
          main, div, body {
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .print-full-width {
            width: 100% !important;
            max-width: 100% !important;
          }
        }
      `}} />

      <div className="flex flex-col gap-4">
        <Card className="shadow-none">
          <CardContent className="p-4 flex flex-wrap items-end justify-between gap-4">
            <form method="GET" className="flex flex-wrap items-end gap-3 flex-1">
              <div className="grid gap-1.5">
                <label htmlFor="report-month" className="text-sm font-medium">
                  Bulan
                </label>
                <input
                  id="report-month"
                  name="month"
                  type="month"
                  defaultValue={month}
                  className="h-9 rounded-md border border-input bg-white dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 px-3 text-sm focus:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>
              {isGlobalSuperAdmin ? (
                <div className="grid gap-1.5">
                  <label htmlFor="report-studio" className="text-sm font-medium">
                    Default Studio
                  </label>
                  <select
                    id="report-studio"
                    name="studio"
                    defaultValue={selectedStudioId ?? ""}
                    className="h-9 rounded-md border border-input bg-white dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 px-3 text-sm focus:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <option value="">Semua Studio</option>
                    {availableStudios.map((studio) => (
                      <option key={studio.id} value={studio.id}>
                        {studio.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              <div className="grid gap-1.5">
                <label htmlFor="report-status" className="text-sm font-medium">
                  Status Detail
                </label>
                <select
                  id="report-status"
                  name="status"
                  defaultValue={status}
                  className="h-9 rounded-md border border-input bg-white dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 px-3 text-sm focus:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="ALL">Semua Status</option>
                  {FILTERABLE_STATUSES.map((item) => (
                    <option key={item} value={item}>
                      {ATTENDANCE_STATUS_LABEL[item]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1.5">
                <div className="h-5" />
                <Button type="submit" className="h-9">Terapkan Filter</Button>
              </div>
            </form>

            <div className="grid gap-1.5 justify-self-end">
              <div className="h-5" />
              <AttendanceReportExportClient
                records={serializedRecords}
                monthLabel={formatMonthLabel(month)}
              />
            </div>
          </CardContent>
        </Card>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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

      <LaporanPresensiTabsClient
        records={serializedRecords}
        statusColor={ATTENDANCE_STATUS_COLOR}
        statusLabel={ATTENDANCE_STATUS_LABEL}
      />
      </div>
    </DashboardShell>
  );
}
