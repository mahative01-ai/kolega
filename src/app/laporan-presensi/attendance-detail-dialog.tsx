"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getMood } from "@/lib/moods";
import {
  Calendar,
  Clock,
  MapPin,
  FileText,
  ShieldCheck,
  Building,
} from "lucide-react";

export type DetailRecord = {
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
  checkInLatitude?: number | null;
  checkInLongitude?: number | null;
  checkOutLatitude?: number | null;
  checkOutLongitude?: number | null;
  isManualCorrection?: boolean;
  mood?: string | null;
  moodNote?: string | null;
  createdAt?: string;
  updatedAt?: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    memberStatus?: string;
    currentMood?: string | null;
    defaultStudio?: { name: string } | null;
  };
  createdBy?: { name: string } | null;
  ownerStudio: {
    name: string;
  };
  locationStudio: {
    name: string;
  } | null;
  wfhPlan?: string | null;
  wfhReport?: string | null;
};

type Props = {
  record: DetailRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statusColor: Record<string, string>;
  statusLabel: Record<string, string>;
};

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(dateStr));
}

function formatTime(dateStr: string | null) {
  if (!dateStr) return "-";
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(dateStr));
}

function formatTimestamp(dateStr?: string) {
  if (!dateStr) return "-";
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(dateStr));
}

function formatLocationValidation(status: string) {
  if (status === "INSIDE_RADIUS") return "Inside Studio Radius";
  if (status === "OUTSIDE_RADIUS") return "Outside Studio Radius";
  if (status === "NOT_REQUIRED") return "Location Not Required";
  return "Unavailable / Pending";
}

