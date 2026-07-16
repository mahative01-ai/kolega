import { CalendarRange } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
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
      ...(filterStudioId && filterStudioId !== "all" ? { defaultStudioId: filterStudioId } : {}),
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
      currentMood: true,
    },
    orderBy: { name: "asc" },
  });

  return (
    <DashboardShell
      user={user}
      currentPath="/piket"
      badge="Piket"
      title="Papan Piket Studio"
      description="Lihat dan kelola pembagian tugas piket rutin mingguan."
    >
      <div className="space-y-6">
        {/* Tabs Studio (Hanya untuk Super Admin) */}
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
            <Link
              href="?studioId=all"
              className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-all ${
                filterStudioId === "all"
                  ? "border-blue-700 text-blue-700 dark:border-blue-400 dark:text-blue-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              Semua
            </Link>
          </div>
        )}

        {/* 📅 SECTION 1: Weekly Picket Board */}
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50 mb-3 flex items-center gap-2">
            <CalendarRange className="size-5 text-blue-700 dark:text-blue-400" />
            Jadwal Piket Rutin Mingguan
          </h2>
          <PicketBoardClient members={members} isManager={isManager} />
        </div>
      </div>
    </DashboardShell>
  );
}
