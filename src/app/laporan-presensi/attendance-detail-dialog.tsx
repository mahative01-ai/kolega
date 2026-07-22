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
  MapPin,
  FileText,
  ShieldCheck,
  Building,
  Mail,
  Clock,
  AlertCircle,
  Hourglass,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
      <DialogContent className="max-h-[90vh] sm:max-w-2xl md:max-w-3xl overflow-hidden p-0 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 border-zinc-200 dark:border-zinc-800">
        <DialogHeader className="border-b border-zinc-150 px-6 pt-6 pb-5 dark:border-zinc-800">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              {/* Mood Avatar */}
              <div
                className={`flex size-16 shrink-0 items-center justify-center rounded-2xl border-2 shadow-inner text-3xl select-none ${mood.bgColor} ${mood.borderColor}`}
                title={mood.label}
              >
                {mood.emoji}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <DialogTitle className="text-xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                    {record.user.name}
                  </DialogTitle>
                  <Badge variant="outline" className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-[11px] text-zinc-500 dark:text-zinc-400 font-normal">
                    Mood: {mood.label}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-650 dark:text-zinc-400">
                  <span className="inline-flex items-center gap-1"><Mail className="size-3.5 text-zinc-400 dark:text-zinc-500" /> {record.user.email}</span>
                  <span className="inline-flex items-center gap-1"><Building className="size-3.5 text-zinc-400 dark:text-zinc-500" /> Home: {record.user.defaultStudio?.name || record.ownerStudio.name}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Badge className="border-blue-500/30 bg-blue-500/15 text-blue-700 dark:text-blue-300 text-[10px] font-semibold uppercase">
                    {record.user.role}
                  </Badge>
                  {record.user.memberStatus && (
                    <Badge className="border-sky-500/30 bg-sky-500/15 text-sky-700 dark:text-sky-300 text-[10px] font-semibold uppercase">
                      {record.user.memberStatus}
                    </Badge>
                  )}
                  <Badge className="border-zinc-500/30 bg-zinc-500/15 text-zinc-700 dark:text-zinc-300 text-[10px] font-semibold uppercase">
                    {record.workMode}
                  </Badge>
                  <Badge className={`text-[10px] font-semibold uppercase ${statusColor[record.status]}`}>
                    {statusLabel[record.status] ?? record.status}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[62vh] overflow-y-auto px-6 py-5">
          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-zinc-105 dark:bg-zinc-900 p-1 rounded-lg">
              <TabsTrigger value="summary" className="text-xs font-semibold py-1.5 cursor-pointer">
                Summary
              </TabsTrigger>
              <TabsTrigger value="location" className="text-xs font-semibold py-1.5 cursor-pointer">
                Location & Geofence
              </TabsTrigger>
              <TabsTrigger value="logs" className="text-xs font-semibold py-1.5 cursor-pointer">
                Audit Logs
              </TabsTrigger>
            </TabsList>

            {/* Summary Tab */}
            <TabsContent value="summary" className="space-y-4 pt-3">
              {/* Daily timing stats grid */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {/* Check-in */}
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/10 p-4 flex flex-col justify-between shadow-sm relative overflow-hidden">
                  <div className="flex items-center justify-between text-zinc-400 dark:text-zinc-500">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Check-in</span>
                    <Clock className="size-4 text-emerald-600 dark:text-emerald-500" />
                  </div>
                  <span className="mt-2 block text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    {formatTime(record.checkInAt)}
                  </span>
                </div>
                
                {/* Check-out */}
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/10 p-4 flex flex-col justify-between shadow-sm relative overflow-hidden">
                  <div className="flex items-center justify-between text-zinc-400 dark:text-zinc-500">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Check-out</span>
                    <Clock className="size-4 text-blue-600 dark:text-blue-500" />
                  </div>
                  <span className="mt-2 block text-xl font-bold text-blue-600 dark:text-blue-400">
                    {formatTime(record.checkOutAt)}
                  </span>
                </div>

                {/* Late */}
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/10 p-4 flex flex-col justify-between shadow-sm relative overflow-hidden">
                  <div className="flex items-center justify-between text-zinc-400 dark:text-zinc-500">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Late Time</span>
                    <AlertCircle className="size-4 text-orange-500" />
                  </div>
                  <div>
                    <span className={`mt-2 block text-xl font-bold ${record.lateMinutes > 0 ? "text-orange-600 dark:text-orange-450" : "text-zinc-600 dark:text-zinc-400"}`}>
                      {record.lateMinutes}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-medium">{record.lateMinutes > 0 ? "minutes" : "On time"}</span>
                  </div>
                </div>

                {/* Early out */}
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/10 p-4 flex flex-col justify-between shadow-sm relative overflow-hidden">
                  <div className="flex items-center justify-between text-zinc-400 dark:text-zinc-500">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Early Out</span>
                    <Hourglass className="size-4 text-amber-500" />
                  </div>
                  <div>
                    <span className={`mt-2 block text-xl font-bold ${record.earlyCheckoutMinutes > 0 ? "text-orange-600 dark:text-orange-450" : "text-zinc-600 dark:text-zinc-400"}`}>
                      {record.earlyCheckoutMinutes}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-medium">{record.earlyCheckoutMinutes > 0 ? "minutes" : "No early out"}</span>
                  </div>
                </div>
              </div>

              {/* Summary Details Card */}
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 space-y-3 shadow-sm">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 border-b pb-2">
                  <Calendar className="size-4 text-blue-600" />
                  Attendance Info
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-xs text-zinc-400 block font-medium">Date</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {formatDate(record.attendanceDate)}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-zinc-400 block font-medium">Default Studio</span>
                    <span className="font-semibold text-zinc-850 dark:text-zinc-200 flex items-center gap-1.5 mt-0.5">
                      <Building className="size-3.5 text-zinc-400" />
                      {record.user.defaultStudio?.name || record.ownerStudio.name}
                    </span>
                  </div>
                </div>
              </div>

              {/* WFH Journal */}
              {(record.workMode === "WFH" || record.wfhPlan || record.wfhReport) && (
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 space-y-4 shadow-sm">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 border-b pb-2">
                    <FileText className="size-4 text-sky-600" />
                    Work Journal & Morning Plan
                  </h4>
                  <div className="space-y-4 text-xs">
                    <div>
                      <span className="font-semibold text-zinc-550 block mb-1">Morning Work Plan:</span>
                      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-3 whitespace-pre-line text-zinc-700 dark:text-zinc-300 leading-relaxed font-sans">
                        {record.wfhPlan || "No plan submitted."}
                      </div>
                    </div>
                    <div>
                      <span className="font-semibold text-zinc-550 block mb-1">End-of-Day Work Report:</span>
                      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-3 whitespace-pre-line text-zinc-700 dark:text-zinc-300 leading-relaxed font-sans">
                        {record.wfhReport || "No report submitted."}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Location Tab */}
            <TabsContent value="location" className="space-y-4 pt-3">
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 space-y-4 shadow-sm">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 border-b pb-2">
                  <MapPin className="size-4 text-emerald-600" />
                  Location & Geofence Verification
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-xs text-zinc-400 block font-medium">Location Studio</span>
                    <span className="font-semibold text-zinc-850 dark:text-zinc-200 mt-1 block">
                      {record.locationStudio?.name ?? "Location not required"}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-zinc-400 block font-medium">Validation Status</span>
                    <div className="mt-1">
                      <Badge
                        variant="outline"
                        className={
                          record.locationValidationStatus === "OUTSIDE_RADIUS"
                            ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300 font-semibold"
                            : record.locationValidationStatus === "INSIDE_RADIUS"
                            ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-300 font-semibold"
                            : "font-semibold"
                        }
                      >
                        {formatLocationValidation(record.locationValidationStatus)}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-zinc-400 block font-medium">Distance to Studio</span>
                    <span className="font-semibold text-zinc-850 dark:text-zinc-200 mt-1 block">
                      {typeof record.distanceMeters === "number"
                        ? `${Math.round(record.distanceMeters)} meters`
                        : "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-zinc-400 block font-medium">GPS Coordinates (In / Out)</span>
                    <div className="text-xs text-zinc-650 dark:text-zinc-450 font-mono mt-1 space-y-1">
                      <p className="flex items-center gap-1.5">
                        <span className="w-8 font-semibold text-zinc-400">In:</span>
                        {record.checkInLatitude && record.checkInLongitude
                          ? `${record.checkInLatitude.toFixed(5)}, ${record.checkInLongitude.toFixed(5)}`
                          : "N/A"}
                      </p>
                      <p className="flex items-center gap-1.5">
                        <span className="w-8 font-semibold text-zinc-400">Out:</span>
                        {record.checkOutLatitude && record.checkOutLongitude
                          ? `${record.checkOutLatitude.toFixed(5)}, ${record.checkOutLongitude.toFixed(5)}`
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Audit Logs Tab */}
            <TabsContent value="logs" className="space-y-4 pt-3">
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 space-y-4 shadow-sm">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 border-b pb-2">
                  <ShieldCheck className="size-4 text-violet-600" />
                  Correction & Audit Logs
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-xs text-zinc-400 block font-medium">Manual Correction</span>
                    <div className="mt-1">
                      <Badge variant={record.isManualCorrection ? "secondary" : "outline"} className="text-[10px] font-semibold">
                        {record.isManualCorrection ? "Yes (Corrected)" : "No (Normal)"}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-zinc-400 block font-medium">Created By</span>
                    <span className="font-semibold text-zinc-850 dark:text-zinc-200 mt-1 block">
                      {record.createdBy?.name || "System"}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-zinc-400 block font-medium">Created At</span>
                    <span className="text-zinc-700 dark:text-zinc-300 mt-1 block">
                      {formatTimestamp(record.createdAt)}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-zinc-400 block font-medium">Updated At</span>
                    <span className="text-zinc-700 dark:text-zinc-300 mt-1 block">
                      {formatTimestamp(record.updatedAt)}
                    </span>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="border-t border-zinc-150 bg-zinc-50 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900/30">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
