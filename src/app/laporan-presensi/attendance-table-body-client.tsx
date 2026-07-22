"use client";

import { TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { getMood } from "@/lib/moods";
import type { DetailRecord } from "./attendance-detail-dialog";

type Props = {
  records: DetailRecord[];
  statusColor: Record<string, string>;
  statusLabel: Record<string, string>;
  onSelectRecord: (record: DetailRecord) => void;
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

export function AttendanceTableBodyClient({
  records,
  statusColor,
  statusLabel,
  onSelectRecord,
}: Props) {
  if (records.length === 0) {
    return (
      <TableBody>
        <TableRow>
          <TableCell colSpan={7} className="h-24 text-center text-sm text-zinc-500">
            No attendance records found for this filter.
          </TableCell>
        </TableRow>
      </TableBody>
    );
  }

  return (
    <TableBody>
      {records.map((record) => {
        const mood = getMood(record.mood || record.user.currentMood);

        return (
          <TableRow key={record.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10">
            <TableCell className="font-medium">
              <button
                type="button"
                onClick={() => onSelectRecord(record)}
                className="flex items-center gap-2 text-left group hover:opacity-90 transition-opacity"
              >
                <div
                  className={`size-8 rounded-full flex items-center justify-center text-lg shrink-0 border select-none ${mood.bgColor} ${mood.borderColor}`}
                  title={mood.label}
                >
                  {mood.emoji}
                </div>
                <div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                    {record.user.name}
                  </div>
                </div>
              </button>
            </TableCell>
            <TableCell>{formatDate(record.attendanceDate)}</TableCell>
            <TableCell>{record.ownerStudio.name}</TableCell>
            <TableCell>
              <Badge variant="outline" className="dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-300">
                {record.workMode}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge variant="secondary" className={statusColor[record.status]}>
                {statusLabel[record.status] ?? record.status}
              </Badge>
            </TableCell>
            <TableCell>{formatTime(record.checkInAt)}</TableCell>
            <TableCell>{formatTime(record.checkOutAt)}</TableCell>
          </TableRow>
        );
      })}
    </TableBody>
  );
}
