import { revalidatePath } from "next/cache";
import { Archive, RotateCcw, Save, ShieldCheck, UserCog, UserPlus, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DashboardShell } from "@/components/dashboard-shell";
import { prisma } from "@/lib/prisma";
import {
  canAssignRole,
  canManageTargetRole,
  REGISTRATION_DEFAULT_ROLE,
  ROLE_LABEL,
} from "@/lib/roles";
import { getDashboardPath, hashPassword, requireAnyRole, requireRole } from "@/lib/auth";
import { dateOnly } from "@/lib/calendar";

export const dynamic = "force-dynamic";

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
    throw new Error("User ini tidak bisa diubah.");
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
    throw new Error("User ini tidak bisa diaktifkan.");
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

async function updateUserRole(formData: FormData) {
  "use server";

  const userId = String(formData.get("userId") ?? "");
  const nextRole = String(formData.get("nextRole") ?? "");

  const actor = await requireRole("SUPER_ADMIN");

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });

  if (!target) {
    throw new Error("User tidak ditemukan.");
  }

  if (target.id === actor.id) {
    throw new Error("Role sendiri tidak bisa diubah dari halaman ini.");
  }

  if (
    !canAssignRole(actor.role, nextRole) ||
    !canManageTargetRole(actor.role, target.role)
  ) {
    throw new Error("Role ini tidak bisa diubah.");
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { role: nextRole === "ADMIN" ? "ADMIN" : "MEMBER" },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id,
        entity: "User",
        entityId: userId,
        action: "ROLE_UPDATED",
        metadata: {
          previousRole: target.role,
          nextRole,
        },
      },
    }),
  ]);

  revalidatePath("/roles");
  revalidatePath(getDashboardPath(actor.role));
}

async function getRoleData(actor: Awaited<ReturnType<typeof requireAnyRole>>) {
  const isSuperAdmin = actor.role === "SUPER_ADMIN";
  const scopedWhere = isSuperAdmin
    ? {}
    : {
        accountStatus: "ACTIVE" as const,
        defaultStudioId: actor.defaultStudioId ?? "__NO_STUDIO__",
        role: {
          not: "SUPER_ADMIN" as const,
        },
      };

  const [users, roleCounts, studios] = await Promise.all([
    prisma.user.findMany({
      where: scopedWhere,
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
    prisma.user.groupBy({
      by: ["role"],
      where: isSuperAdmin ? { accountStatus: "ACTIVE" } : scopedWhere,
      _count: {
        role: true,
      },
    }),
    isSuperAdmin
      ? prisma.studio.findMany({
          where: { isActive: true },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
  ]);

  return {
    users,
    roleCounts: Object.fromEntries(
      roleCounts.map((item) => [item.role, item._count.role])
    ),
    studios,
  };
}

export default async function RolesPage() {
  const currentUser = await requireAnyRole(["SUPER_ADMIN", "ADMIN"]);
  const data = await getRoleData(currentUser);
  const canEditRoles = currentUser.role === "SUPER_ADMIN";

  return (
    <DashboardShell
      user={currentUser}
      currentPath="/roles"
      badge={canEditRoles ? "Manajemen User" : "View Only"}
      title={canEditRoles ? "User dan Role" : "User Studio"}
      description={
        canEditRoles
          ? `Super Admin mengatur semua akun, role, default studio, placement studio, dan tambah user.`
          : `Admin hanya melihat user aktif di studio ${currentUser.defaultStudio?.name ?? "yang sama"}. Perubahan akun hanya bisa dilakukan Super Admin.`
      }
    >
      <section className="grid gap-3 text-center sm:grid-cols-3">
        <Card>
          <CardHeader className="p-3">
            <CardDescription>Super Admin</CardDescription>
            <CardTitle>{data.roleCounts.SUPER_ADMIN ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="p-3">
            <CardDescription>Admin</CardDescription>
            <CardTitle>{data.roleCounts.ADMIN ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="p-3">
            <CardDescription>Member</CardDescription>
            <CardTitle>{data.roleCounts.MEMBER ?? 0}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      {canEditRoles ? (
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
                  {data.users.map((user) => {
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
                              className={accountStatusColor[user.accountStatus ?? "ACTIVE"]}
                            >
                              {accountStatusLabel[user.accountStatus ?? "ACTIVE"]}
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
                                defaultValue={user.accountStatus ?? "ACTIVE"}
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
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="size-5 text-blue-700" />
              Daftar User Aktif
            </CardTitle>
            <CardDescription>
              Admin hanya dapat melihat daftar user di studio sendiri.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Studio</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.users.map((user) => {
                  const isSystemSuperAdmin = user.role === "SUPER_ADMIN";

                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        <div>{user.name}</div>
                        <div className="text-xs text-zinc-500">
                          {user.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.defaultStudio?.name ?? "Belum ada studio"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{user.memberStatus}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={isSystemSuperAdmin ? "default" : "secondary"}
                          className={
                            user.role === "ADMIN"
                              ? "bg-blue-100 text-blue-800"
                              : ""
                          }
                        >
                          {ROLE_LABEL[user.role]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </DashboardShell>
  );
}
