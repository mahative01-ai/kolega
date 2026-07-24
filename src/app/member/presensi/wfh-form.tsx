"use client";

import { useState } from "react";
import { Send, FileText, Loader2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { submitWfhAttendanceAction } from "./actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Props = {
  hasCheckedIn: boolean;
  hasCheckedOut: boolean;
  checkInPlan?: string | null;
};

export function WfhForm({ hasCheckedIn, hasCheckedOut, checkInPlan }: Props) {
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");

  const handleSubmit = () => {
    setLoading(true);
  };

  if (hasCheckedIn && hasCheckedOut) {
    return (
      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-center dark:border-emerald-900 dark:bg-emerald-950/20">
        <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
          Anda sudah menyelesaikan presensi WFH hari ini (Check-in & Check-out).
        </p>
      </div>
    );
  }

  return (
    <form
      action={submitWfhAttendanceAction}
      onSubmit={handleSubmit}
      className="grid gap-4"
    >
      {!hasCheckedIn ? (
        <div className="flex flex-col gap-2">
          <label htmlFor="wfhPlan" className="text-sm font-medium flex items-center justify-between gap-1.5 text-zinc-700 dark:text-zinc-300">
            <div className="flex items-center gap-1.5">
              <FileText className="size-4 text-blue-600" />
              <span>Rencana Kerja WFH</span>
            </div>
            <Dialog>
              <DialogTrigger
                type="button"
                className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer shrink-0 shadow-none"
              >
                <span>Rules & Info</span>
                <ChevronRight className="size-3.5 text-zinc-500" />
              </DialogTrigger>
              <DialogContent className="sm:max-w-md border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
                <DialogHeader>
                  <DialogTitle>Ketentuan Rencana Kerja WFH</DialogTitle>
                </DialogHeader>
                <div className="space-y-2 text-xs text-zinc-600 dark:text-zinc-450 leading-relaxed">
                  <p>Setiap melakukan Check-in WFH (Work From Home) di pagi hari, Anda wajib mengisi rencana pekerjaan tertulis yang akan Anda selesaikan hari ini.</p>
                  <p className="text-[10px] text-zinc-500">Ketentuan ini wajib dipenuhi agar presensi WFH dianggap valid dan dapat disetujui oleh manajemen.</p>
                </div>
              </DialogContent>
            </Dialog>
          </label>
          <textarea
            id="wfhPlan"
            name="wfhPlan"
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Tuliskan rencana pekerjaan yang akan Anda selesaikan hari ini..."
            className="w-full rounded-lg border border-input bg-transparent p-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
            required
            disabled={loading}
          />
          <p className="text-xs text-zinc-500">
            Rencana kerja wajib diisi sebelum melakukan Check-in WFH.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
            <p className="text-xs font-semibold text-zinc-500">Rencana Kerja Anda:</p>
            <p className="mt-1 text-sm text-zinc-700 whitespace-pre-wrap">{checkInPlan}</p>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="wfhReport" className="text-sm font-medium flex items-center justify-between gap-1.5 text-zinc-700 dark:text-zinc-300">
              <div className="flex items-center gap-1.5">
                <FileText className="size-4 text-emerald-600" />
                <span>Laporan Hasil Kerja WFH</span>
              </div>
              <Dialog>
                <DialogTrigger
                  type="button"
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer shrink-0 shadow-none"
                >
                  <span>Rules & Info</span>
                  <ChevronRight className="size-3.5 text-zinc-500" />
                </DialogTrigger>
                <DialogContent className="sm:max-w-md border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
                  <DialogHeader>
                    <DialogTitle>Ketentuan Laporan Kerja WFH</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-2 text-xs text-zinc-600 dark:text-zinc-450 leading-relaxed">
                    <p>Setiap melakukan Check-out WFH (Work From Home) di sore hari, Anda wajib mengisi laporan pekerjaan tertulis mengenai apa saja hasil yang telah Anda capai hari ini.</p>
                    <p className="text-[10px] text-zinc-500">Ketentuan ini wajib dipenuhi agar presensi WFH dianggap valid dan dapat disetujui oleh manajemen.</p>
                  </div>
                </DialogContent>
              </Dialog>
            </label>
            <textarea
              id="wfhReport"
              name="wfhReport"
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Tuliskan laporan pekerjaan/hasil yang telah Anda capai hari ini..."
              className="w-full rounded-lg border border-input bg-transparent p-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
              required
              disabled={loading}
            />
            <p className="text-xs text-zinc-500">
              Laporan kerja wajib diisi sebelum melakukan Check-out WFH.
            </p>
          </div>
        </div>
      )}

      <Button type="submit" disabled={loading || !text.trim()} className="w-full">
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Send aria-hidden="true" className="size-4" />
        )}
        {loading ? "Memproses..." : !hasCheckedIn ? "Check-in WFH" : "Check-out WFH"}
      </Button>
    </form>
  );
}
