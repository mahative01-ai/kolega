import { Archive, Clock, ShieldAlert, User, Search, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardShell } from "@/components/dashboard-shell";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";

const TZ = "Asia/Jakarta";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: TZ,
  }).format(date);
}

// Entity & Action styling configs
const ACTION_COLORS: Record<string, string> = {
  PICKET_ASSIGNED: "bg-blue-100 text-blue-700",
  PICKET_DELETED: "bg-red-100 text-red-700",
  USER_CREATED_BY_SUPER_ADMIN: "bg-emerald-100 text-emerald-700",
  USER_UPDATED_BY_SUPER_ADMIN: "bg-amber-100 text-amber-700",
  ACCOUNT_STATUS_APPROVED_BY_SUPER_ADMIN: "bg-green-100 text-green-700",
  REQUEST_APPROVED: "bg-emerald-100 text-emerald-700",
  REQUEST_REJECTED: "bg-red-100 text-red-700",
  CORRECTION_APPROVED: "bg-emerald-100 text-emerald-700",
  CORRECTION_REJECTED: "bg-red-100 text-red-700",
  WEEKLY_WORK_RULE_UPSERTED: "bg-violet-100 text-violet-700",
  STUDIO_WEEK_START_UPDATED: "bg-teal-100 text-teal-700",
};

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
      title="Audit Log Administrator"
      description="Pantau riwayat aksi penting yang dilakukan oleh Admin dan Super Admin."
    >
      <div className="space-y-6">
        {/* Info Banner */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 dark:bg-primary/10 p-4 text-sm text-zinc-900 dark:text-zinc-100 flex items-start gap-3">
          <Clock className="size-5 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
              Apa itu Audit Trail?
            </p>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Jejak audit (Audit Trail) otomatis merekam setiap aksi krusial yang dilakukan oleh Owner/Super Admin dan Admin (seperti perubahan jadwal kerja studio, persetujuan izin/sakit, pembuatan akun baru, atau penugasan piket). Sistem ini menjamin transparansi penuh, kepatuhan kebijakan, dan keamanan data presensi Kolega.
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
                  Aktor
                </label>
                <select
                  id="actor-select"
                  name="actorId"
                  defaultValue={filterActorId}
                  className="h-9 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 px-3 text-sm focus:outline-none"
                >
                  <option value="">Semua Aktor</option>
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
                  Entitas
                </label>
                <select
                  id="entity-select"
                  name="entity"
                  defaultValue={filterEntity}
                  className="h-9 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 px-3 text-sm focus:outline-none"
                >
                  <option value="">Semua Entitas</option>
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
                  Pencarian
                </label>
                <Input
                  id="search-input"
                  name="search"
                  placeholder="Aksi..."
                  defaultValue={filterSearch}
                  className="h-9"
                />
              </div>

              <Button type="submit" className="w-full">
                <Filter className="size-4 mr-1.5" />
                Filter Log
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="size-5 text-blue-700" />
              Riwayat Tindakan ({logs.length} log)
            </CardTitle>
            <CardDescription>Menampilkan maksimal 200 log tindakan terbaru.</CardDescription>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-500">
                <ShieldAlert className="size-10 text-zinc-300 mb-2" />
                <p className="text-sm font-semibold">Tidak Ada Log</p>
                <p className="text-xs text-zinc-400 mt-1">Tidak ada catatan audit log yang cocok dengan filter saat ini.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                      <th className="p-3 font-semibold text-zinc-700 dark:text-zinc-300">Waktu (WIB)</th>
                      <th className="p-3 font-semibold text-zinc-700 dark:text-zinc-300">Aktor</th>
                      <th className="p-3 font-semibold text-zinc-700 dark:text-zinc-300">Entitas</th>
                      <th className="p-3 font-semibold text-zinc-700 dark:text-zinc-300">Tindakan</th>
                      <th className="p-3 font-semibold text-zinc-700 dark:text-zinc-300">Metadata</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {logs.map((log) => {
                      const badgeColor = ACTION_COLORS[log.action] ?? "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300";
                      return (
                        <tr key={log.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                          <td className="p-3 whitespace-nowrap text-zinc-600 dark:text-zinc-400 font-medium">
                            {formatDate(log.createdAt)}
                          </td>
                          <td className="p-3">
                            <div className="font-semibold text-zinc-900 dark:text-zinc-100">{log.actor?.name || "Sistem"}</div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400">{log.actor?.email || "system@kolega.com"}</div>
                            {log.actor?.role && (
                              <Badge className="mt-1 text-[9px] px-1 py-0 border-0 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">
                                {log.actor.role}
                              </Badge>
                            )}
                          </td>
                          <td className="p-3 font-mono text-xs text-zinc-700 dark:text-zinc-300">
                            <div>{log.entity}</div>
                            {log.entityId && <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">{log.entityId}</div>}
                          </td>
                          <td className="p-3">
                            <Badge className={`text-xs px-2 py-0.5 font-semibold border-0 ${badgeColor}`}>
                              {log.action}
                            </Badge>
                          </td>
                          <td className="p-3 max-w-xs">
                            {log.metadata ? (
                              <pre className="text-[10px] bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 text-zinc-800 dark:text-zinc-300 rounded p-1.5 overflow-x-auto leading-relaxed max-h-24">
                                {JSON.stringify(log.metadata, null, 2)}
                              </pre>
                            ) : (
                              <span className="text-zinc-400 italic text-xs">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
