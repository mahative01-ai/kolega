import {
  AlertTriangle,
  Building2,
  CalendarRange,
  LayoutDashboard,
  ShieldCheck,
  UserRound,
  UserCog,
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

async function getSuperAdminDashboardData() {
  const today = startOfDay(new Date());
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  const [
    studios,
    activeUsers,
    adminCount,
    memberCount,
    wfhThisMonth,
    alphaThisMonth,
    outsideRadiusThisMonth,
    pendingRequests,
    recentAttendance,
  ] = await Promise.all([
    prisma.studio.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        address: true,
        radiusMeters: true,
      },
    }),
    prisma.user.count({ where: { accountStatus: "ACTIVE" } }),
    prisma.user.count({
      where: { accountStatus: "ACTIVE", role: "ADMIN" },
    }),
    prisma.user.count({
      where: { accountStatus: "ACTIVE", role: "MEMBER" },
    }),
    prisma.attendanceRecord.count({
      where: {
        attendanceDate: { gte: monthStart, lte: monthEnd },
        status: "WFH",
      },
    }),
    prisma.attendanceRecord.count({
      where: {
        attendanceDate: { gte: monthStart, lte: monthEnd },
        status: "ALPHA",
      },
    }),
    prisma.attendanceRecord.count({
      where: {
        attendanceDate: { gte: monthStart, lte: monthEnd },
        locationValidationStatus: "OUTSIDE_RADIUS",
      },
    }),
    prisma.request.count({ where: { status: "PENDING" } }),
    prisma.attendanceRecord.findMany({
      take: 6,
      orderBy: [{ attendanceDate: "desc" }, { createdAt: "desc" }],
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
  ]);

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
            attendanceDate: { gte: monthStart, lte: monthEnd },
          },
        }),
        prisma.attendanceRecord.count({
          where: {
            locationStudioId: studio.id,
            attendanceDate: { gte: monthStart, lte: monthEnd },
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
    activeUsers,
    adminCount,
    memberCount,
    wfhThisMonth,
    alphaThisMonth,
    outsideRadiusThisMonth,
    pendingRequests,
    recentAttendance,
    studioRows,
    monthLabel: new Intl.DateTimeFormat("id-ID", {
      month: "long",
      year: "numeric",
    }).format(today),
  };
}

export default async function SuperAdminDashboardPage() {
  const currentUser = await requireUser();

  if (currentUser.role !== "SUPER_ADMIN") {
    redirect("/");
  }

  const data = await getSuperAdminDashboardData();
  const metrics = [
    {
      label: "Studio Aktif",
      value: data.studioRows.length,
      icon: Building2,
      color: "text-sky-700",
    },
    {
      label: "User Aktif",
      value: data.activeUsers,
      icon: UsersRound,
      color: "text-emerald-700",
    },
    {
      label: "Admin",
      value: data.adminCount,
      icon: UserCog,
      color: "text-violet-700",
    },
    {
      label: "Member",
      value: data.memberCount,
      icon: UsersRound,
      color: "text-blue-700",
    },
    {
      label: `WFH ${data.monthLabel}`,
      value: data.wfhThisMonth,
      icon: CalendarRange,
      color: "text-indigo-700",
    },
    {
      label: `Alpha ${data.monthLabel}`,
      value: data.alphaThisMonth,
      icon: AlertTriangle,
      color: "text-red-700",
    },
  ];

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-zinc-200 pb-5 md:flex-row md:items-center md:justify-between">
          <div>
            <Badge variant="outline" className="mb-3 bg-white">
              Welcome, Super Admin
            </Badge>
            <h1 className="text-2xl font-semibold">Super Admin Dashboard</h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-600">
              Halo {currentUser.name}. Halaman ini khusus Owner untuk melihat
              ringkasan Mahative dan Kipa dalam satu tempat.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/"
              className={buttonVariants({ variant: "outline" })}
            >
              <LayoutDashboard aria-hidden="true" />
              Dashboard Umum
            </Link>
            <Link
              href="/admin"
              className={buttonVariants({ variant: "outline" })}
            >
              <UserCog aria-hidden="true" />
              Dashboard Admin
            </Link>
            <Link
              href="/member"
              className={buttonVariants({ variant: "outline" })}
            >
              <UserRound aria-hidden="true" />
              Dashboard Member
            </Link>
            <Link href="/roles" className={buttonVariants()}>
              <ShieldCheck aria-hidden="true" />
              Kelola Role
            </Link>
            <form action={logoutAction}>
              <Button type="submit" variant="ghost">
                Logout
              </Button>
            </form>
          </div>
        </header>

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

        <section className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
          <Card>
            <CardHeader>
              <CardTitle>Ringkasan Studio</CardTitle>
              <CardDescription>
                Super Admin melihat semua studio, sedangkan Admin nantinya
                dibatasi ke studio tempat ia bekerja.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Studio</TableHead>
                    <TableHead>Radius</TableHead>
                    <TableHead>Default Member</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Placement Aktif</TableHead>
                    <TableHead>Presensi Bulan Ini</TableHead>
                    <TableHead>Luar Radius</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.studioRows.map((studio) => (
                    <TableRow key={studio.id}>
                      <TableCell className="font-medium">
                        <div>{studio.name}</div>
                        <div className="text-xs text-zinc-500">
                          {studio.address ?? studio.slug}
                        </div>
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
                          className={
                            studio.outsideRadius > 0
                              ? "bg-orange-100 text-orange-800"
                              : "bg-emerald-100 text-emerald-800"
                          }
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

          <Card>
            <CardHeader>
              <CardTitle>Akses Owner</CardTitle>
              <CardDescription>
                Bukti pemisahan dashboard dan akses Super Admin.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-zinc-700">
              <div className="rounded-md border border-zinc-200 bg-white p-3">
                <p className="font-medium text-zinc-950">Lintas Studio</p>
                <p className="mt-1 text-zinc-600">
                  Bisa melihat Mahative dan Kipa sekaligus.
                </p>
              </div>
              <div className="rounded-md border border-zinc-200 bg-white p-3">
                <p className="font-medium text-zinc-950">Role</p>
                <p className="mt-1 text-zinc-600">
                  Bisa memberi akses Admin ke Member, tetapi Super Admin tetap
                  dibuat manual.
                </p>
              </div>
              <div className="rounded-md border border-zinc-200 bg-white p-3">
                <p className="font-medium text-zinc-950">Approval</p>
                <p className="mt-1 text-zinc-600">
                  Pending request saat ini: {data.pendingRequests}.
                </p>
              </div>
              <div className="rounded-md border border-zinc-200 bg-white p-3">
                <p className="font-medium text-zinc-950">Soft Warning</p>
                <p className="mt-1 text-zinc-600">
                  Presensi luar radius bulan ini: {data.outsideRadiusThisMonth}.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Riwayat Presensi Lintas Studio</CardTitle>
            <CardDescription>
              Data terbaru dari Mahative dan Kipa untuk pembuktian akses Super
              Admin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Default Studio</TableHead>
                  <TableHead>Lokasi Presensi</TableHead>
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
      </div>
    </main>
  );
}
