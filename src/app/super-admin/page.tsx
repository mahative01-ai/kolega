import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  HeartPulse,
  Home,
  RotateCcw,
  Save,
  ShieldMinus,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { revalidatePath } from "next/cache";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DashboardShell } from "@/components/dashboard-shell";
import {
  formatMonthLabel,
  getMonthRange,
  normalizeReportMonth,
  summarizeAttendanceStatuses,
} from "@/lib/attendance-report";
import { hashPassword, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLE_LABEL } from "@/lib/roles";

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

const accountStatusLabel: Record<string, string> = {
  ACTIVE: "Aktif",
  INACTIVE: "Nonaktif",
  ARCHIVED: "Arsip",
};

const accountStatusColor: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-800",
  INACTIVE: "bg-amber-100 text-amber-800",
  ARCHIVED: "bg-zinc-200 text-zinc-700",
};

const accountStatuses = ["ACTIVE", "INACTIVE", "ARCHIVED"] as const;

type EditableRole = "ADMIN" | "MEMBER";
type EditableMemberStatus = "TEAM" | "INTERN";
type EditableAccountStatus = (typeof accountStatuses)[number];

function readFormString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function parseEditableRole(value: string): EditableRole {
  return value === "ADMIN" ? "ADMIN" : "MEMBER";
}

function parseMemberStatus(value: string): EditableMemberStatus {
  return value === "INTERN" ? "INTERN" : "TEAM";
}

function parseAccountStatus(value: string): EditableAccountStatus {
  return accountStatuses.includes(value as EditableAccountStatus)
    ? (value as EditableAccountStatus)
    : "ACTIVE";
}

function dateOnly(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

async function requireSuperAdminActor() {
  return requireRole("SUPER_ADMIN");
}

async function createManagedUserAction(formData: FormData) {
  "use server";

  const actor = await requireSuperAdminActor();
  const name = readFormString(formData, "name");
  const email = readFormString(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = parseEditableRole(readFormString(formData, "role"));
  const memberStatus = parseMemberStatus(
    readFormString(formData, "memberStatus")
  );
  const defaultStudioId = readFormString(formData, "defaultStudioId") || null;
  const placementStudioId =
    readFormString(formData, "placementStudioId") || null;

  if (!name || !email || password.length < 6) {
    throw new Error("Nama, email, dan password minimal 6 karakter wajib diisi.");
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    throw new Error("Email sudah terdaftar.");
  }

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name,
        email,
        passwordHash: hashPassword(password),
        role,
        memberStatus,
        accountStatus: "ACTIVE",
        defaultStudioId,
      },
      select: { id: true },
    });

    if (placementStudioId) {
      await tx.placement.create({
        data: {
          userId: user.id,
          studioId: placementStudioId,
          startDate: dateOnly(),
          status: "ACTIVE",
          reason: "Placement awal dari manajemen akun",
          createdById: actor.id,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        entity: "User",
        entityId: user.id,
        action: "USER_CREATED_BY_SUPER_ADMIN",
        metadata: { role, memberStatus, defaultStudioId, placementStudioId },
      },
    });
  });

  revalidatePath("/super-admin");
  revalidatePath("/roles");
}

