"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CalendarDays, AlertCircle } from "lucide-react";
import { createRequestAction } from "./actions";

type Props = {
  canRequestReplacementDay: boolean;
};

const SYARAT_KETERANGAN: Record<string, { title: string; desc: string; variant: "blue" | "emerald" | "violet" | "amber" | "rose" }> = {
  PERMISSION: {
    title: "Ketentuan Izin Pribadi",
    desc: "Wajib diajukan minimal H-1 sebelum jadwal kerja dimulai. Tanpa surat pendukung.",
    variant: "amber",
  },
  SICK: {
    title: "Ketentuan Izin Sakit",
    desc: "Wajib melampirkan bukti Surat Sakit resmi. Dapat diajukan paling lambat H+1 (sebelum pukul 07:00 pagi). Tanpa lampiran, status akan dialihkan ke Izin Pribadi.",
    variant: "violet",
  },
  DISPENSATION: {
    title: "Ketentuan Dispensasi",
    desc: "Wajib menyertakan bukti lampiran resmi (surat tugas, undangan, dll.). Status absensi ini tidak menambah hutang ganti hari.",
    variant: "emerald",
  },
  LEAVE: {
    title: "Ketentuan Ganti Hari",
    desc: "Wajib diajukan minimal H-1. Setelah disetujui, sistem akan mencatat hutang ganti hari kerja.",
    variant: "rose",
  },
  WFH: {
    title: "Ketentuan Work From Home",
    desc: "Hanya berlaku untuk anggota berstatus Team (staf Intern/Magang tidak diperbolehkan). Wajib mengisi rencana kerja WFH pada hari H.",
    variant: "blue",
  },
};

export function RequestFormClient({ canRequestReplacementDay }: Props) {
  const [selectedType, setSelectedType] = useState<string>("PERMISSION");
  const [loading, setLoading] = useState(false);

  const guide = SYARAT_KETERANGAN[selectedType];

  return (
    <form
      action={async (formData) => {
        setLoading(true);
        try {
          await createRequestAction(formData);
        } catch (err) {
          // Actions handle redirecting, which throws a redirect error. We let next.js handle it.
          throw err;
        } finally {
          setLoading(false);
        }
      }}
      method="POST"
      encType="multipart/form-data"
      className="grid gap-4"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="request-type" className="text-sm font-medium">
          Tipe Pengajuan <span className="text-red-500">*</span>
        </label>
        <select
          id="request-type"
          name="type"
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="h-9 w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-3 text-sm outline-none focus:border-zinc-950 dark:focus:border-zinc-300 focus:ring-1 focus:ring-zinc-950 dark:focus:ring-zinc-300"
          required
        >
          <option value="PERMISSION">Izin Pribadi / Tanpa Surat (Min H-1)</option>
          <option value="SICK">Sakit Resmi (Surat Dokter; tanpa surat menjadi Izin)</option>
          <option value="DISPENSATION">Dispensasi Resmi (Wajib Lampiran)</option>
          {canRequestReplacementDay && (
            <option value="LEAVE">Ganti Hari (Min H-1)</option>
          )}
          <option value="WFH">Pengajuan WFH</option>
        </select>
      </div>

      {guide && (
        <div
          className={`flex gap-2 rounded-lg border p-3 text-xs leading-relaxed animate-in fade-in duration-200 ${
            guide.variant === "amber"
              ? "border-amber-200 bg-amber-50/50 text-amber-800 dark:border-amber-900/30 dark:bg-amber-950/10 dark:text-amber-300"
              : guide.variant === "violet"
              ? "border-violet-200 bg-violet-50/50 text-violet-800 dark:border-violet-900/30 dark:bg-violet-950/10 dark:text-violet-300"
              : guide.variant === "emerald"
              ? "border-emerald-200 bg-emerald-50/50 text-emerald-800 dark:border-emerald-900/30 dark:bg-emerald-950/10 dark:text-emerald-300"
              : guide.variant === "rose"
              ? "border-red-200 bg-red-50/50 text-red-800 dark:border-red-900/30 dark:bg-red-950/10 dark:text-red-300"
              : "border-blue-200 bg-blue-50/50 text-blue-800 dark:border-blue-900/30 dark:bg-blue-950/10 dark:text-blue-300"
          }`}
        >
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">{guide.title}:</span> {guide.desc}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="start-date" className="text-sm font-medium">
            Mulai Tanggal <span className="text-red-500">*</span>
          </label>
          <Input id="start-date" name="startDate" type="date" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="end-date" className="text-sm font-medium">
            Selesai Tanggal <span className="text-red-500">*</span>
          </label>
          <Input id="end-date" name="endDate" type="date" required />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="reason" className="text-sm font-medium">
          Alasan / Keterangan <span className="text-red-500">*</span>
        </label>
        <Textarea
          id="reason"
          name="reason"
          placeholder="Jelaskan alasan izin secara ringkas dan jelas..."
          required
          rows={4}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="attachment" className="text-sm font-medium">
          Lampiran Berkas{" "}
          <span className="text-xs font-normal text-zinc-500">
            ({selectedType === "DISPENSATION" ? "wajib" : "opsional"}, maks 2MB)
          </span>
        </label>
        <Input
          id="attachment"
          name="attachment"
          type="file"
          accept="image/*,application/pdf"
          className="cursor-pointer file:mr-4 file:rounded-md file:border-0 file:bg-zinc-900 file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-white hover:file:bg-zinc-800"
        />
      </div>

      <Button type="submit" disabled={loading} className="w-full mt-2">
        <CalendarDays className="size-4 mr-2" />
        {loading ? "Mengirim..." : "Kirim Pengajuan"}
      </Button>
    </form>
  );
}
