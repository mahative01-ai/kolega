import { DashboardShell } from "@/components/dashboard-shell";
import { prisma } from "@/lib/prisma";
import { requireAnyRole } from "@/lib/auth";
import { ensureAnnualLeaveForActiveTeams } from "@/lib/annual-leave";
import { dateOnlyFromKey, getJakartaDateKey } from "@/lib/attendance-time";
import { RolesClient } from "./roles-client";

export const dynamic = "force-dynamic";

async function getRoleData(actor: Awaited<ReturnType<typeof requireAnyRole>>) {
  await ensureAnnualLeaveForActiveTeams();

  const isSuperAdmin = actor.role === "SUPER_ADMIN";
  const todayKey = getJakartaDateKey(new Date());
  const todayDate = dateOnlyFromKey(todayKey);

  const scopedWhere = isSuperAdmin
    ? {
        role: {
          not: "SUPER_ADMIN" as const,
        },
      }
    : {
        role: {
          not: "SUPER_ADMIN" as const,
        },
        OR: [
          { defaultStudioId: actor.defaultStudioId ?? "__NO_STUDIO__" },
          { placements: { some: { studioId: actor.defaultStudioId ?? "__NO_STUDIO__", status: "ACTIVE" as const } } }
        ]
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
        annualLeaveBalance: true,
        workDayBalance: true,
        defaultStudioId: true,
        picketDay: true,
        currentMood: true,
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
        attendanceRecords: {
          orderBy: [{ attendanceDate: "desc" }, { createdAt: "desc" }],
          take: 120,
          select: {
            id: true,
            attendanceDate: true,
            workMode: true,
            status: true,
            checkInAt: true,
            checkOutAt: true,
            lateMinutes: true,
            mood: true,
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
      : actor.defaultStudioId
        ? prisma.studio.findMany({
            where: { id: actor.defaultStudioId, isActive: true },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
    isSuperAdmin
      ? prisma.user.findMany({
          where: {
            accountStatus: "ACTIVE",
            OR: [
              { role: "ADMIN" },
              { role: "MEMBER", memberStatus: "TEAM" },
            ],
          },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : actor.defaultStudioId
        ? prisma.user.findMany({
            where: {
              accountStatus: "ACTIVE",
              defaultStudioId: actor.defaultStudioId,
              OR: [
                { role: "ADMIN" },
                { role: "MEMBER", memberStatus: "TEAM" },
              ],
            },
            select: { id: true, name: true },
            orderBy: { name: "asc" },
          })
        : Promise.resolve([]),
  ]);

  const mappedUsers = users.map((u) => {
    const todayAtt = u.attendanceRecords.find(
      (r) => r.attendanceDate.getTime() === todayDate.getTime()
    );
    return {
      ...u,
      currentMood: todayAtt?.mood ?? "NEUTRAL",
    };
  });

  return {
    users: mappedUsers,
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
      badge={canEditRoles ? "User Management" : "View Only"}
      title={canEditRoles ? "Users and Roles" : "Studio Users"}
      description={
        canEditRoles
          ? "Super Admin manages Mahative and Kipa members by studio, member type, placement, and account status."
          : `Admin can only view active users in ${currentUser.defaultStudio?.name ?? "their own studio"}. Account changes are controlled by Super Admin.`
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
