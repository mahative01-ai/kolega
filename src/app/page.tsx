import {
  CheckCircle2,
  Clock3,
  MapPin,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
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
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLE_LABEL } from "@/lib/roles";

export const dynamic = "force-dynamic";

const metricConfig = [
  { key: "total", label: "Jumlah Presensi", color: "text-sky-700" },
  { key: "permission", label: "Izin", color: "text-amber-700" },
  { key: "sick", label: "Sakit", color: "text-violet-700" },
  { key: "wfh", label: "WFH", color: "text-blue-700" },
  { key: "onTime", label: "Tepat Waktu", color: "text-emerald-700" },
  { key: "late", label: "Terlambat", color: "text-orange-700" },
  { key: "alpha", label: "Alpha", color: "text-red-700" },
] as const;

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

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, amount: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + amount);
  return nextDate;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function startOfWeek(date: Date) {
  const day = date.getDay();
  return addDays(date, -day);
}

function endOfWeek(date: Date) {
  const day = date.getDay();
  return addDays(date, 6 - day);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

async function getDashboardData() {
  const today = startOfDay(new Date());
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarLength =
    Math.round(
      (calendarEnd.getTime() - calendarStart.getTime()) / 86_400_000
    ) + 1;

  const [
    total,
    permission,
    sick,
    wfh,
    onTime,
    late,
    alpha,
    activeMembers,
    studioCount,
    recentAttendance,
    calendarAttendance,
  ] = await Promise.all([
    prisma.attendanceRecord.count(),
    prisma.attendanceRecord.count({ where: { status: "PERMISSION" } }),
    prisma.attendanceRecord.count({ where: { status: "SICK" } }),
    prisma.attendanceRecord.count({ where: { status: "WFH" } }),
    prisma.attendanceRecord.count({
      where: { status: { in: ["PRESENT", "ON_TIME"] } },
    }),
    prisma.attendanceRecord.count({ where: { status: "LATE" } }),
    prisma.attendanceRecord.count({ where: { status: "ALPHA" } }),
    prisma.user.count({ where: { accountStatus: "ACTIVE" } }),
    prisma.studio.count({ where: { isActive: true } }),
    prisma.attendanceRecord.findMany({
      take: 5,
      orderBy: [{ attendanceDate: "desc" }, { createdAt: "desc" }],
      include: {
        user: {
          select: {
            name: true,
            email: true,
            memberStatus: true,
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
    prisma.attendanceRecord.findMany({
      where: {
        attendanceDate: {
          gte: calendarStart,
          lte: calendarEnd,
        },
      },
      orderBy: [{ attendanceDate: "asc" }, { createdAt: "asc" }],
      select: {
        attendanceDate: true,
        status: true,
      },
    }),
  ]);

  const calendarRecordByDate = new Map(
    calendarAttendance.map((record) => [
      record.attendanceDate.toISOString().slice(0, 10),
      record,
    ])
  );

  const calendarDays = Array.from({ length: calendarLength }, (_, index) => {
    const date = addDays(calendarStart, index);
    const key = date.toISOString().slice(0, 10);
    const record = calendarRecordByDate.get(key);
    const status = record?.status ?? "OFF_DAY";
    const isToday = key === today.toISOString().slice(0, 10);
    const isCurrentMonth = date.getMonth() === today.getMonth();

    return {
      key,
      date: date.getDate().toString(),
      label: statusLabel[status] ?? "-",
      className: statusColor[status] ?? "bg-zinc-100 text-zinc-600",
      isToday,
      isCurrentMonth,
    };
  });

  return {
    metrics: {
      total,
      permission,
      sick,
      wfh,
      onTime,
      late,
      alpha,
    },
    activeMembers,
    studioCount,
    recentAttendance,
    calendarDays,
    calendarTitle: new Intl.DateTimeFormat("id-ID", {
      month: "long",
      year: "numeric",
    }).format(today),
  };
}

export default async function Home() {
  const [currentUser, data] = await Promise.all([
    requireUser(),
    getDashboardData(),
  ]);

  return (
    <DashboardShell
      user={currentUser}
      currentPath="/"
      badge={`Welcome, ${ROLE_LABEL[currentUser.role]}`}
      title="MahaTeams New Gen"
      description={`Halo ${currentUser.name}. Dashboard ini sudah membaca data dari PostgreSQL dan sesi login aktif.`}
    >
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {metricConfig.map((metric) => (
            <Card key={metric.key}>
              <CardHeader className="pb-2">
                <CardDescription>{metric.label}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className={`text-3xl font-semibold ${metric.color}`}>
                  {data.metrics[metric.key].toLocaleString("id-ID")}
                </p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader>
              <CardTitle>Riwayat Presensi Terbaru</CardTitle>
              <CardDescription>
                Data ini dibaca langsung dari tabel AttendanceRecord.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Studio</TableHead>
                    <TableHead>Lokasi</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentAttendance.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
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
                          <Badge variant="secondary">{item.workMode}</Badge>
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

          <Card>
            <CardHeader>
              <CardTitle>Kalender Status</CardTitle>
              <CardDescription>
                Bulan {data.calendarTitle} dengan highlight hari ini.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-2 grid grid-cols-7 gap-2 text-center text-xs font-medium text-zinc-500">
                {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map(
                  (day) => (
                    <div key={day}>{day}</div>
                  )
                )}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {data.calendarDays.map((day) => (
                  <div
                    key={day.key}
                    className={`flex aspect-square min-h-14 flex-col items-center justify-center rounded-md border text-xs font-medium ${
                      day.className
                    } ${day.isCurrentMonth ? "border-transparent" : "border-zinc-200 opacity-40"} ${
                      day.isToday
                        ? "ring-2 ring-zinc-950 ring-offset-2 ring-offset-white"
                        : ""
                    }`}
                  >
                    <span className="text-base">{day.date}</span>
                    <span>{day.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="size-5 text-emerald-700" />
                Role
              </CardTitle>
              <CardDescription>
                {data.activeMembers.toLocaleString("id-ID")} akun aktif siap
                dipakai untuk Super Admin, Admin, dan Member.
              </CardDescription>
              <CardAction>
                <Link
                  href="/roles"
                  className={buttonVariants({ size: "sm", variant: "outline" })}
                >
                  Kelola
                </Link>
              </CardAction>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="size-5 text-blue-700" />
                Studio
              </CardTitle>
              <CardDescription>
                {data.studioCount.toLocaleString("id-ID")} studio aktif
                tersedia untuk Default Studio dan placement.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock3 className="size-5 text-orange-700" />
                Policy
              </CardTitle>
              <CardDescription>
                Policy lokal sudah siap untuk toleransi 10 menit, cutoff Alpha,
                dan aturan izin sakit.
              </CardDescription>
              <CardAction>
                <UserRoundCheck className="size-5 text-zinc-500" />
              </CardAction>
            </CardHeader>
          </Card>
        </section>

        <footer className="flex items-center gap-2 border-t border-zinc-200 py-4 text-xs text-zinc-500">
          <CheckCircle2 className="size-4 text-emerald-700" />
          Dashboard pertama sudah dinamis dari PostgreSQL.
        </footer>
    </DashboardShell>
  );
}
