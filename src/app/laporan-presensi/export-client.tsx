"use client";

import { useState } from "react";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";

type RecordItem = {
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
  user: { name: string; email: string };
  ownerStudio: { name: string };
  locationStudio: { name: string } | null;
};

const LOCATION_VALIDATION_LABELS: Record<string, string> = {
  INSIDE_RADIUS: "Inside radius",
  OUTSIDE_RADIUS: "Outside radius",
  UNAVAILABLE: "Unavailable",
  NOT_REQUIRED: "Not required",
};

type Props = {
  records: RecordItem[];
  monthLabel: string;
};

const STATUS_LABELS: Record<string, string> = {
  PRESENT: "Present",
  ON_TIME: "On Time",
  LATE: "Late",
  WFH: "WFH",
  PERMISSION: "Permission",
  SICK: "Sick",
  DISPENSATION: "Dispensation",
  LEAVE: "Replacement Day",
  ALPHA: "Alpha",
  HOLIDAY: "Holiday",
  OFF_DAY: "Off Day",
};

export function AttendanceReportExportClient({ records, monthLabel }: Props) {
  const [exporting, setExporting] = useState(false);

  function formatDate(dStr: string) {
    const d = new Date(dStr);
    return new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(d);
  }

  function formatTime(tStr: string | null) {
    if (!tStr) return "-";
    const d = new Date(tStr);
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Jakarta",
    }).format(d);
  }

  function handleExportExcel() {
    setExporting(true);
    try {
      const data = records.map((r) => ({
        "Name": r.user.name,
        "Email": r.user.email,
        "Date": formatDate(r.attendanceDate),
        "Default Studio": r.ownerStudio.name,
        "Check-in Location": r.locationStudio?.name || "No location required",
        "Location Check": LOCATION_VALIDATION_LABELS[r.locationValidationStatus] || r.locationValidationStatus,
        "Scan Distance": typeof r.distanceMeters === "number" ? `${Math.round(r.distanceMeters)} meters` : "-",
        "Work Mode": r.workMode,
        "Status": STATUS_LABELS[r.status] || r.status,
        "Check-in": formatTime(r.checkInAt),
        "Check-out": formatTime(r.checkOutAt),
        "Late Minutes": r.lateMinutes > 0 ? `${r.lateMinutes} minutes` : "-",
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Attendance Report");
      XLSX.writeFile(wb, `Attendance_Report_${monthLabel.replace(/\s+/g, "_")}.xlsx`);
    } catch (e) {
      console.error("Export Excel error:", e);
    } finally {
      setExporting(false);
    }
  }

  function handlePrintPDF() {
    window.print();
  }

  return (
    <div className="flex gap-2 no-print">
      <Button variant="outline" onClick={handleExportExcel} disabled={exporting || records.length === 0}>
        <Download className="size-4 mr-1.5" />
        Export Excel
      </Button>
      <Button variant="outline" onClick={handlePrintPDF} disabled={records.length === 0}>
        <Printer className="size-4 mr-1.5" />
        Print PDF
      </Button>
    </div>
  );
}
