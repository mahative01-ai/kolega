import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/dashboard-shell";
import { StudiosClient } from "./studios-client";

export const dynamic = "force-dynamic";

export default async function StudiosPage() {
  const currentUser = await requireRole("SUPER_ADMIN");

  const studios = await prisma.studio.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <DashboardShell
      user={currentUser}
      currentPath="/super-admin/studios"
      badge="Super Admin"
      title="Studio & Location Management"
      description="Register new branch studios, modify geofence coordinates, radius, and active status globally."
    >
      <StudiosClient initialStudios={studios} />
    </DashboardShell>
  );
}