export function AttendanceDetailDialog({
  record,
  open,
  onOpenChange,
  statusColor,
  statusLabel,
}: Props) {
  if (!record) return null;

  const mood = getMood(record.mood || record.user.currentMood);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center gap-3">
            <div
              className={`size-12 rounded-full flex items-center justify-center text-2xl shrink-0 border select-none ${mood.bgColor} ${mood.borderColor}`}
              title={mood.label}
            >
              {mood.emoji}
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                {record.user.name}
              </DialogTitle>
              <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 mt-1">
                <span>{record.user.email}</span>
                <span>•</span>
                <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                  {record.user.role}
                </Badge>
                {record.user.memberStatus && (
                  <Badge variant="secondary" className="text-[10px] uppercase font-semibold">
                    {record.user.memberStatus}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Attendance Summary */}
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              <Calendar className="size-4 text-blue-600" />
              Attendance Summary
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <div>
                <span className="text-xs text-zinc-400 block">Date</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {formatDate(record.attendanceDate)}
                </span>
              </div>
              <div>
                <span className="text-xs text-zinc-400 block">Work Mode</span>
                <Badge variant="outline" className="mt-0.5">
                  {record.workMode}
                </Badge>
              </div>
              <div>
                <span className="text-xs text-zinc-400 block">Status</span>
                <Badge variant="secondary" className={`mt-0.5 ${statusColor[record.status]}`}>
                  {statusLabel[record.status] ?? record.status}
                </Badge>
              </div>
              <div>
                <span className="text-xs text-zinc-400 block">Check-In Time</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatTime(record.checkInAt)}
                </span>
              </div>
              <div>
                <span className="text-xs text-zinc-400 block">Check-Out Time</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {formatTime(record.checkOutAt)}
                </span>
              </div>
              <div>
                <span className="text-xs text-zinc-400 block">Default Studio</span>
                <span className="font-medium text-zinc-800 dark:text-zinc-200 flex items-center gap-1">
                  <Building className="size-3 text-zinc-400" />
                  {record.user.defaultStudio?.name || record.ownerStudio.name}
                </span>
              </div>
            </div>
          </div>

          {/* Location Details */}
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              <MapPin className="size-4 text-emerald-600" />
              Location & Geofence Verification
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-xs text-zinc-400 block">Location Studio</span>
                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                  {record.locationStudio?.name ?? "Location not required"}
                </span>
              </div>
              <div>
                <span className="text-xs text-zinc-400 block">Validation Status</span>
                <Badge
                  variant="outline"
                  className={
                    record.locationValidationStatus === "OUTSIDE_RADIUS"
                      ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300"
                      : record.locationValidationStatus === "INSIDE_RADIUS"
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-300"
                      : ""
                  }
                >
                  {formatLocationValidation(record.locationValidationStatus)}
                </Badge>
              </div>
              <div>
                <span className="text-xs text-zinc-400 block">Distance to Studio</span>
                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                  {typeof record.distanceMeters === "number"
                    ? `${Math.round(record.distanceMeters)} meters`
                    : "N/A"}
                </span>
              </div>
              <div>
                <span className="text-xs text-zinc-400 block">GPS Coordinates (In / Out)</span>
                <span className="text-xs text-zinc-600 dark:text-zinc-400 font-mono">
                  {record.checkInLatitude && record.checkInLongitude
                    ? `In: ${record.checkInLatitude.toFixed(5)}, ${record.checkInLongitude.toFixed(5)}`
                    : "In: N/A"}
                  {" | "}
                  {record.checkOutLatitude && record.checkOutLongitude
                    ? `Out: ${record.checkOutLatitude.toFixed(5)}, ${record.checkOutLongitude.toFixed(5)}`
                    : "Out: N/A"}
                </span>
              </div>
            </div>
          </div>

          {/* Time Policy Metrics */}
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              <Clock className="size-4 text-orange-600" />
              Time Policy Metrics
            </h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-xs text-zinc-400 block">Late Minutes</span>
                <span
                  className={
                    record.lateMinutes > 0
                      ? "font-bold text-orange-600 dark:text-orange-400"
                      : "text-zinc-600 dark:text-zinc-400"
                  }
                >
                  {record.lateMinutes > 0 ? `${record.lateMinutes} minutes` : "0 (On Time)"}
                </span>
              </div>
              <div>
                <span className="text-xs text-zinc-400 block">Early Checkout Minutes</span>
                <span
                  className={
                    record.earlyCheckoutMinutes > 0
                      ? "font-bold text-orange-600 dark:text-orange-400"
                      : "text-zinc-600 dark:text-zinc-400"
                  }
                >
                  {record.earlyCheckoutMinutes > 0
                    ? `${record.earlyCheckoutMinutes} minutes`
                    : "0"}
                </span>
              </div>
            </div>
          </div>

          {/* WFH / Work Journal */}
          {(record.workMode === "WFH" || record.wfhPlan || record.wfhReport) && (
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                <FileText className="size-4 text-sky-600" />
                Work Journal & Morning Plan
              </h4>
              <div className="space-y-3 text-xs">
                {record.workMode === "WFH" && (
                  <div>
                    <span className="font-semibold text-zinc-500 block mb-1">Morning Work Plan:</span>
                    <div className="rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-2.5 whitespace-pre-line text-zinc-700 dark:text-zinc-300">
                      {record.wfhPlan || "No plan submitted."}
                    </div>
                  </div>
                )}
                <div>
                  <span className="font-semibold text-zinc-500 block mb-1">End-of-Day Work Report:</span>
                  <div className="rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-2.5 whitespace-pre-line text-zinc-700 dark:text-zinc-300">
                    {record.wfhReport || "No report submitted."}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Audit & Admin Metadata */}
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-violet-600" />
              Correction & Audit Logs
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-zinc-400 block">Manual Correction</span>
                <Badge variant={record.isManualCorrection ? "secondary" : "outline"} className="mt-0.5 text-[10px]">
                  {record.isManualCorrection ? "Yes (Corrected)" : "No (Normal)"}
                </Badge>
              </div>
              <div>
                <span className="text-zinc-400 block">Created By</span>
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  {record.createdBy?.name || "System"}
                </span>
              </div>
              <div>
                <span className="text-zinc-400 block">Created At</span>
                <span className="text-zinc-700 dark:text-zinc-300">
                  {formatTimestamp(record.createdAt)}
                </span>
              </div>
              <div>
                <span className="text-zinc-400 block">Updated At</span>
                <span className="text-zinc-700 dark:text-zinc-300">
                  {formatTimestamp(record.updatedAt)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
