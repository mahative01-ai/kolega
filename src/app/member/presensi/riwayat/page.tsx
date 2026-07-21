import {
  CalendarCheck2,
  CheckCheck,
  Clock3,
  LogOut,
  History,
} from "lucide-react";
import { RiwayatPresensiTableClient } from "./riwayat-presensi-table-client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DashboardShell } from "@/components/dashboard-shell";
import { requireAnyRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const JAKARTA_TIME_ZONE = "Asia/Jakarta";

function getJakartaYearMonth(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: JAKARTA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);

  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
  };
}

function getMonthRange() {
  const { year, month } = getJakartaYearMonth();
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const nextMonthStart = new Date(Date.UTC(year, month, 1));

  return { monthStart, nextMonthStart };
}

async function getPersonalAttendanceHistory(userId: string) {
  const { monthStart, nextMonthStart } = getMonthRange();
  const monthFilter = {
    userId,
    attendanceDate: { gte: monthStart, lt: nextMonthStart },
  };

  const [total, onTime, late, completed, records] = await Promise.all([
    prisma.attendanceRecord.count({ where: monthFilter }),
    prisma.attendanceRecord.count({
      where: { ...monthFilter, status: { in: ["PRESENT", "ON_TIME", "DISPENSATION"] } },
    }),
    prisma.attendanceRecord.count({
      where: { ...monthFilter, status: "LATE" },
    }),
    prisma.attendanceRecord.count({
      where: { ...monthFilter, checkOutAt: { not: null } },
    }),
    prisma.attendanceRecord.findMany({
      take: 60,
      where: { userId },
      orderBy: [{ attendanceDate: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        attendanceDate: true,
        workMode: true,
        status: true,
        checkInAt: true,
        checkOutAt: true,
        lateMinutes: true,
        earlyCheckoutMinutes: true,
        ownerStudio: { select: { name: true } },
        locationStudio: { select: { name: true } },
      },
    }),
  ]);

  return { total, onTime, late, completed, records, monthStart };
}

export default async function PersonalAttendanceHistoryPage() {
  const currentUser = await requireAnyRole(["ADMIN", "MEMBER"]);
  const data = await getPersonalAttendanceHistory(currentUser.id);
  const monthName = new Intl.DateTimeFormat("en-US", {
    month: "long",
    timeZone: "UTC",
  }).format(data.monthStart);
  const metrics = [
    {
      label: `Attendance ${monthName}`,
      value: data.total,
      icon: CalendarCheck2,
      color: "text-blue-700 dark:text-blue-400",
    },
    {
      label: "On Time",
      value: data.onTime,
      icon: CheckCheck,
      color: "text-emerald-700 dark:text-emerald-400",
    },
    {
      label: "Late",
      value: data.late,
      icon: Clock3,
      color: "text-orange-700 dark:text-orange-400",
    },
    {
      label: "Check-out Completed",
      value: data.completed,
      icon: LogOut,
      color: "text-violet-700 dark:text-violet-400",
    },
  ];

  return (
    <DashboardShell
      user={currentUser}
      currentPath="/member/presensi/riwayat"
      badge="Personal History"
      title="My Attendance History"
      description={`Attendance logs for ${currentUser.name}.`}
    >
      <div className="space-y-6">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
                    {metric.value.toLocaleString("en-US")}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </section>

        <Card>
          <CardHeader>
            <div>
              <CardTitle className="text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                <History className="size-5 text-blue-700 dark:text-blue-400" />
                Attendance Records
              </CardTitle>
              <CardDescription>
                Up to 60 recent attendance records, including WFO and WFH.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <RiwayatPresensiTableClient records={data.records} />
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
