import { Archive, Clock, User, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardShell } from "@/components/dashboard-shell";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Input } from "@/components/ui/input";
import { AuditLogsTableClient } from "./audit-logs-table-client";

export const dynamic = "force-dynamic";

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ actorId?: string; entity?: string; search?: string }>;
}) {
  const [user, params] = await Promise.all([
    requireRole("SUPER_ADMIN"),
    searchParams,
  ]);

  const filterActorId = params.actorId || "";
  const filterEntity = params.entity || "";
  const filterSearch = params.search || "";

  // Query logs with filters
  const logs = await prisma.auditLog.findMany({
    where: {
      ...(filterActorId ? { actorId: filterActorId } : {}),
      ...(filterEntity ? { entity: filterEntity } : {}),
      ...(filterSearch
        ? {
            OR: [
              { action: { contains: filterSearch, mode: "insensitive" } },
              { entity: { contains: filterSearch, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      actor: { select: { name: true, email: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  // Query unique entities for filter dropdown
  const uniqueEntitiesGroup = await prisma.auditLog.groupBy({
    by: ["entity"],
  });
  const entities = uniqueEntitiesGroup.map((g) => g.entity);

  // Query active admins for filter dropdown
  const actors = await prisma.user.findMany({
    where: {
      role: { in: ["SUPER_ADMIN", "ADMIN"] },
      accountStatus: "ACTIVE",
    },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  return (
    <DashboardShell
      user={user}
      currentPath="/super-admin/audit-logs"
      badge="Audit Trail"
      title="Administrator Audit Log"
      description="Monitor important action history performed by Admin and Super Admin."
    >
      <div className="space-y-6">
        {/* Info Banner */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 dark:bg-primary/10 p-4 text-sm text-zinc-900 dark:text-zinc-100 flex items-start gap-3">
          <Clock className="size-5 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
              What is Audit Trail?
            </p>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Audit Trail automatically records every crucial action performed by Owner/Super Admin and Admin (such as studio work schedule changes, leave/sick approvals, new account creations, or picket assignments). This system ensures full transparency, policy compliance, and security of Kolega attendance data.
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card className="shadow-none">
          <CardContent className="pt-6">
            <form className="grid gap-4 sm:grid-cols-4 items-end">
              <div className="grid gap-1.5">
                <label htmlFor="actor-select" className="text-sm font-semibold flex items-center gap-1.5">
                  <User className="size-4 text-zinc-500" />
                  Actor
                </label>
                <select
                  id="actor-select"
                  name="actorId"
                  defaultValue={filterActorId}
                  className="h-9 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 px-3 text-sm focus:outline-none"
                >
                  <option value="">All Actors</option>
                  {actors.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-1.5">
                <label htmlFor="entity-select" className="text-sm font-semibold flex items-center gap-1.5">
                  <Archive className="size-4 text-zinc-500" />
                  Entity
                </label>
                <select
                  id="entity-select"
                  name="entity"
                  defaultValue={filterEntity}
                  className="h-9 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 px-3 text-sm focus:outline-none"
                >
                  <option value="">All Entities</option>
                  {entities.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-1.5">
                <label htmlFor="search-input" className="text-sm font-semibold flex items-center gap-1.5">
                  <Search className="size-4 text-zinc-500" />
                  Search
                </label>
                <Input
                  id="search-input"
                  name="search"
                  placeholder="Action..."
                  defaultValue={filterSearch}
                  className="h-9"
                />
              </div>

              <Button type="submit" className="w-full">
                <Filter className="size-4 mr-1.5" />
                Filter Logs
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="size-5 text-blue-700" />
              Action History ({logs.length} logs)
            </CardTitle>
            <CardDescription>Displaying up to 200 latest action logs.</CardDescription>
          </CardHeader>
          <CardContent>
            <AuditLogsTableClient logs={logs} />
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
