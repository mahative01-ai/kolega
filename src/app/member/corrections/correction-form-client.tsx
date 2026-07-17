"use client";

import { useState } from "react";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";

type RecordItem = {
  id: string;
  attendanceDate: Date;
  status: string;
};

type Props = {
  recentRecords: RecordItem[];
  preselectedRecord: RecordItem | null;
  statusLabel: Record<string, string>;
  statusColor: Record<string, string>;
  action: (formData: FormData) => void;
};

export function CorrectionFormClient({
  recentRecords,
  preselectedRecord,
  statusLabel,
  statusColor,
  action,
}: Props) {
  const [newStatus, setNewStatus] = useState("ON_TIME");
  const [selectedRecordId, setSelectedRecordId] = useState(preselectedRecord?.id ?? "");

  function formatDate(date: Date) {
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(date));
  }

  const showTimeInput = newStatus === "ON_TIME" || newStatus === "LATE";
  const selectedRecord = preselectedRecord ?? recentRecords.find((record) => record.id === selectedRecordId) ?? null;
  const todayKey = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
  const selectedDateKey = selectedRecord
    ? new Date(selectedRecord.attendanceDate).toISOString().slice(0, 10)
    : "";
  const isPastRecord = Boolean(selectedDateKey && selectedDateKey < todayKey);

  return (
    <form action={action} method="POST" className="grid gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="record-select" className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Pilih Catatan Presensi / Tanggal <span className="text-red-500">*</span>
        </label>
        {preselectedRecord ? (
          <>
            <input type="hidden" name="recordId" value={preselectedRecord.id} />
            <div className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 px-3 py-2 text-sm font-medium flex justify-between items-center">
              <span className="text-zinc-800 dark:text-zinc-200">{formatDate(preselectedRecord.attendanceDate)}</span>
              <Badge variant="secondary" className={statusColor[preselectedRecord.status]}>
                {statusLabel[preselectedRecord.status] ?? preselectedRecord.status}
              </Badge>
            </div>
            <Link
              href="/member/corrections"
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1 self-start"
            >
              Batal pilih & cari tanggal lain
            </Link>
          </>
        ) : (
          <select
            id="record-select"
            name="recordId"
            value={selectedRecordId}
            onChange={(event) => setSelectedRecordId(event.target.value)}
            className="h-9 w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-3 text-sm outline-none focus:border-zinc-950 dark:focus:border-zinc-300 focus:ring-1 focus:ring-zinc-950 dark:focus:ring-zinc-300"
            required
          >
            <option value="">-- Pilih Tanggal --</option>
            {recentRecords.map((r) => (
              <option key={r.id} value={r.id}>
                {formatDate(r.attendanceDate)} ({statusLabel[r.status] ?? r.status})
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="new-status" className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Usulan Status Baru <span className="text-red-500">*</span>
        </label>
        <select
          id="new-status"
          name="newStatus"
          value={newStatus}
          onChange={(e) => setNewStatus(e.target.value)}
          className="h-9 w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-3 text-sm outline-none focus:border-zinc-950 dark:focus:border-zinc-300 focus:ring-1 focus:ring-zinc-950 dark:focus:ring-zinc-300"
          required
        >
          <option value="ON_TIME">Tepat Waktu (WFO)</option>
          <option value="LATE">Terlambat (WFO)</option>
          <option value="WFH">WFH (Penuh)</option>
          <option value="PERMISSION">Izin</option>
          <option value="SICK">Sakit</option>
          <option value="LEAVE">Ganti Hari</option>
        </select>
      </div>

      {showTimeInput && (
        <div className="grid gap-3 animate-in fade-in slide-in-from-top-1 duration-150 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="proposed-check-in-time" className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Usulan Jam Masuk (WIB) <span className="text-red-500">*</span>
            </label>
            <Input
              id="proposed-check-in-time"
              name="proposedCheckInTime"
              type="time"
              required={showTimeInput}
              defaultValue="08:00"
              className="w-full h-9 bg-white dark:bg-zinc-950"
            />
            <p className="text-[10px] text-zinc-500">Isi perkiraan jam hadir di studio.</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="proposed-check-out-time" className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Usulan Jam Pulang (WIB) {isPastRecord ? <span className="text-red-500">*</span> : <span className="text-zinc-400">(opsional)</span>}
            </label>
            <Input
              id="proposed-check-out-time"
              name="proposedCheckOutTime"
              type="time"
              required={isPastRecord}
              defaultValue={isPastRecord ? "16:00" : undefined}
              className="w-full h-9 bg-white dark:bg-zinc-950"
            />
            <p className="text-[10px] text-zinc-500">
              {isPastRecord
                ? "Tanggal terlewat wajib menyertakan jam pulang agar presensi tidak menggantung."
                : "Untuk hari ini boleh dikosongkan jika belum pulang."}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="reason" className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Alasan Koreksi <span className="text-red-500">*</span>
        </label>
        <Textarea
          id="reason"
          name="reason"
          placeholder="Contoh: Lupa scan QR saat check-in pagi karena buru-buru, namun saya hadir tepat waktu..."
          required
          rows={4}
          className="bg-white dark:bg-zinc-950"
        />
      </div>

      <Button type="submit" className="w-full mt-2">
        <PlusCircle className="size-4 mr-2" />
        Kirim Koreksi
      </Button>
    </form>
  );
}
