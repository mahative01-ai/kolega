import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Home,
  QrCode,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
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
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

async function getMemberDashboardData(userId: string) {
  const today = startOfDay(new Date());
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  const [attendanceThisMonth, lateThisMonth, wfhThisMonth, recentAttendance] =
    await Promise.all([
      prisma.attendanceRecord.count({
        where: {
          userId,
          attendanceDate: { gte: monthStart, lte: monthEnd },
        },
      }),
      prisma.attendanceRecord.count({
        where: {
          userId,
          attendanceDate: { gte: monthStart, lte: monthEnd },
          status: "LATE",
        },
      }),
      prisma.attendanceRecord.count({
        where: {
          userId,
          attendanceDate: { gte: monthStart, lte: monthEnd },
          status: "WFH",
        },
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
    ]);

  return {
    attendanceThisMonth,
    lateThisMonth,
    wfhThisMonth,
    recentAttendance,
    monthLabel: new Intl.DateTimeFormat("id-ID", {
      month: "long",
      year: "numeric",
    }).format(today),
  };
}

export default async function MemberDashboardPage() {
  const currentUser = await requireUser();

  if (currentUser.role !== "MEMBER" && currentUser.role !== "SUPER_ADMIN") {
    redirect("/");
  }

  const data = await getMemberDashboardData(currentUser.id);
  const isPreview = currentUser.role === "SUPER_ADMIN";
  const metrics = [
    {
      label: `Presensi ${data.monthLabel}`,
      value: data.attendanceThisMonth,
      icon: CheckCircle2,
      color: "text-emerald-700",
    },
    {
      label: `Terlambat ${data.monthLabel}`,
      value: data.lateThisMonth,
      icon: Clock3,
      color: "text-orange-700",
    },
    {
      label: `WFH ${data.monthLabel}`,
      value: data.wfhThisMonth,
      icon: Home,
      color: "text-blue-700",
    },
  ];

  return (
    <DashboardShell
      user={currentUser}
      currentPath="/member"
      badge={isPreview ? "Preview Super Admin" : "Welcome, Member"}
      title="Dashboard Member"
      description={`Halo ${currentUser.name}. Dashboard ini fokus ke presensi pribadi, jadwal, QR card, dan request izin.`}
    >
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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

        <section className="grid gap-6 lg:grid-cols-[0.7fr_1.3fr]">
          <Card>
            <CardHeader>
              <CardTitle>Aksi Member</CardTitle>
              <CardDescription>
                Tombol awal untuk flow presensi dan kalender pribadi.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Link href="/" className={buttonVariants()}>
                <QrCode aria-hidden="true" />
                Mulai Presensi
              </Link>
              <Link href="/" className={buttonVariants({ variant: "outline" })}>
                <CalendarDays aria-hidden="true" />
                Kalender Saya
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Riwayat Presensi Saya</CardTitle>
              <CardDescription>
                Data terbaru untuk akun yang sedang login.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Default Studio</TableHead>
                    <TableHead>Lokasi</TableHead>
                    <TableHead>Mode</TableHead>
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
        </section>
    </DashboardShell>
  );
}
