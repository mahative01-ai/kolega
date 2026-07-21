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
    title: "Personal Leave Terms",
    desc: "Must be requested at least 1 day in advance before the work day begins. No supporting document required.",
    variant: "amber",
  },
  SICK: {
    title: "Sick Leave Terms",
    desc: "Requires uploading a valid official doctor's note. Can be submitted at latest on H+1 (before 07:00 AM). Without an attachment, status defaults to Personal Leave.",
    variant: "violet",
  },
  DISPENSATION: {
    title: "Dispensation Terms",
    desc: "Requires uploading an official support document (assignment letter, invitation, etc.). This status does not affect workday balance.",
    variant: "emerald",
  },
  LEAVE: {
    title: "Cuti Tahunan Terms",
    desc: "Must be requested at least 1 day in advance. Once approved, the system decrements your Annual Leave Balance.",
    variant: "rose",
  },
  WFH: {
    title: "Work From Home Terms",
    desc: "Only available to Team members (Interns are not allowed). You must write your morning WFH work plan on the day.",
    variant: "blue",
  },
};

export function RequestFormClient({ canRequestReplacementDay }: Props) {
  const [selectedType, setSelectedType] = useState<string>("PERMISSION");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);

  const guide = SYARAT_KETERANGAN[selectedType];
  const durationLabel = getDurationLabel(startDate, endDate);

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
          Request Type <span className="text-red-500">*</span>
        </label>
        <select
          id="request-type"
          name="type"
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="h-9 w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-3 text-sm outline-none focus:border-zinc-950 dark:focus:border-zinc-300 focus:ring-1 focus:ring-zinc-950 dark:focus:ring-zinc-300"
          required
        >
          <option value="PERMISSION">Personal Leave / Private</option>
          <option value="SICK">Official Sick Leave</option>
          <option value="DISPENSATION">Official Dispensation</option>
          {canRequestReplacementDay && (
            <option value="LEAVE">Annual Leave</option>
          )}
          <option value="WFH">Work From Home</option>
        </select>
      </div>

      {guide && (
        <div
          className={`flex gap-2 rounded-lg border p-3 text-xs leading-relaxed animate-in fade-in duration-200 ${guide.variant === "amber"
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
            Start Date <span className="text-red-500">*</span>
          </label>
          <Input
            id="start-date"
            name="startDate"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="end-date" className="text-sm font-medium">
            End Date <span className="text-xs font-normal text-zinc-500">(optional)</span>
          </label>
          <Input
            id="end-date"
            name="endDate"
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            min={startDate || undefined}
          />
        </div>
      </div>

      {durationLabel ? (
        <p
          className={`-mt-2 text-xs font-medium ${
            durationLabel === "Invalid date range"
              ? "text-red-600"
              : "text-zinc-500 dark:text-zinc-400"
          }`}
        >
          {durationLabel}
        </p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="reason" className="text-sm font-medium">
          Reason / Description <span className="text-red-500">*</span>
        </label>
        <Textarea
          id="reason"
          name="reason"
          placeholder="Briefly explain the reason for your request..."
          required
          rows={4}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="attachment" className="text-sm font-medium">
          File Attachment{" "}
          <span className="text-xs font-normal text-zinc-500">
            ({selectedType === "DISPENSATION" ? "required" : "optional"}, max 2MB)
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
        {loading ? "Submitting..." : "Submit Request"}
      </Button>
    </form>
  );
}

function getDurationLabel(startDate: string, endDate: string) {
  if (!startDate) {
    return "";
  }

  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate || startDate}T00:00:00.000Z`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return "Invalid date range";
  }

  const days =
    Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;

  return `${days} ${days === 1 ? "Day" : "Days"}`;
}
