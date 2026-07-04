"use client";

import { useState } from "react";
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

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(dateStr));
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
          <TableCell colSpan={6} className="h-24 text-center text-sm text-zinc-500">
            Belum ada data presensi.
          </TableCell>
        </TableRow>
      </TableBody>
    );
  }

  return (
    <TableBody>
      {records.map((item) => {
        const isWfh = item.workMode === "WFH";
        const hasDetails = isWfh && (!!item.wfhPlan || !!item.wfhReport);
        const isExpanded = expandedId === item.id;

        return (
          <>
            <TableRow key={item.id} className={cn(isExpanded && "bg-zinc-50/50 dark:bg-zinc-900/10")}>
              <TableCell className="font-medium">
                <div className="text-zinc-900 dark:text-zinc-100">{item.user.name}</div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">{item.user.email}</div>
              </TableCell>
              <TableCell>{formatDate(item.attendanceDate)}</TableCell>
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
                      title="Lihat Detail Kerja WFH"
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
            </TableRow>

            {/* Collapsible WFH details */}
            {isExpanded && hasDetails && (
              <TableRow className="bg-zinc-50/40 dark:bg-zinc-900/5 hover:bg-zinc-50/40 dark:hover:bg-zinc-900/5">
                <TableCell colSpan={6} className="p-4 border-t border-zinc-100 dark:border-zinc-800">
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
                </TableCell>
              </TableRow>
            )}
          </>
        );
      })}
    </TableBody>
  );
}
