import {
  CalendarCheck2,
  CheckCheck,
  Clock3,
  LogOut,
  History,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { RiwayatPresensiTableClient } from "./riwayat-presensi-table-client";
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
import { requireAnyRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { getJakartaDateKey } from "@/lib/attendance-time";

export const dynamic = "force-dynamic";

const JAKARTA_TIME_ZONE = "Asia/Jakarta";

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
  PRESENT: "bg-emerald-100 text-emerald-800",
  ON_TIME: "bg-emerald-100 text-emerald-800",
  LATE: "bg-orange-100 text-orange-800",
  WFH: "bg-blue-100 text-blue-800",
  PERMISSION: "bg-amber-100 text-amber-800",
  SICK: "bg-violet-100 text-violet-800",
  DISPENSATION: "bg-emerald-100 text-emerald-800",
  LEAVE: "bg-sky-100 text-sky-800",
  ALPHA: "bg-red-100 text-red-800",
  HOLIDAY: "bg-zinc-200 text-zinc-700",
  OFF_DAY: "bg-zinc-200 text-zinc-700",
};

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

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatTime(date: Date | null) {
  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: JAKARTA_TIME_ZONE,
  }).format(date);
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
  const monthLabel = new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(data.monthStart);
  const metrics = [
    {
      label: `Presensi ${monthLabel}`,
      value: data.total,
      icon: CalendarCheck2,
      color: "text-blue-700",
    },
    {
      label: "Tepat Waktu",
      value: data.onTime,
      icon: CheckCheck,
      color: "text-emerald-700",
    },
    {
      label: "Terlambat",
      value: data.late,
      icon: Clock3,
      color: "text-orange-700",
    },
    {
      label: "Check-out Selesai",
      value: data.completed,
      icon: LogOut,
      color: "text-violet-700",
    },
  ];

  return (
    <DashboardShell
      user={currentUser}
      currentPath="/member/presensi/riwayat"
      badge="Riwayat Pribadi"
      title="Riwayat Presensi Saya"
      description={`Catatan presensi milik ${currentUser.name}. Data Admin di halaman ini tetap bersifat personal.`}
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
                    {metric.value.toLocaleString("id-ID")}
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
                Catatan Presensi
              </CardTitle>
              <CardDescription>
                Maksimal 60 catatan terbaru, termasuk WFO dan WFH.
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
