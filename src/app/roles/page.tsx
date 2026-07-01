import { DashboardShell } from "@/components/dashboard-shell";
import { prisma } from "@/lib/prisma";
import { requireAnyRole } from "@/lib/auth";
import { RolesClient } from "./roles-client";

export const dynamic = "force-dynamic";

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

  const [users, studios, mentors] = await Promise.all([
    prisma.user.findMany({
      where: scopedWhere,
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        birthDate: true,
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
        internProfile: {
          select: {
            program: true,
            institution: true,
            startDate: true,
            endDate: true,
            mentorId: true,
          },
        },
      },
    }),
    isSuperAdmin
      ? prisma.studio.findMany({
          where: { isActive: true },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    isSuperAdmin
      ? prisma.user.findMany({
          where: {
            role: { in: ["ADMIN", "SUPER_ADMIN"] },
            accountStatus: "ACTIVE",
          },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  return {
    users,
    studios,
    mentors,
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
      <RolesClient
        currentUser={currentUser}
        users={data.users as unknown as Parameters<typeof RolesClient>[0]["users"]}
        studios={data.studios}
        mentors={data.mentors}
      />
    </DashboardShell>
  );
}
