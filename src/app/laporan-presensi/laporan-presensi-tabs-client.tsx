"use client";

import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AttendanceTableBodyClient } from "./attendance-table-body-client";
import { FileText, Home, ArrowUpDown, Edit2 } from "lucide-react";
import { getMood } from "@/lib/moods";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateJournalAction } from "./actions";
import { toast } from "sonner";


type SerializedRecord = {
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
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    currentMood?: string | null;
  };
  ownerStudio: {
    name: string;
  };
  locationStudio: {
    name: string;
  } | null;
  wfhPlan: string | null;
  wfhReport: string | null;
};

type Props = {
  records: SerializedRecord[];
  statusColor: Record<string, string>;
  statusLabel: Record<string, string>;
  studios?: { id: string; name: string }[];
  isSuperAdmin?: boolean;
};

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(dateStr));
}

function formatTime(timeStr: string | null) {
  if (!timeStr) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(timeStr));
}

export function LaporanPresensiTabsClient({
  records,
  statusColor,
  statusLabel,
  studios = [],
  isSuperAdmin = false,
}: Props) {
  const [sortField, setSortField] = useState<string>("date");
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [studioFilter, setStudioFilter] = useState("ALL");
  const [attendancePage, setAttendancePage] = useState(1);
  const attendancePageSize = 25;

  const [journalPage, setJournalPage] = useState(1);
  const journalPageSize = 25;
  const [searchQuery, setSearchQuery] = useState("");

  const [editingRecord, setEditingRecord] = useState<SerializedRecord | null>(null);
  const [planVal, setPlanVal] = useState("");
  const [reportVal, setReportVal] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openEditModal = (record: SerializedRecord) => {
    setEditingRecord(record);
    setPlanVal(record.wfhPlan || "");
    setReportVal(record.wfhReport || "");
  };

  const closeEditModal = () => {
    setEditingRecord(null);
    setPlanVal("");
    setReportVal("");
  };

  const handleSave = async () => {
    if (!editingRecord) return;
    setIsSubmitting(true);
    try {
      const res = await updateJournalAction(editingRecord.id, planVal, reportVal);
      if (res.success) {
        toast.success(res.message);
        
        // Update local object properties directly for instant local feedback
        editingRecord.wfhPlan = planVal.trim() || null;
        editingRecord.wfhReport = reportVal.trim() || null;

        closeEditModal();
      } else {
        toast.error("Gagal memperbarui jurnal.");
      }
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const studioTabs = useMemo(() => {
    return [
      { value: "ALL", label: "All" },
      ...studios.map((s) => ({ value: s.name, label: s.name.replace(" Studio", "") })),
    ];
  }, [studios]);

  const sortedRecords = useMemo(() => {
    const scopedRecords =
      studioFilter === "ALL"
        ? records
        : records.filter((record) => record.ownerStudio.name === studioFilter);

    const searchedRecords = searchQuery.trim()
      ? scopedRecords.filter(
          (record) =>
            record.user.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
            record.user.email.toLowerCase().includes(searchQuery.toLowerCase().trim())
        )
      : scopedRecords;

    return [...searchedRecords].sort((a, b) => {
      let aVal: string | number = "";
      let bVal: string | number = "";

      if (sortField === "name") {
        aVal = a.user.name.toLowerCase();
        bVal = b.user.name.toLowerCase();
      } else if (sortField === "date") {
        aVal = new Date(a.attendanceDate).getTime();
        bVal = new Date(b.attendanceDate).getTime();
      } else if (sortField === "studio") {
        aVal = a.ownerStudio.name.toLowerCase();
        bVal = b.ownerStudio.name.toLowerCase();
      } else if (sortField === "validation") {
        aVal = a.locationValidationStatus;
        bVal = b.locationValidationStatus;
      } else if (sortField === "distance") {
        aVal = a.distanceMeters ?? 0;
        bVal = b.distanceMeters ?? 0;
      } else if (sortField === "mode") {
        aVal = a.workMode;
        bVal = b.workMode;
      } else if (sortField === "status") {
        aVal = a.status;
        bVal = b.status;
      } else if (sortField === "checkin") {
        aVal = a.checkInAt ? new Date(a.checkInAt).getTime() : 0;
        bVal = b.checkInAt ? new Date(b.checkInAt).getTime() : 0;
      } else if (sortField === "checkout") {
        aVal = a.checkOutAt ? new Date(a.checkOutAt).getTime() : 0;
        bVal = b.checkOutAt ? new Date(b.checkOutAt).getTime() : 0;
      } else if (sortField === "late") {
        aVal = a.lateMinutes;
        bVal = b.lateMinutes;
      } else if (sortField === "early") {
        aVal = a.earlyCheckoutMinutes;
        bVal = b.earlyCheckoutMinutes;
      }

      if (aVal < bVal) return sortAsc ? -1 : 1;
      if (aVal > bVal) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [records, sortField, sortAsc, studioFilter, searchQuery]);

  const attendanceTotalPages = Math.max(1, Math.ceil(sortedRecords.length / attendancePageSize));
  const paginatedAttendanceRecords = sortedRecords.slice(
    (Math.min(attendancePage, attendanceTotalPages) - 1) * attendancePageSize,
    Math.min(attendancePage, attendanceTotalPages) * attendancePageSize
  );

  const journalRecords = sortedRecords.filter((r) => r.workMode === "WFH" || r.workMode === "WFO");
  const journalTotalPages = Math.max(1, Math.ceil(journalRecords.length / journalPageSize));
  const paginatedJournalRecords = journalRecords.slice(
    (Math.min(journalPage, journalTotalPages) - 1) * journalPageSize,
    Math.min(journalPage, journalTotalPages) * journalPageSize
  );

  return (
    <div className="space-y-3 w-full">
      {isSuperAdmin && (
        <div className="flex w-fit max-w-full flex-wrap rounded-lg bg-zinc-100 p-1 dark:bg-zinc-900">
          {studioTabs.map((studio) => (
            <button
              key={studio.value}
              onClick={() => {
                setStudioFilter(studio.value);
                setAttendancePage(1);
                setJournalPage(1);
              }}
              type="button"
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                studioFilter === studio.value
                  ? "bg-white text-zinc-950 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                  : "text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
              }`}
            >
              {studio.label}
            </button>
          ))}
        </div>
      )}

      <Tabs defaultValue="attendance-log" className="w-full space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <TabsList className="grid w-full max-w-md grid-cols-2 bg-zinc-100 dark:bg-zinc-900">
            <TabsTrigger value="attendance-log" className="flex items-center gap-1.5">
              <FileText className="size-4" />
              Attendance Log
            </TabsTrigger>
            <TabsTrigger value="journals" className="flex items-center gap-1.5">
              <Home className="size-4" />
              Work Journal (WFO & WFH)
            </TabsTrigger>
          </TabsList>
          <div className="w-full sm:max-w-xs">
            <input
              type="text"
              placeholder="Search name or email..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setAttendancePage(1);
                setJournalPage(1);
              }}
              className="h-9 w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 px-3 text-sm focus:outline-none"
            />
          </div>
        </div>

        <TabsContent value="attendance-log">
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-zinc-900 dark:text-zinc-50">
                <FileText className="size-5 text-blue-700 dark:text-blue-400" />
                Attendance Details
              </CardTitle>
              <CardDescription className="text-zinc-500 dark:text-zinc-400">
                Detailed list of check-in and check-out logs for team members.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30px]"></TableHead>
                    <TableHead>
                      <button type="button" onClick={() => handleSort("name")} className="flex items-center gap-1 hover:text-zinc-950 dark:hover:text-zinc-50 transition-colors">
                        Name
                        <ArrowUpDown className="size-3" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button type="button" onClick={() => handleSort("date")} className="flex items-center gap-1 hover:text-zinc-950 dark:hover:text-zinc-50 transition-colors">
                        Date
                        <ArrowUpDown className="size-3" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button type="button" onClick={() => handleSort("studio")} className="flex items-center gap-1 hover:text-zinc-950 dark:hover:text-zinc-50 transition-colors">
                        Default Studio
                        <ArrowUpDown className="size-3" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button type="button" onClick={() => handleSort("mode")} className="flex items-center gap-1 hover:text-zinc-950 dark:hover:text-zinc-50 transition-colors">
                        Mode
                        <ArrowUpDown className="size-3" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button type="button" onClick={() => handleSort("status")} className="flex items-center gap-1 hover:text-zinc-950 dark:hover:text-zinc-50 transition-colors">
                        Status
                        <ArrowUpDown className="size-3" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button type="button" onClick={() => handleSort("checkin")} className="flex items-center gap-1 hover:text-zinc-950 dark:hover:text-zinc-50 transition-colors">
                        In Time
                        <ArrowUpDown className="size-3" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button type="button" onClick={() => handleSort("checkout")} className="flex items-center gap-1 hover:text-zinc-950 dark:hover:text-zinc-50 transition-colors">
                        Out Time
                        <ArrowUpDown className="size-3" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button type="button" onClick={() => handleSort("late")} className="flex items-center gap-1 hover:text-zinc-950 dark:hover:text-zinc-50 transition-colors">
                        Late
                        <ArrowUpDown className="size-3" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button type="button" onClick={() => handleSort("early")} className="flex items-center gap-1 hover:text-zinc-950 dark:hover:text-zinc-50 transition-colors">
                        Early Out
                        <ArrowUpDown className="size-3" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button type="button" onClick={() => handleSort("validation")} className="flex items-center gap-1 hover:text-zinc-950 dark:hover:text-zinc-50 transition-colors">
                        Validation
                        <ArrowUpDown className="size-3" />
                      </button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <AttendanceTableBodyClient
                  records={paginatedAttendanceRecords}
                  statusColor={statusColor}
                  statusLabel={statusLabel}
                />
              </Table>
            </CardContent>
            {sortedRecords.length > attendancePageSize && (
              <div className="flex flex-col gap-2 border-t border-zinc-100 px-4 py-3 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  Showing {(attendancePage - 1) * attendancePageSize + 1}-{Math.min(attendancePage * attendancePageSize, sortedRecords.length)} of {sortedRecords.length} records
                </span>
                <div className="flex items-center gap-2">
                  <button type="button" disabled={attendancePage <= 1} onClick={() => setAttendancePage((prev) => Math.max(1, prev - 1))} className="rounded-md border border-zinc-200 px-2 py-1 disabled:opacity-50 dark:border-zinc-800">Previous</button>
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">Page {attendancePage} / {attendanceTotalPages}</span>
                  <button type="button" disabled={attendancePage >= attendanceTotalPages} onClick={() => setAttendancePage((prev) => Math.min(attendanceTotalPages, prev + 1))} className="rounded-md border border-zinc-200 px-2 py-1 disabled:opacity-50 dark:border-zinc-800">Next</button>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="journals">
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-zinc-900 dark:text-zinc-50">
                <Home className="size-5 text-sky-700 dark:text-sky-400" />
                Daily Work Journal (WFO & WFH)
              </CardTitle>
              <CardDescription className="text-zinc-500 dark:text-zinc-400">
                Manage morning work plans and end-of-day reports of team members (Team & Intern).
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Default Studio</TableHead>
                    <TableHead className="w-[30%]">Morning Work Plan</TableHead>
                    <TableHead className="w-[30%]">End-of-Day Report / Journal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedJournalRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-sm text-zinc-500">
                        No daily journals found for the selected filter.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedJournalRecords.map((item) => (
                      <TableRow key={item.id} className="align-top hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10">
                        <TableCell className="font-medium pt-3">
                          <div className="flex items-center gap-2">
                            <div className={`size-8 rounded-full flex items-center justify-center text-lg shrink-0 border select-none ${getMood(item.user.currentMood).bgColor} ${getMood(item.user.currentMood).borderColor}`} title={getMood(item.user.currentMood).label}>
                              {getMood(item.user.currentMood).emoji}
                            </div>
                            <div>
                              <div className="text-zinc-900 dark:text-zinc-100">{item.user.name}</div>
                              <div className="text-xs text-zinc-500 dark:text-zinc-400">{item.user.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="pt-3">{formatDate(item.attendanceDate)}</TableCell>
                        <TableCell className="pt-3">
                          <Badge variant="outline" className="text-[10px]">
                            {item.workMode}
                          </Badge>
                        </TableCell>
                        <TableCell className="pt-3">{item.ownerStudio.name}</TableCell>
                        <TableCell className="pt-3 pb-3">
                          {item.workMode === "WFH" ? (
                            <div className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/10 p-2.5 text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-line leading-relaxed">
                              {item.wfhPlan || "—"}
                            </div>
                          ) : (
                            <span className="text-zinc-400 text-xs italic">WFO (No morning work plan)</span>
                          )}
                        </TableCell>
                        <TableCell className="pt-3 pb-3">
                          <div className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/10 p-2.5 text-xs text-zinc-700 dark:text-zinc-350 whitespace-pre-line leading-relaxed">
                            {item.wfhReport || "—"}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
            {journalRecords.length > journalPageSize && (
              <div className="flex flex-col gap-2 border-t border-zinc-100 px-4 py-3 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  Showing {(journalPage - 1) * journalPageSize + 1}-{Math.min(journalPage * journalPageSize, journalRecords.length)} of {journalRecords.length} records
                </span>
                <div className="flex items-center gap-2">
                  <button type="button" disabled={journalPage <= 1} onClick={() => setJournalPage((prev) => Math.max(1, prev - 1))} className="rounded-md border border-zinc-200 px-2 py-1 disabled:opacity-50 dark:border-zinc-800">Previous</button>
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">Page {journalPage} / {journalTotalPages}</span>
                  <button type="button" disabled={journalPage >= journalTotalPages} onClick={() => setJournalPage((prev) => Math.min(journalTotalPages, prev + 1))} className="rounded-md border border-zinc-200 px-2 py-1 disabled:opacity-50 dark:border-zinc-800">Next</button>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
