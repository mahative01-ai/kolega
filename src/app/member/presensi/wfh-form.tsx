"use client";

import { useState } from "react";
import { Send, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { submitWfhAttendanceAction } from "./actions";

export function WfhForm({
  hasCheckedIn,
  hasCheckedOut,
  checkInPlan,
}: {
  hasCheckedIn: boolean;
  hasCheckedOut: boolean;
  checkInPlan?: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");

  if (hasCheckedOut) {
    return (
      <div className="rounded-md border border-emerald-200 bg-emerald-50/50 p-4 text-emerald-800">
        <p className="text-sm font-medium">Presensi WFH hari ini selesai.</p>
      </div>
    );
  }

  const handleSubmit = () => {
    setLoading(true);
  };

  return (
    <form
      action={submitWfhAttendanceAction}
      onSubmit={handleSubmit}
      className="grid gap-4"
    >
      {!hasCheckedIn ? (
        <div className="flex flex-col gap-2">
          <label htmlFor="wfhPlan" className="text-sm font-medium flex items-center gap-1.5 text-zinc-700">
            <FileText className="size-4 text-blue-600" />
            Rencana Kerja WFH
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
            <label htmlFor="wfhReport" className="text-sm font-medium flex items-center gap-1.5 text-zinc-700">
              <FileText className="size-4 text-emerald-600" />
              Laporan Hasil Kerja WFH
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
        <Send aria-hidden="true" className="size-4" />
        {loading ? "Memproses..." : !hasCheckedIn ? "Check-in WFH" : "Check-out WFH"}
      </Button>
    </form>
  );
}
