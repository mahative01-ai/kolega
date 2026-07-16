"use client";

import React, { useMemo, useState } from "react";
import { ArrowUpDown, ShieldAlert, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type AuditLogItem = {
  id: string;
  createdAt: Date;
  actorId: string | null;
  actor: {
    name: string;
    email: string;
    role: string;
  } | null;
  entity: string;
  entityId: string | null;
  action: string;
  metadata: unknown | null;
};

type Props = {
  logs: AuditLogItem[];
};

const TZ = "Asia/Jakarta";

function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: TZ,
  }).format(new Date(date));
}

const ACTION_COLORS: Record<string, string> = {
  PICKET_ASSIGNED: "bg-blue-150 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
  PICKET_DELETED: "bg-red-150 text-red-800 dark:bg-red-950/40 dark:text-red-300",
  USER_CREATED_BY_SUPER_ADMIN: "bg-emerald-150 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  USER_UPDATED_BY_SUPER_ADMIN: "bg-amber-150 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  ACCOUNT_STATUS_APPROVED_BY_SUPER_ADMIN: "bg-green-150 text-green-800 dark:bg-green-950/40 dark:text-green-300",
  REQUEST_APPROVED: "bg-emerald-150 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  REQUEST_REJECTED: "bg-red-150 text-red-800 dark:bg-red-950/40 dark:text-red-300",
  CORRECTION_APPROVED: "bg-emerald-150 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  CORRECTION_REJECTED: "bg-red-150 text-red-800 dark:bg-red-950/40 dark:text-red-300",
  WEEKLY_WORK_RULE_UPSERTED: "bg-violet-150 text-violet-800 dark:bg-violet-950/40 dark:text-violet-300",
  STUDIO_WEEK_START_UPDATED: "bg-teal-150 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300",
};

export function AuditLogsTableClient({ logs }: Props) {
  const [sortField, setSortField] = useState<string>("createdAt");
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const sortedLogs = useMemo(() => {
    return [...logs].sort((a, b) => {
      let aVal: string | number = "";
      let bVal: string | number = "";

      if (sortField === "createdAt") {
        aVal = new Date(a.createdAt).getTime();
        bVal = new Date(b.createdAt).getTime();
      } else if (sortField === "actor") {
        aVal = (a.actor?.name ?? "Sistem").toLowerCase();
        bVal = (b.actor?.name ?? "Sistem").toLowerCase();
      } else if (sortField === "entity") {
        aVal = a.entity.toLowerCase();
        bVal = b.entity.toLowerCase();
      } else if (sortField === "action") {
        aVal = a.action.toLowerCase();
        bVal = b.action.toLowerCase();
      }

      if (aVal < bVal) return sortAsc ? -1 : 1;
      if (aVal > bVal) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [logs, sortField, sortAsc]);

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-500">
        <ShieldAlert className="size-10 text-zinc-300 mb-2" />
        <p className="text-sm font-semibold">Tidak Ada Log</p>
        <p className="text-xs text-zinc-400 mt-1">Tidak ada catatan audit log yang cocok dengan filter saat ini.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-950">
      <div className="overflow-x-auto">
        <Table className="w-full table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead onClick={() => handleSort("createdAt")} className="w-[170px] cursor-pointer select-none hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                <div className="flex items-center gap-1 whitespace-nowrap">
                  Waktu (WIB) <ArrowUpDown className="size-3 text-zinc-400" />
                </div>
              </TableHead>
              <TableHead onClick={() => handleSort("actor")} className="w-[200px] cursor-pointer select-none hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                <div className="flex items-center gap-1">
                  Aktor <ArrowUpDown className="size-3 text-zinc-400" />
                </div>
              </TableHead>
              <TableHead onClick={() => handleSort("entity")} className="w-[180px] cursor-pointer select-none hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                <div className="flex items-center gap-1">
                  Entitas <ArrowUpDown className="size-3 text-zinc-400" />
                </div>
              </TableHead>
              <TableHead onClick={() => handleSort("action")} className="w-[200px] cursor-pointer select-none hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                <div className="flex items-center gap-1">
                  Tindakan <ArrowUpDown className="size-3 text-zinc-400" />
                </div>
              </TableHead>
              <TableHead className="w-[280px]">Metadata</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedLogs.map((log) => {
              const badgeColor = ACTION_COLORS[log.action] ?? "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300";
              return (
                <TableRow key={log.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                  <TableCell className="w-[170px] whitespace-nowrap text-xs text-zinc-650 dark:text-zinc-400 font-mono">
                    {formatDate(log.createdAt)}
                  </TableCell>
                  <TableCell className="w-[200px] overflow-hidden">
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs truncate" title={log.actor?.name || "Sistem"}>{log.actor?.name || "Sistem"}</div>
                    <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate w-full" title={log.actor?.email || "system@kolega.com"}>{log.actor?.email || "system@kolega.com"}</div>
                    {log.actor?.role && (
                      <Badge className="mt-1 text-[9px] px-1 py-0 border-0 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">
                        {log.actor.role}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="w-[180px] font-mono text-xs text-zinc-700 dark:text-zinc-300 overflow-hidden">
                    <div className="font-medium text-xs text-zinc-900 dark:text-zinc-200 truncate" title={log.entity}>{log.entity}</div>
                    {log.entityId && (
                      <div className="text-[9px] text-zinc-450 dark:text-zinc-500 mt-0.5 break-all w-full truncate" title={log.entityId}>
                        ID: {log.entityId}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="w-[200px] overflow-hidden">
                    <Badge className={`text-[10px] px-2 py-0.5 font-semibold border-0 truncate max-w-full ${badgeColor}`} title={log.action}>
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="w-[280px] overflow-hidden">
                    {log.metadata ? (
                      <div className="flex items-center gap-2">
                        <div className="text-[10px] bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-150 dark:border-zinc-800 text-zinc-850 dark:text-zinc-300 rounded p-1.5 overflow-hidden font-mono truncate w-[220px]">
                          {JSON.stringify(log.metadata)}
                        </div>
                        <Dialog>
                          <DialogTrigger className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-900" title="Lihat metadata lengkap">
                            <Eye className="size-3.5 text-zinc-500 hover:text-zinc-950" />
                          </DialogTrigger>
                          <DialogContent className="max-w-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-sans">
                            <DialogHeader>
                              <DialogTitle className="text-sm">Metadata Audit Log</DialogTitle>
                            </DialogHeader>
                            <div className="py-2">
                              <pre className="text-xs bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-300 rounded p-3 overflow-auto max-h-[350px] leading-relaxed">
                                {JSON.stringify(log.metadata, null, 2)}
                              </pre>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    ) : (
                      <span className="text-zinc-400 italic text-xs">-</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
