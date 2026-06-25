import { revalidatePath } from "next/cache";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, UserCog } from "lucide-react";
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
import { prisma } from "@/lib/prisma";
import {
  canAssignRole,
  canManageTargetRole,
  REGISTRATION_DEFAULT_ROLE,
  ROLE_LABEL,
} from "@/lib/roles";
import { requireUser } from "@/lib/auth";
import { logoutAction } from "../login/actions";

export const dynamic = "force-dynamic";

async function updateUserRole(formData: FormData) {
  "use server";

  const userId = String(formData.get("userId") ?? "");
  const nextRole = String(formData.get("nextRole") ?? "");

  const actor = await requireUser();

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });

  if (!target) {
    throw new Error("User tidak ditemukan.");
  }

  if (
    !canAssignRole(actor.role, nextRole) ||
    !canManageTargetRole(actor.role, target.role)
  ) {
    throw new Error("Role ini tidak bisa diubah dari halaman role MVP.");
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
  revalidatePath("/");
}

async function getRoleData() {
  const [users, roleCounts] = await Promise.all([
    prisma.user.findMany({
      where: {
        accountStatus: "ACTIVE",
      },
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        memberStatus: true,
        defaultStudio: {
          select: {
            name: true,
          },
        },
      },
    }),
    prisma.user.groupBy({
      by: ["role"],
      where: {
        accountStatus: "ACTIVE",
      },
      _count: {
        role: true,
      },
    }),
  ]);

  return {
    users,
    roleCounts: Object.fromEntries(
      roleCounts.map((item) => [item.role, item._count.role])
    ),
  };
}

export default async function RolesPage() {
  const [currentUser, data] = await Promise.all([requireUser(), getRoleData()]);
  const canManageRoles =
    currentUser.role === "ADMIN" || currentUser.role === "SUPER_ADMIN";

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-zinc-200 pb-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-3">
              <Link
                href="/"
                className={buttonVariants({
                  variant: "ghost",
                  className: "px-0",
                })}
              >
                <ArrowLeft aria-hidden="true" />
                Dashboard
              </Link>
            </div>
            <Badge variant="outline" className="mb-3 bg-white">
              Role MVP
            </Badge>
            <h1 className="text-2xl font-semibold">Role dan Akses</h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-600">
              Super Admin dibuat manual lewat seed/sistem. Registrasi publik
              nanti hanya membuat role {ROLE_LABEL[REGISTRATION_DEFAULT_ROLE]}.
              Role Admin dapat diberikan kepada Member dari halaman ini.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-3 gap-2 text-center">
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
            </div>
            <form action={logoutAction} className="self-end">
              <Button type="submit" variant="ghost">
                Logout
              </Button>
            </form>
          </div>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="size-5 text-blue-700" />
              Daftar User Aktif
            </CardTitle>
            <CardDescription>
              Role Admin diberikan kepada Member oleh user yang sedang login.
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
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.users.map((user) => {
                  const isSuperAdmin = user.role === "SUPER_ADMIN";

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
                          variant={isSuperAdmin ? "default" : "secondary"}
                          className={
                            user.role === "ADMIN"
                              ? "bg-blue-100 text-blue-800"
                              : ""
                          }
                        >
                          {ROLE_LABEL[user.role]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {isSuperAdmin ? (
                          <span className="inline-flex items-center gap-2 text-xs text-zinc-500">
                            <ShieldCheck className="size-4" />
                            Manual sistem
                          </span>
                        ) : canManageRoles ? (
                          <form action={updateUserRole}>
                            <input
                              type="hidden"
                              name="userId"
                              value={user.id}
                            />
                            <input
                              type="hidden"
                              name="nextRole"
                              value={user.role === "ADMIN" ? "MEMBER" : "ADMIN"}
                            />
                            <Button size="sm" variant="outline">
                              {user.role === "ADMIN"
                                ? "Jadikan Member"
                                : "Jadikan Admin"}
                            </Button>
                          </form>
                        ) : (
                          <span className="text-xs text-zinc-500">
                            Tidak ada akses
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
