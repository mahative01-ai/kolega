import {
  ArrowLeft,
  CalendarRange,
  ClipboardList,
  Clock3,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logoutAction } from "../login/actions";

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

async function getAdminDashboardData(defaultStudioId: string | null) {
  const today = startOfDay(new Date());
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const studioFilter = defaultStudioId ? { ownerStudioId: defaultStudioId } : {};
  const userFilter = defaultStudioId ? { defaultStudioId } : {};

  const [
    studio,
    activeMembers,
    presentThisMonth,
    lateThisMonth,
    wfhThisMonth,
    pendingRequests,
    recentAttendance,
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
    prisma.attendanceRecord.count({
      where: {
        ...studioFilter,
        attendanceDate: { gte: monthStart, lte: monthEnd },
        status: { in: ["PRESENT", "ON_TIME"] },
      },
    }),
    prisma.attendanceRecord.count({
      where: {
        ...studioFilter,
        attendanceDate: { gte: monthStart, lte: monthEnd },
        status: "LATE",
      },
    }),
    prisma.attendanceRecord.count({
      where: {
        ...studioFilter,
        attendanceDate: { gte: monthStart, lte: monthEnd },
        status: "WFH",
      },
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
  ]);

  return {
    studio,
    activeMembers,
    presentThisMonth,
    lateThisMonth,
    wfhThisMonth,
    pendingRequests,
    recentAttendance,
    monthLabel: new Intl.DateTimeFormat("id-ID", {
      month: "long",
      year: "numeric",
    }).format(today),
  };
}

export default async function AdminDashboardPage() {
  const currentUser = await requireUser();

  if (currentUser.role !== "ADMIN" && currentUser.role !== "SUPER_ADMIN") {
    redirect("/");
  }

  const data = await getAdminDashboardData(currentUser.defaultStudioId);
  const isPreview = currentUser.role === "SUPER_ADMIN";
  const metrics = [
    {
      label: "User Aktif",
      value: data.activeMembers,
      icon: UsersRound,
      color: "text-emerald-700",
    },
    {
      label: `Hadir ${data.monthLabel}`,
      value: data.presentThisMonth,
      icon: CalendarRange,
      color: "text-sky-700",
    },
    {
      label: `Terlambat ${data.monthLabel}`,
      value: data.lateThisMonth,
      icon: Clock3,
      color: "text-orange-700",
    },
    {
      label: "Request Pending",
      value: data.pendingRequests,
      icon: ClipboardList,
      color: "text-violet-700",
    },
  ];

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-zinc-200 pb-5 md:flex-row md:items-center md:justify-between">
          <div>
            <Badge variant="outline" className="mb-3 bg-white">
              {isPreview ? "Preview Super Admin" : "Welcome, Admin"}
            </Badge>
            <h1 className="text-2xl font-semibold">Dashboard Admin</h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-600">
              Fokus untuk operasional studio, presensi tim, dan request member.
              Scope saat ini: {data.studio?.name ?? "semua studio"}.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isPreview ? (
              <Link
                href="/super-admin"
                className={buttonVariants({ variant: "outline" })}
              >
                <ArrowLeft aria-hidden="true" />
                Super Admin
              </Link>
            ) : null}
            <Link href="/" className={buttonVariants({ variant: "outline" })}>
              Dashboard Umum
            </Link>
            <form action={logoutAction}>
              <Button type="submit" variant="ghost">
                Logout
              </Button>
            </form>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
            <CardTitle>Presensi Tim Terbaru</CardTitle>
            <CardDescription>
              Data awal untuk dashboard Admin. Nantinya halaman ini bisa
              ditambah approval izin, jadwal WFO/WFH, dan koreksi presensi.
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
      </div>
    </main>
  );
}
