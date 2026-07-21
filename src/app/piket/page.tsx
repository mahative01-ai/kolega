import { CalendarRange } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { dateOnlyFromKey, getJakartaDateKey } from "@/lib/attendance-time";
import { PicketBoardClient } from "./picket-board-client";

export const dynamic = "force-dynamic";

export default async function PicketPage({
  searchParams,
}: {
  searchParams: Promise<{ studioId?: string }>;
}) {
  const [user, params] = await Promise.all([getCurrentUser(), searchParams]);

  if (!user) redirect("/login");

  const isSuperAdmin = user.role === "SUPER_ADMIN";
  const isAdmin = user.role === "ADMIN";
  const isManager = isSuperAdmin || isAdmin;

  const todayKey = getJakartaDateKey(new Date());
  const todayDate = dateOnlyFromKey(todayKey);

  // Ambil daftar studio aktif
  const studios = await prisma.studio.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  // Filter studio default untuk Admin/Owner
  const filterStudioId = isSuperAdmin
    ? params.studioId || (studios[0]?.id ?? "")
    : user.defaultStudioId ?? "__none__";

  const members = await prisma.user.findMany({
    where: {
      accountStatus: "ACTIVE",
      role: { not: "SUPER_ADMIN" },
      ...(filterStudioId ? { defaultStudioId: filterStudioId } : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      memberStatus: true,
      picketDay: true,
      defaultStudioId: true,
      defaultStudio: {
        select: {
          id: true,
          name: true,
        },
      },
      attendanceRecords: {
        where: {
          attendanceDate: todayDate,
        },
        select: {
          mood: true,
        },
        take: 1,
      },
    },
    orderBy: { name: "asc" },
  });

  const mappedMembers = members.map((m) => ({
    ...m,
    currentMood: m.attendanceRecords[0]?.mood ?? "NEUTRAL",
  }));

  return (
    <DashboardShell
      user={user}
      currentPath="/piket"
      badge="Picket"
      title="Studio Picket Board"
      description="View and manage weekly routine picket duty schedules."
    >
      <div className="space-y-6">
        {/* Tabs Studio (Only for Super Admin) */}
        {isSuperAdmin && studios.length > 0 && (
          <div className="flex border-b border-zinc-200 dark:border-zinc-800">
            {studios.map((s) => (
              <Link
                key={s.id}
                href={`?studioId=${s.id}`}
                className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-all ${
                  filterStudioId === s.id
                    ? "border-blue-700 text-blue-700 dark:border-blue-400 dark:text-blue-400"
                    : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                {s.name}
              </Link>
            ))}
          </div>
        )}

        {/* 📅 SECTION 1: Weekly Picket Board */}
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50 mb-3 flex items-center gap-2">
            <CalendarRange className="size-5 text-blue-700 dark:text-blue-400" />
            Weekly Routine Picket Schedule
          </h2>
          <PicketBoardClient members={mappedMembers} isManager={isManager} />
        </div>
      </div>
    </DashboardShell>
  );
}
