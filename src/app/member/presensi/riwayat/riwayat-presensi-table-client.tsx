"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpDown, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { getJakartaDateKey } from "@/lib/attendance-time";

type AttendanceRecordItem = {
  id: string;
  attendanceDate: Date;
  workMode: string;
  status: string;
  checkInAt: Date | null;
  checkOutAt: Date | null;
  lateMinutes: number;
  earlyCheckoutMinutes: number;
  ownerStudio: { name: string };
  locationStudio: { name: string } | null;
};

type Props = {
  records: AttendanceRecordItem[];
};

const statusLabel: Record<string, string> = {
  PRESENT: "Present",
  ON_TIME: "On Time",
  LATE: "Late",
  WFH: "WFH",
  PERMISSION: "Permission",
  SICK: "Sick",
  LEAVE: "Leave Exchange",
  ALPHA: "Alpha",
  HOLIDAY: "Holiday",
  OFF_DAY: "Off Day",
};

const statusColor: Record<string, string> = {
  PRESENT: "bg-emerald-100 text-emerald-800",
  ON_TIME: "bg-emerald-100 text-emerald-800",
  LATE: "bg-orange-100 text-orange-800",
  WFH: "bg-blue-100 text-blue-800",
  PERMISSION: "bg-amber-100 text-amber-800",
  SICK: "bg-violet-100 text-violet-800",
  LEAVE: "bg-sky-100 text-sky-800",
  ALPHA: "bg-red-100 text-red-800",
  HOLIDAY: "bg-zinc-200 text-zinc-700",
  OFF_DAY: "bg-zinc-200 text-zinc-700",
};

function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));
}

function formatTime(date: Date | string | null) {
  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(date));
}