async function updateManagedUserAction(formData: FormData) {
  "use server";

  const actor = await requireSuperAdminActor();
  const userId = readFormString(formData, "userId");
  const name = readFormString(formData, "name");
  const role = parseEditableRole(readFormString(formData, "role"));
  const memberStatus = parseMemberStatus(
    readFormString(formData, "memberStatus")
  );
  const accountStatus = parseAccountStatus(
    readFormString(formData, "accountStatus")
  );
  const defaultStudioId = readFormString(formData, "defaultStudioId") || null;
  const placementStudioId =
    readFormString(formData, "placementStudioId") || null;

  if (!name) {
    throw new Error("Nama user wajib diisi.");
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });

  if (!target || target.role === "SUPER_ADMIN") {
    throw new Error("User ini tidak bisa diubah dari tabel sementara.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        name,
        role,
        memberStatus,
        accountStatus,
        defaultStudioId,
      },
    });

    const activePlacement = await tx.placement.findFirst({
      where: {
        userId,
        status: "ACTIVE",
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        studioId: true,
      },
    });

    if (!placementStudioId && activePlacement) {
      await tx.placement.update({
        where: {
          id: activePlacement.id,
        },
        data: {
          status: "COMPLETED",
          endDate: dateOnly(),
        },
      });
    }

    if (
      placementStudioId &&
      (!activePlacement || activePlacement.studioId !== placementStudioId)
    ) {
      await tx.placement.updateMany({
        where: {
          userId,
          status: "ACTIVE",
        },
        data: {
          status: "COMPLETED",
          endDate: dateOnly(),
        },
      });

      await tx.placement.create({
        data: {
          userId,
          studioId: placementStudioId,
          startDate: dateOnly(),
          status: "ACTIVE",
          reason: "Diatur dari manajemen akun",
          createdById: actor.id,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        entity: "User",
        entityId: userId,
        action: "USER_UPDATED_BY_SUPER_ADMIN",
        metadata: {
          role,
          memberStatus,
          accountStatus,
          defaultStudioId,
          placementStudioId,
        },
      },
    });
  });

  revalidatePath("/super-admin");
  revalidatePath("/roles");
}

async function archiveManagedUserAction(formData: FormData) {
  "use server";

  const actor = await requireSuperAdminActor();
  const userId = readFormString(formData, "userId");

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });

  if (!target || target.role === "SUPER_ADMIN" || target.id === actor.id) {
    throw new Error("User ini tidak bisa diarsipkan.");
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { accountStatus: "ARCHIVED" },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id,
        entity: "User",
        entityId: userId,
        action: "USER_ARCHIVED_BY_SUPER_ADMIN",
      },
    }),
  ]);

  revalidatePath("/super-admin");
  revalidatePath("/roles");
}

async function restoreManagedUserAction(formData: FormData) {
  "use server";

  const actor = await requireSuperAdminActor();
  const userId = readFormString(formData, "userId");

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });

  if (!target || target.role === "SUPER_ADMIN") {
    throw new Error("User ini tidak bisa diaktifkan dari tabel sementara.");
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { accountStatus: "ACTIVE" },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id,
        entity: "User",
        entityId: userId,
        action: "USER_RESTORED_BY_SUPER_ADMIN",
      },
    }),
  ]);

  revalidatePath("/super-admin");
  revalidatePath("/roles");
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

