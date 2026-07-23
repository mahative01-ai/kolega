"use client";

import { useState } from "react";
import { PlusCircle, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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
  memberStatus?: string;
  action: (formData: FormData) => void;
};

const CORRECTION_HELPER_TEXT: Record<string, { title: string; desc: string; variant: "amber" | "violet" | "emerald" | "blue" | "rose" }> = {
  SICK: {
    title: "Sick Leave",
    desc: "Attachment is optional. Without an attachment, this still requires a replacement workday.",
    variant: "violet",
  },
  PERMISSION: {
    title: "Personal Leave",
    desc: "This correction still requires a replacement workday.",
    variant: "amber",
  },
  DISPENSATION: {
    title: "Official Dispensation",
    desc: "Requires an official support document and does not affect workday balance.",
    variant: "emerald",
  },
  LEAVE: {
    title: "Annual Leave",
    desc: "Uses annual leave balance and does not create workday debt.",
    variant: "rose",
  },
  ON_TIME: {
    title: "On Time",
    desc: "Corrects your attendance to present on time. Please provide estimated check-in/out times.",
    variant: "blue",
  },
  LATE: {
    title: "Late",
    desc: "Corrects your attendance to late. Please provide estimated check-in/out times.",
    variant: "amber",
  },
  WFH: {
    title: "Work From Home",
    desc: "Corrects your attendance to WFH mode.",
    variant: "blue",
  },
};

export function CorrectionFormClient({
  recentRecords,
  preselectedRecord,
  statusLabel,
  statusColor,
  memberStatus,
  action,
}: Props) {
  const [newStatus, setNewStatus] = useState("ON_TIME");
  const [selectedRecordId, setSelectedRecordId] = useState(preselectedRecord?.id ?? "");

  function formatDate(date: Date) {
    return new Intl.DateTimeFormat("en-US", {
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
  const helper = CORRECTION_HELPER_TEXT[newStatus];

  return (
    <form action={action} method="POST" encType="multipart/form-data" className="grid gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="record-select" className="text-sm font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
          <span>Select Attendance Record / Date</span>
          <span className="text-red-500">*</span>
          <Dialog>
            <DialogTrigger asChild>
              <HelpCircle className="size-4 text-zinc-400 hover:text-zinc-600 cursor-pointer shrink-0" />
            </DialogTrigger>
            <DialogContent className="sm:max-w-md border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
              <DialogHeader>
                <DialogTitle>Attendance Correction Rules</DialogTitle>
                <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-450">
                  Regulations for submitting past attendance corrections:
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                <div>
                  <h4 className="font-bold text-zinc-900 dark:text-zinc-200">1. Correction Date Range</h4>
                  <p className="mt-0.5">Attendance corrections are only allowed for dates ranging from <b>2 to 7 days ago</b>. Today (H-0), yesterday (H-1), and dates outside the 7-day range cannot be selected.</p>
                </div>
                <div>
                  <h4 className="font-bold text-zinc-900 dark:text-zinc-200">2. Estimated Check-in/out Time</h4>
                  <p className="mt-0.5">If correcting your status to physical presence (On Time or Late), you must provide the proposed check-in time so the system can calculate late minutes and time debt accurately.</p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
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
              Cancel selection & search another date
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
            <option value="">-- Select Date --</option>
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
          Proposed New Status <span className="text-red-500">*</span>
        </label>
        <select
          id="new-status"
          name="newStatus"
          value={newStatus}
          onChange={(e) => setNewStatus(e.target.value)}
          className="h-9 w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-3 text-sm outline-none focus:border-zinc-950 dark:focus:border-zinc-300 focus:ring-1 focus:ring-zinc-950 dark:focus:ring-zinc-300"
          required
        >
          <option value="ON_TIME">On Time</option>
          <option value="LATE">Late</option>
          <option value="WFH">Work From Home (WFH)</option>
          <option value="PERMISSION">Personal Leave</option>
          <option value="SICK">Sick Leave</option>
          <option value="DISPENSATION">Official Dispensation</option>
          {memberStatus === "TEAM" && <option value="LEAVE">Annual Leave</option>}
        </select>
      </div>

      {helper && (
        <div
          className={`flex gap-2 rounded-lg border p-3 text-xs leading-relaxed animate-in fade-in duration-200 ${
            helper.variant === "amber"
              ? "border-amber-200 bg-amber-50/50 text-amber-800 dark:border-amber-900/30 dark:bg-amber-950/10 dark:text-amber-300"
              : helper.variant === "violet"
              ? "border-violet-200 bg-violet-50/50 text-violet-800 dark:border-violet-900/30 dark:bg-violet-950/10 dark:text-violet-300"
              : helper.variant === "emerald"
              ? "border-emerald-200 bg-emerald-50/50 text-emerald-800 dark:border-emerald-900/30 dark:bg-emerald-950/10 dark:text-emerald-300"
              : helper.variant === "rose"
              ? "border-red-200 bg-red-50/50 text-red-800 dark:border-red-900/30 dark:bg-red-950/10 dark:text-red-300"
              : "border-blue-200 bg-blue-50/50 text-blue-800 dark:border-blue-900/30 dark:bg-blue-950/10 dark:text-blue-300"
          }`}
        >
          <div>
            <span className="font-bold">{helper.title}:</span> {helper.desc}
          </div>
        </div>
      )}

      {showTimeInput && (
        <div className="grid gap-3 animate-in fade-in slide-in-from-top-1 duration-150 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="proposed-check-in-time" className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Proposed Check-In Time (WIB) <span className="text-red-500">*</span>
            </label>
            <Input
              id="proposed-check-in-time"
              name="proposedCheckInTime"
              type="time"
              required={showTimeInput}
              defaultValue="08:00"
              className="w-full h-9 bg-white dark:bg-zinc-950"
            />
            <p className="text-[10px] text-zinc-500">Enter estimated arrival time at the studio.</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="proposed-check-out-time" className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Proposed Check-Out Time (WIB) {isPastRecord ? <span className="text-red-500">*</span> : <span className="text-zinc-400">(optional)</span>}
            </label>
            <Input
              id="proposed-check-out-time"
              name="proposedCheckOutTime"
              type="time"
              required={isPastRecord}
              defaultValue={isPastRecord ? "17:00" : undefined}
              className="w-full h-9 bg-white dark:bg-zinc-950"
            />
            <p className="text-[10px] text-zinc-500">
              {isPastRecord
                ? "Past dates must include check-out time to complete the record."
                : "Can be left blank for today if not checked out yet."}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="attachment" className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Supporting Document / Attachment{" "}
          <span className="text-xs font-normal text-zinc-500">
            ({newStatus === "DISPENSATION" ? "required" : "optional"}, max 2MB)
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

      <div className="flex flex-col gap-1.5">
        <label htmlFor="reason" className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Reason for Correction <span className="text-red-500">*</span>
        </label>
        <Textarea
          id="reason"
          name="reason"
          placeholder="Example: Forgot to scan the QR check-in in the morning due to rush, but I arrived on time..."
          required
          rows={4}
          className="bg-white dark:bg-zinc-950"
        />
      </div>

      <Button type="submit" className="w-full mt-2">
        <PlusCircle className="size-4 mr-2" />
        Submit Correction
      </Button>
    </form>
  );
}
