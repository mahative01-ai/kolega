"use client";

import { Fragment, useState } from "react";
import { TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, BookOpen, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type SerializedRecord = {
  id: string;
  attendanceDate: string;
  workMode: string;
  status: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  lateMinutes: number;
  earlyCheckoutMinutes: number;
  wfhPlan?: string | null;
  wfhReport?: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  ownerStudio: {
    name: string;
  };
  locationStudio: {
    name: string;
  } | null;
};

type Props = {
  records: SerializedRecord[];
  statusColor: Record<string, string>;
  statusLabel: Record<string, string>;
};

function formatTime(dateStr: string | null) {
  if (!dateStr) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(dateStr));
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(dateStr));
}

export function AttendanceTableBodyClient({ records, statusColor, statusLabel }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  if (records.length === 0) {
    return (
      <TableBody>
        <TableRow>
          <TableCell colSpan={9} className="h-24 text-center text-sm text-zinc-500">
            Tidak ada data presensi untuk filter ini.
          </TableCell>
        </TableRow>
      </TableBody>
    );
  }

  return (
    <TableBody>
      {records.map((record) => {
        const isWfh = record.workMode === "WFH";
        const hasDetails = isWfh && (!!record.wfhPlan || !!record.wfhReport);
        const isExpanded = expandedId === record.id;

        return (
          <Fragment key={record.id}>
            <TableRow className={cn(isExpanded && "bg-zinc-50/50 dark:bg-zinc-900/10")}>
              <TableCell className="font-medium">
                <div>{record.user.name}</div>
                <div className="text-xs font-normal text-zinc-500">{record.user.email}</div>
              </TableCell>
              <TableCell>{formatDate(record.attendanceDate)}</TableCell>
              <TableCell>{record.ownerStudio.name}</TableCell>
              <TableCell>{record.locationStudio?.name ?? "Tidak perlu lokasi"}</TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-300">
                    {record.workMode}
                  </Badge>
                  {hasDetails && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-5 rounded p-0 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                      onClick={() => toggleExpand(record.id)}
                      title="Lihat Detail Kerja WFH"
                    >
                      {isExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                    </Button>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className={statusColor[record.status]}>
                  {statusLabel[record.status] ?? record.status}
                </Badge>
              </TableCell>
              <TableCell>{formatTime(record.checkInAt)}</TableCell>
              <TableCell>{formatTime(record.checkOutAt)}</TableCell>
              <TableCell>{record.lateMinutes > 0 ? `${record.lateMinutes} menit` : "-"}</TableCell>
              <TableCell>{record.earlyCheckoutMinutes > 0 ? `${record.earlyCheckoutMinutes} menit` : "-"}</TableCell>
            </TableRow>

            {/* Collapsible WFH Details row */}
            {isExpanded && hasDetails && (
              <TableRow className="bg-zinc-50/40 dark:bg-zinc-900/5 hover:bg-zinc-50/40 dark:hover:bg-zinc-900/5">
                <TableCell colSpan={10} className="p-4 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="grid gap-4 md:grid-cols-2 max-w-5xl mx-auto">
                    {/* WFH Plan details */}
                    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3 space-y-1">
                      <h5 className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                        <BookOpen className="size-3 text-blue-600" />
                        RENCANA KERJA (PAGI)
                      </h5>
                      <p className="text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-line leading-relaxed">
                        {record.wfhPlan || "Tidak menuliskan rencana kerja."}
                      </p>
                    </div>

                    {/* WFH Report details */}
                    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3 space-y-1">
                      <h5 className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                        <CheckCircle className="size-3 text-emerald-600" />
                        LAPORAN HASIL KERJA (SORE)
                      </h5>
                      <p className="text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-line leading-relaxed">
                        {record.wfhReport || "Tidak menuliskan laporan hasil kerja."}
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </Fragment>
        );
      })}
    </TableBody>
  );
}