async function getSuperAdminDashboardData() {
  const month = normalizeReportMonth();
  const { start: monthStart, endExclusive: monthEnd } = getMonthRange(month);

  const [
    studios,
    attendanceGroups,
    outsideRadiusThisMonth,
    pendingRequests,
    recentAttendance,
    managedUsers,
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
    prisma.attendanceRecord.groupBy({
      by: ["status"],
      where: { attendanceDate: { gte: monthStart, lt: monthEnd } },
      _count: { _all: true },
    }),
    prisma.attendanceRecord.count({
      where: {
        attendanceDate: { gte: monthStart, lt: monthEnd },
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
    prisma.user.findMany({
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        memberStatus: true,
        accountStatus: true,
        defaultStudioId: true,
        defaultStudio: {
          select: {
            name: true,
          },
        },
        placements: {
          where: {
            status: "ACTIVE",
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
          select: {
            id: true,
            studioId: true,
            startDate: true,
            studio: {
              select: {
                name: true,
              },
            },
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
    managedUsers,
    studioRows,
    studios,
    monthLabel: formatMonthLabel(month),
  };
}

export default async function SuperAdminDashboardPage() {
  const currentUser = await requireRole("SUPER_ADMIN");

  const data = await getSuperAdminDashboardData();
  const metrics = [
    {
      label: `Jumlah Presensi ${data.monthLabel}`,
      value: data.attendanceSummary.total,
      icon: ClipboardCheck,
      color: "text-blue-700",
    },
    {
      label: `Izin ${data.monthLabel}`,
      value: data.attendanceSummary.permission,
      icon: ShieldMinus,
      color: "text-amber-700",
    },
    {
      label: `Sakit ${data.monthLabel}`,
      value: data.attendanceSummary.sick,
      icon: HeartPulse,
      color: "text-violet-700",
    },
    {
      label: `Terlambat ${data.monthLabel}`,
      value: data.attendanceSummary.late,
      icon: Clock3,
      color: "text-orange-700",
    },
    {
      label: `Tepat Waktu ${data.monthLabel}`,
      value: data.attendanceSummary.onTime,
      icon: CheckCircle2,
      color: "text-emerald-700",
    },
    {
      label: `Alpha ${data.monthLabel}`,
      value: data.attendanceSummary.alpha,
      icon: AlertTriangle,
      color: "text-red-700",
    },
    {
      label: `WFH ${data.monthLabel}`,
      value: data.attendanceSummary.wfh,
      icon: Home,
      color: "text-sky-700",
    },
  ];

  return (
    <DashboardShell
      user={currentUser}
      currentPath="/super-admin"
      badge="Welcome, Super Admin"
      title="Super Admin Dashboard"
      description={`Halo ${currentUser.name}. Halaman ini khusus Owner untuk melihat ringkasan Mahative dan Kipa dalam satu tempat.`}
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

        <section className="grid gap-6 xl:grid-cols-[0.45fr_0.55fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="size-5 text-emerald-700" />
                Tambah User
              </CardTitle>
              <CardDescription>
                Super Admin dapat membuat akun, memberi role, status member,
                default studio, dan placement studio awal.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                action={createManagedUserAction}
                className="grid gap-3 sm:grid-cols-2"
              >
                <div className="flex flex-col gap-2">
                  <label htmlFor="managed-name" className="text-sm font-medium">
                    Nama
                  </label>
                  <Input
                    id="managed-name"
                    name="name"
                    placeholder="Nama user"
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="managed-email"
                    className="text-sm font-medium"
                  >
                    Email
                  </label>
                  <Input
                    id="managed-email"
                    name="email"
                    type="email"
                    placeholder="nama@email.com"
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="managed-password"
                    className="text-sm font-medium"
                  >
                    Password
                  </label>
                  <Input
                    id="managed-password"
                    name="password"
                    type="password"
                    minLength={6}
                    placeholder="Minimal 6 karakter"
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="managed-role" className="text-sm font-medium">
                    Role
                  </label>
                  <select
                    id="managed-role"
                    name="role"
                    className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    defaultValue="MEMBER"
                  >
                    <option value="MEMBER">Member</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="managed-member-status"
                    className="text-sm font-medium"
                  >
                    Status Member
                  </label>
                  <select
                    id="managed-member-status"
                    name="memberStatus"
                    className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    defaultValue="TEAM"
                  >
                    <option value="TEAM">Team</option>
                    <option value="INTERN">Intern</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="managed-studio"
                    className="text-sm font-medium"
                  >
                    Default Studio
                  </label>
                  <select
                    id="managed-studio"
                    name="defaultStudioId"
                    className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    defaultValue=""
                  >
                    <option value="">Belum ada studio</option>
                    {data.studios.map((studio) => (
                      <option key={studio.id} value={studio.id}>
                        {studio.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-2 sm:col-span-2">
                  <label
                    htmlFor="managed-placement-studio"
                    className="text-sm font-medium"
                  >
                    Placement Studio
                  </label>
                  <select
                    id="managed-placement-studio"
                    name="placementStudioId"
                    className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    defaultValue=""
                  >
                    <option value="">Tidak ada placement aktif</option>
                    {data.studios.map((studio) => (
                      <option key={studio.id} value={studio.id}>
                        {studio.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <Button type="submit">
                    <UserPlus aria-hidden="true" />
                    Tambah User
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Manajemen Akun</CardTitle>
              <CardDescription>
                Super Admin mengatur role, status Team/Intern, default studio,
                placement studio, dan status aktif/nonaktif akun.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Default Studio</TableHead>
                    <TableHead>Placement</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.managedUsers.map((user) => {
                    const formId = `update-user-${user.id}`;
                    const isSuperAdmin = user.role === "SUPER_ADMIN";

                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          {isSuperAdmin ? (
                            <span className="font-medium">{user.name}</span>
                          ) : (
                            <Input
                              form={formId}
                              name="name"
                              defaultValue={user.name}
                              className="min-w-36"
                              required
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="min-w-48">
                            <div className="text-sm">{user.email}</div>
                            <div className="text-xs text-zinc-500">
                              {user.placements[0]?.studio.name
                                ? `Placement: ${user.placements[0].studio.name}`
                                : "Tidak ada placement aktif"}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {isSuperAdmin ? (
                            <Badge>{ROLE_LABEL[user.role]}</Badge>
                          ) : (
                            <select
                              form={formId}
                              name="role"
                              className="h-8 min-w-28 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                              defaultValue={user.role}
                            >
                              <option value="MEMBER">Member</option>
                              <option value="ADMIN">Admin</option>
                            </select>
                          )}
                        </TableCell>
                        <TableCell>
                          {isSuperAdmin ? (
                            <Badge
                              variant="secondary"
                              className={accountStatusColor[user.accountStatus]}
                            >
                              {accountStatusLabel[user.accountStatus]}
                            </Badge>
                          ) : (
                            <div className="flex min-w-36 flex-col gap-2">
                              <select
                                form={formId}
                                name="memberStatus"
                                className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                                defaultValue={user.memberStatus}
                              >
                                <option value="TEAM">Team</option>
                                <option value="INTERN">Intern</option>
                              </select>
                              <select
                                form={formId}
                                name="accountStatus"
                                className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                                defaultValue={user.accountStatus}
                              >
                                <option value="ACTIVE">Aktif</option>
                                <option value="INACTIVE">Nonaktif</option>
                                <option value="ARCHIVED">Arsip</option>
                              </select>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {isSuperAdmin ? (
                            <span className="text-sm text-zinc-600">
                              {user.defaultStudio?.name ?? "Belum ada studio"}
                            </span>
                          ) : (
                            <select
                              form={formId}
                              name="defaultStudioId"
                              className="h-8 min-w-40 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                              defaultValue={user.defaultStudioId ?? ""}
                            >
                              <option value="">Belum ada studio</option>
                              {data.studios.map((studio) => (
                                <option key={studio.id} value={studio.id}>
                                  {studio.name}
                                </option>
                              ))}
                            </select>
                          )}
                        </TableCell>
                        <TableCell>
                          {isSuperAdmin ? (
                            <span className="text-sm text-zinc-600">
                              {user.placements[0]?.studio.name ??
                                "Tidak ada placement"}
                            </span>
                          ) : (
                            <select
                              form={formId}
                              name="placementStudioId"
                              className="h-8 min-w-44 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                              defaultValue={user.placements[0]?.studioId ?? ""}
                            >
                              <option value="">Tidak ada placement</option>
                              {data.studios.map((studio) => (
                                <option key={studio.id} value={studio.id}>
                                  {studio.name}
                                </option>
                              ))}
                            </select>
                          )}
                        </TableCell>
                        <TableCell>
                          {isSuperAdmin ? (
                            <span className="inline-flex items-center gap-2 text-xs text-zinc-500">
                              <ShieldCheck className="size-4" />
                              Dikunci
                            </span>
                          ) : (
                            <div className="flex min-w-36 flex-wrap gap-2">
                              <form
                                id={formId}
                                action={updateManagedUserAction}
                              >
                                <input
                                  type="hidden"
                                  name="userId"
                                  value={user.id}
                                />
                                <Button type="submit" size="sm">
                                  <Save aria-hidden="true" />
                                  Simpan
                                </Button>
                              </form>
                              {user.accountStatus === "ARCHIVED" ? (
                                <form action={restoreManagedUserAction}>
                                  <input
                                    type="hidden"
                                    name="userId"
                                    value={user.id}
                                  />
                                  <Button
                                    type="submit"
                                    size="sm"
                                    variant="outline"
                                  >
                                    <RotateCcw aria-hidden="true" />
                                    Aktifkan
                                  </Button>
                                </form>
                              ) : (
                                <form action={archiveManagedUserAction}>
                                  <input
                                    type="hidden"
                                    name="userId"
                                    value={user.id}
                                  />
                                  <Button
                                    type="submit"
                                    size="sm"
                                    variant="outline"
                                  >
                                    <Archive aria-hidden="true" />
                                    Arsipkan
                                  </Button>
                                </form>
                              )}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
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
    </DashboardShell>
  );
}
