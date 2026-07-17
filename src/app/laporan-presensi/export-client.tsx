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
  INSIDE_RADIUS: "Dalam radius",
  OUTSIDE_RADIUS: "Diluar jangkauan",
  UNAVAILABLE: "Belum tersedia",
  NOT_REQUIRED: "Tidak perlu",
};

type Props = {
  records: RecordItem[];
  monthLabel: string;
};

const STATUS_LABELS: Record<string, string> = {
  PRESENT: "Hadir",
  ON_TIME: "Tepat Waktu",
  LATE: "Terlambat",
  WFH: "WFH",
  PERMISSION: "Izin",
  SICK: "Sakit",
  DISPENSATION: "Dispensasi",
  LEAVE: "Ganti Hari",
  ALPHA: "Alpha",
  HOLIDAY: "Hari Libur",
  OFF_DAY: "Off Day",
};

export function AttendanceReportExportClient({ records, monthLabel }: Props) {
  const [exporting, setExporting] = useState(false);

  function formatDate(dStr: string) {
    const d = new Date(dStr);
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(d);
  }

  function formatTime(tStr: string | null) {
    if (!tStr) return "-";
    const d = new Date(tStr);
    return new Intl.DateTimeFormat("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Jakarta",
    }).format(d);
  }

  function handleExportExcel() {
    setExporting(true);
    try {
      const data = records.map((r) => ({
        "Nama": r.user.name,
        "Email": r.user.email,
        "Tanggal": formatDate(r.attendanceDate),
        "Studio Asal": r.ownerStudio.name,
        "Lokasi Check-in": r.locationStudio?.name || "Tidak perlu lokasi",
        "Validasi Lokasi": LOCATION_VALIDATION_LABELS[r.locationValidationStatus] || r.locationValidationStatus,
        "Jarak Scan": typeof r.distanceMeters === "number" ? `${Math.round(r.distanceMeters)} meter` : "-",
        "Mode Kerja": r.workMode,
        "Status": STATUS_LABELS[r.status] || r.status,
        "Check-in": formatTime(r.checkInAt),
        "Check-out": formatTime(r.checkOutAt),
        "Keterlambatan": r.lateMinutes > 0 ? `${r.lateMinutes} menit` : "-",
        "Pulang Cepat": r.earlyCheckoutMinutes > 0 ? `${r.earlyCheckoutMinutes} menit` : "-",
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Laporan Presensi");
      XLSX.writeFile(wb, `Laporan_Presensi_${monthLabel.replace(/\s+/g, "_")}.xlsx`);
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
        Ekspor Excel
      </Button>
      <Button variant="outline" onClick={handlePrintPDF} disabled={records.length === 0}>
        <Printer className="size-4 mr-1.5" />
        Cetak PDF
      </Button>
    </div>
  );
}
