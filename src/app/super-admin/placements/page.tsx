import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/dashboard-shell";
import { PlacementsClient } from "./placements-client";

export const dynamic = "force-dynamic";

export default async function PlacementsPage() {
  const currentUser = await requireRole("SUPER_ADMIN");

  const [placements, users, studios] = await Promise.all([
    prisma.placement.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
        studio: { select: { id: true, name: true } },
      },
    }),
    prisma.user.findMany({
      where: {
        accountStatus: "ACTIVE",
        role: { in: ["MEMBER", "ADMIN"] },
      },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    prisma.studio.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <DashboardShell
      user={currentUser}
      currentPath="/super-admin/placements"
      badge="Super Admin"
      title="Manajemen Placement (Penempatan)"
      description="Tempatkan staf atau anak magang ke studio penugasan cabang tertentu untuk memvalidasi lokasi check-in WFO mereka."
    >
      <PlacementsClient
        initialPlacements={placements}
        users={users}
        studios={studios}
      />
    </DashboardShell>
  );
}