export function RiwayatPresensiTableClient({ records }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<string>("date");
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const sortedAndFilteredRecords = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    let result = records;

    if (q) {
      result = records.filter(
        (r) =>
          r.workMode.toLowerCase().includes(q) ||
          statusLabel[r.status]?.toLowerCase().includes(q) ||
          r.status.toLowerCase().includes(q) ||
          r.ownerStudio.name.toLowerCase().includes(q) ||
          r.locationStudio?.name.toLowerCase().includes(q)
      );
    }

    return [...result].sort((a, b) => {
      let aVal: string | number = "";
      let bVal: string | number = "";

      if (sortField === "date") {
        aVal = new Date(a.attendanceDate).getTime();
        bVal = new Date(b.attendanceDate).getTime();
      } else if (sortField === "mode") {
        aVal = a.workMode;
        bVal = b.workMode;
      } else if (sortField === "status") {
        aVal = statusLabel[a.status] ?? a.status;
        bVal = statusLabel[b.status] ?? b.status;
      } else if (sortField === "checkIn") {
        aVal = a.checkInAt ? new Date(a.checkInAt).getTime() : 0;
        bVal = b.checkInAt ? new Date(b.checkInAt).getTime() : 0;
      } else if (sortField === "checkOut") {
        aVal = a.checkOutAt ? new Date(a.checkOutAt).getTime() : 0;
        bVal = b.checkOutAt ? new Date(b.checkOutAt).getTime() : 0;
      } else if (sortField === "late") {
        aVal = a.lateMinutes;
        bVal = b.lateMinutes;
      } else if (sortField === "early") {
        aVal = a.earlyCheckoutMinutes;
        bVal = b.earlyCheckoutMinutes;
      } else if (sortField === "studio") {
        aVal = a.ownerStudio.name.toLowerCase();
        bVal = b.ownerStudio.name.toLowerCase();
      } else if (sortField === "location") {
        aVal = (a.locationStudio?.name ?? "").toLowerCase();
        bVal = (b.locationStudio?.name ?? "").toLowerCase();
      }

      if (aVal < bVal) return sortAsc ? -1 : 1;
      if (aVal > bVal) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [records, searchQuery, sortField, sortAsc]);

  return (
    <div className="space-y-4">
      <div className="flex max-w-sm relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search mode, status, or studio..."
          className="pl-9"
        />
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-950">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead onClick={() => handleSort("date")} className="cursor-pointer select-none hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                  <div className="flex items-center gap-1">
                    Date <ArrowUpDown className="size-3 text-zinc-400" />
                  </div>
                </TableHead>
                <TableHead onClick={() => handleSort("mode")} className="cursor-pointer select-none hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                  <div className="flex items-center gap-1">
                    Mode <ArrowUpDown className="size-3 text-zinc-400" />
                  </div>
                </TableHead>
                <TableHead onClick={() => handleSort("status")} className="cursor-pointer select-none hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                  <div className="flex items-center gap-1">
                    Status <ArrowUpDown className="size-3 text-zinc-400" />
                  </div>
                </TableHead>
                <TableHead onClick={() => handleSort("checkIn")} className="cursor-pointer select-none hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                  <div className="flex items-center gap-1">
                    Check-in <ArrowUpDown className="size-3 text-zinc-400" />
                  </div>
                </TableHead>
                <TableHead onClick={() => handleSort("checkOut")} className="cursor-pointer select-none hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                  <div className="flex items-center gap-1">
                    Check-out <ArrowUpDown className="size-3 text-zinc-400" />
                  </div>
                </TableHead>
                <TableHead onClick={() => handleSort("late")} className="cursor-pointer select-none hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                  <div className="flex items-center gap-1">
                    Late <ArrowUpDown className="size-3 text-zinc-400" />
                  </div>
                </TableHead>
                <TableHead onClick={() => handleSort("early")} className="cursor-pointer select-none hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                  <div className="flex items-center gap-1">
                    Early Checkout <ArrowUpDown className="size-3 text-zinc-400" />
                  </div>
                </TableHead>
                <TableHead onClick={() => handleSort("studio")} className="cursor-pointer select-none hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                  <div className="flex items-center gap-1">
                    Default Studio <ArrowUpDown className="size-3 text-zinc-400" />
                  </div>
                </TableHead>
                <TableHead onClick={() => handleSort("location")} className="cursor-pointer select-none hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                  <div className="flex items-center gap-1">
                    Location <ArrowUpDown className="size-3 text-zinc-400" />
                  </div>
                </TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAndFilteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="h-24 text-center text-sm text-zinc-500"
                  >
                    No attendance records found.
                  </TableCell>
                </TableRow>
              ) : (
                sortedAndFilteredRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="text-xs font-mono">{formatDate(record.attendanceDate)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{record.workMode}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn("text-[10px]", statusColor[record.status])}
                      >
                        {statusLabel[record.status] ?? record.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono">{formatTime(record.checkInAt)}</TableCell>
                    <TableCell className="text-xs font-mono">{formatTime(record.checkOutAt)}</TableCell>
                    <TableCell className="text-xs">
                      {record.lateMinutes > 0
                        ? `${record.lateMinutes} min`
                        : "-"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {record.earlyCheckoutMinutes > 0
                        ? `${record.earlyCheckoutMinutes} min`
                        : "-"}
                    </TableCell>
                    <TableCell className="text-xs">{record.ownerStudio.name}</TableCell>
                    <TableCell className="text-xs">
                      {record.locationStudio?.name ?? "No location required"}
                    </TableCell>
                    <TableCell className="text-right">
                      {(() => {
                        const todayKey = getJakartaDateKey(new Date());
                        const todayMidnight = new Date(`${todayKey}T00:00:00.000Z`);
                        const recordDate = new Date(record.attendanceDate);
                        const diffTime = todayMidnight.getTime() - recordDate.getTime();
                        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

                        if (diffDays >= 2 && diffDays <= 7) {
                          return (
                            <Link
                              href={`/member/corrections?recordId=${record.id}`}
                              className={cn(
                                buttonVariants({ variant: "outline", size: "sm" }),
                                "h-7 px-2 text-xs"
                              )}
                            >
                              Correction
                            </Link>
                          );
                        }
                        return <span className="text-xs text-zinc-400 dark:text-zinc-500">-</span>;
                      })()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

