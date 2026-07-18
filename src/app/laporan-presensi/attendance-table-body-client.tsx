"use client";

import { Fragment, useState } from "react";
import { TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, BookOpen, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getMood } from "@/lib/moods";

type SerializedRecord = {
  id: string;
  attendanceDate: string;
  workMode: string;
  status: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  lateMinutes: number;
  earlyCheckoutMinutes: number;
  locationValidationStatus: string;
  distanceMeters: number | null;
  wfhPlan?: string | null;
  wfhReport?: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    currentMood?: string | null;
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
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(dateStr));
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(dateStr));
}

function formatLocationValidation(status: string) {
  if (status === "INSIDE_RADIUS") return "Inside radius";
  if (status === "OUTSIDE_RADIUS") return "Outside radius";
  if (status === "NOT_REQUIRED") return "Not required";
  return "N/A";
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
          <TableCell colSpan={12} className="h-24 text-center text-sm text-zinc-500">
            No attendance records found for this filter.
          </TableCell>
        </TableRow>
      </TableBody>
    );
  }

  return (
    <TableBody>
      {records.map((record) => {
        const isWfh = record.workMode === "WFH";
        const hasDetails = isWfh ? (!!record.wfhPlan || !!record.wfhReport) : (record.workMode === "WFO" && !!record.wfhReport);
        const isExpanded = expandedId === record.id;

        return (
          <Fragment key={record.id}>
            <TableRow className={cn(isExpanded && "bg-zinc-50/50 dark:bg-zinc-900/10")}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  <div className={`size-8 rounded-full flex items-center justify-center text-lg shrink-0 border select-none ${getMood(record.user.currentMood).bgColor} ${getMood(record.user.currentMood).borderColor}`} title={getMood(record.user.currentMood).label}>
                    {getMood(record.user.currentMood).emoji}
                  </div>
                  <div>
                    <div>{record.user.name}</div>
                    <div className="text-xs font-normal text-zinc-500">{record.user.email}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell>{formatDate(record.attendanceDate)}</TableCell>
              <TableCell>{record.ownerStudio.name}</TableCell>
              <TableCell>{record.locationStudio?.name ?? "Location not required"}</TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px]",
                    record.locationValidationStatus === "OUTSIDE_RADIUS" &&
                      "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300",
                    record.locationValidationStatus === "INSIDE_RADIUS" &&
                      "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-300"
                  )}
                >
                  {formatLocationValidation(record.locationValidationStatus)}
                </Badge>
              </TableCell>
              <TableCell>{typeof record.distanceMeters === "number" ? `${Math.round(record.distanceMeters)} m` : "-"}</TableCell>
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
                      title={isWfh ? "View WFH Work Details" : "View WFO Journal"}
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
              <TableCell>{record.lateMinutes > 0 ? `${record.lateMinutes} mins` : "-"}</TableCell>
              <TableCell>{record.earlyCheckoutMinutes > 0 ? `${record.earlyCheckoutMinutes} mins` : "-"}</TableCell>
            </TableRow>

            {/* Collapsible WFH/WFO Details row */}
            {isExpanded && hasDetails && (
              <TableRow className="bg-zinc-50/40 dark:bg-zinc-900/5 hover:bg-zinc-50/40 dark:hover:bg-zinc-900/5">
                <TableCell colSpan={12} className="p-4 border-t border-zinc-100 dark:border-zinc-800">
                  {isWfh ? (
                    <div className="grid gap-4 md:grid-cols-2 max-w-5xl mx-auto">
                      {/* WFH Plan details */}
                      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3 space-y-1">
                        <h5 className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                          <BookOpen className="size-3 text-blue-600" />
                          MORNING WORK PLAN
                        </h5>
                        <p className="text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-line leading-relaxed">
                          {record.wfhPlan || "No morning work plan submitted."}
                        </p>
                      </div>

                      {/* WFH Report details */}
                      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3 space-y-1">
                        <h5 className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                          <CheckCircle className="size-3 text-emerald-600" />
                          END-OF-DAY WORK REPORT
                        </h5>
                        <p className="text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-line leading-relaxed">
                          {record.wfhReport || "No work report submitted."}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="max-w-3xl mx-auto">
                      {/* WFO Journal details */}
                      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3 space-y-1">
                        <h5 className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                          <CheckCircle className="size-3 text-emerald-600" />
                          WFO JOURNAL (TODAY'S WORK REPORT)
                        </h5>
                        <p className="text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-line leading-relaxed">
                          {record.wfhReport || "No WFO journal submitted."}
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
