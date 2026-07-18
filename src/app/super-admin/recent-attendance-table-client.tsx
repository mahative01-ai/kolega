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
  wfhPlan?: string | null;
  wfhReport?: string | null;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  user: {
    name: string;
    email: string;
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

function formatTime(timeStr: string | null | undefined) {
  if (!timeStr) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(timeStr));
}

export function RecentAttendanceTableClient({ records, statusColor, statusLabel }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  if (records.length === 0) {
    return (
      <TableBody>
        <TableRow>
          <TableCell colSpan={7} className="h-24 text-center text-sm text-zinc-500">
            Belum ada data presensi tim hari ini.
          </TableCell>
        </TableRow>
      </TableBody>
    );
  }

  return (
    <TableBody>
      {records.map((item) => {
        const isWfh = item.workMode === "WFH";
        const hasDetails = isWfh ? (!!item.wfhPlan || !!item.wfhReport) : (item.workMode === "WFO" && !!item.wfhReport);
        const isExpanded = expandedId === item.id;

        return (
          <Fragment key={item.id}>
            <TableRow className={cn(isExpanded && "bg-zinc-50/50 dark:bg-zinc-900/10")}>
              <TableCell className="font-medium">
                <div className="text-zinc-900 dark:text-zinc-100">{item.user.name}</div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">{item.user.email}</div>
              </TableCell>
              <TableCell>{item.ownerStudio.name}</TableCell>
              <TableCell>{item.locationStudio?.name ?? "Tidak perlu lokasi"}</TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300">
                    {item.workMode}
                  </Badge>
                  {hasDetails && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-5 rounded p-0 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                      onClick={() => toggleExpand(item.id)}
                      title={isWfh ? "Lihat Detail Kerja WFH" : "Lihat Jurnal WFO"}
                    >
                      {isExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                    </Button>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className={statusColor[item.status]}>
                  {statusLabel[item.status] ?? item.status}
                </Badge>
              </TableCell>
              <TableCell className="font-mono text-xs">{formatTime(item.checkInAt)}</TableCell>
              <TableCell className="font-mono text-xs">{formatTime(item.checkOutAt)}</TableCell>
            </TableRow>

            {/* Collapsible WFH/WFO details */}
            {isExpanded && hasDetails && (
              <TableRow className="bg-zinc-50/40 dark:bg-zinc-900/5 hover:bg-zinc-50/40 dark:hover:bg-zinc-900/5">
                <TableCell colSpan={7} className="p-4 border-t border-zinc-100 dark:border-zinc-800">
                  {isWfh ? (
                    <div className="grid gap-4 md:grid-cols-2 max-w-4xl mx-auto">
                      {/* WFH Plan details */}
                      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3 space-y-1">
                        <h5 className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                          <BookOpen className="size-3 text-blue-600" />
                          RENCANA KERJA (PAGI)
                        </h5>
                        <p className="text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-line leading-relaxed">
                          {item.wfhPlan || "Tidak menuliskan rencana kerja."}
                        </p>
                      </div>

                      {/* WFH Report details */}
                      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3 space-y-1">
                        <h5 className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                          <CheckCircle className="size-3 text-emerald-600" />
                          LAPORAN HASIL KERJA (SORE)
                        </h5>
                        <p className="text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-line leading-relaxed">
                          {item.wfhReport || "Tidak menuliskan laporan hasil kerja."}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="max-w-2xl mx-auto">
                      {/* WFO Journal details */}
                      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3 space-y-1">
                        <h5 className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                          <CheckCircle className="size-3 text-emerald-600" />
                          JURNAL WFO (HASIL KERJA HARI INI)
                        </h5>
                        <p className="text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-line leading-relaxed">
                          {item.wfhReport || "Tidak menuliskan jurnal WFO."}
                        </p>
                      </div>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            )}
          </Fragment>
        );
      })}
    </TableBody>
  );
}
