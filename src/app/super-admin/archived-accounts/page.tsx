import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/dashboard-shell";
import { ArchivedAccountsClient } from "./archived-accounts-client";

export const dynamic = "force-dynamic";

export default async function ArchivedAccountsPage() {
  const currentUser = await requireRole("SUPER_ADMIN");

  const archivedUsers = await prisma.user.findMany({
    where: { accountStatus: "ARCHIVED" },
    include: {
      defaultStudio: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <DashboardShell
      user={currentUser}
      currentPath="/super-admin/archived-accounts"
      badge="Super Admin"
      title="Archived Accounts Management"
      description="List of deactivated archived accounts. You can restore their accounts back to active status if needed."
    >
      <ArchivedAccountsClient initialUsers={archivedUsers} />
    </DashboardShell>
  );
}
