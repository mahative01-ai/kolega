"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Home, Calendar, Clock, BookOpen, CheckCircle, AlertCircle, Edit2, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { updateOwnJournalAction, deleteOwnJournalAction } from "./actions";
import { toast } from "sonner";

type SerializedRecord = {
  id: string;
  attendanceDate: string;
  workMode: string;
  status: string;
  wfhPlan: string | null;
  wfhReport: string | null;
  checkInAt: string | null;
  checkOutAt: string | null;
  ownerStudio: {
    name: string;
  };
};

type Props = {
  initialRecords: SerializedRecord[];
  monthKey: string;
  monthOptions: { key: string; label: string }[];
  monthLabel: string;
};

function formatTime(dateStr: string | null) {
  if (!dateStr) return "-";
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(dateStr));
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeZone: "Asia/Jakarta",
  }).format(new Date(dateStr));
}

const STATUS_LABELS: Record<string, string> = {
  PRESENT: "Present",
  ON_TIME: "Present",
  LATE: "Late",
  WFH: "WFH",
  PERMISSION: "Permission",
  SICK: "Sick Leave",
  DISPENSATION: "Dispensation",
  LEAVE: "On Leave",
  ALPHA: "Absent",
  HOLIDAY: "Holiday",
  OFF_DAY: "Off Day",
};

const STATUS_COLORS: Record<string, string> = {
  PRESENT: "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900",
  ON_TIME: "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900",
  LATE: "bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900",
  WFH: "bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-900",
  PERMISSION: "bg-yellow-100 dark:bg-yellow-950/50 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-900",
  SICK: "bg-violet-100 dark:bg-violet-950/50 text-violet-800 dark:text-violet-300 border-violet-200 dark:border-violet-900",
  LEAVE: "bg-sky-100 dark:bg-sky-950/50 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-900",
  ALPHA: "bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-300 border-red-200 dark:border-red-900",
  HOLIDAY: "bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700",
  OFF_DAY: "bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700",
};

function getNonWorkingText(status: string) {
  switch (status) {
    case "ALPHA": return "Absent (Alpha) - Journal is locked.";
    case "SICK": return "Sick Leave - Journal is locked.";
    case "LEAVE": return "On Leave - Journal is locked.";
    case "PERMISSION": return "Permission - Journal is locked.";
    default: return "Journal is locked for non-working day.";
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "An error occurred.";
}

export function LaporanWfhClient({ initialRecords, monthKey, monthOptions, monthLabel }: Props) {
  const [records, setRecords] = useState<SerializedRecord[]>(initialRecords);
  const [editingRecord, setEditingRecord] = useState<SerializedRecord | null>(null);
  const [planVal, setPlanVal] = useState("");
  const [reportVal, setReportVal] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter & Pagination state
  const [selectedDate, setSelectedDate] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const filteredRecords = useMemo(() => {
    if (!selectedDate) return records;
    return records.filter((r) => r.attendanceDate.split("T")[0] === selectedDate);
  }, [records, selectedDate]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const paginatedRecords = useMemo(() => {
    const safePage = Math.min(page, totalPages);
    return filteredRecords.slice((safePage - 1) * pageSize, safePage * pageSize);
  }, [filteredRecords, page, totalPages]);

  const handleDelete = async (recordId: string) => {
    if (!confirm("Are you sure you want to delete the journal for this date? The work plan and report will be cleared.")) return;
    try {
      const res = await deleteOwnJournalAction(recordId);
      if (res.success) {
        toast.success(res.message);
        setRecords((prev) =>
          prev.map((r) =>
            r.id === recordId ? { ...r, wfhPlan: null, wfhReport: null } : r
          )
        );
      } else {
        toast.error("Failed to delete journal.");
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

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
      const res = await updateOwnJournalAction(editingRecord.id, planVal, reportVal);
      if (res.success) {
        toast.success(res.message);
        
        // Update client-side local state
        setRecords((prev) =>
          prev.map((r) =>
            r.id === editingRecord.id
              ? { ...r, wfhPlan: planVal.trim() || null, wfhReport: reportVal.trim() || null }
              : r
          )
        );

        closeEditModal();
      } else {
        toast.error("Failed to update journal.");
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filter Section */}
      <Card className="shadow-none border-zinc-200 dark:border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-zinc-900 dark:text-zinc-50">
            <Calendar className="size-4 text-blue-700 dark:text-blue-400" />
            Work Journal Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap items-end gap-3">
              <form method="GET" className="flex items-end gap-2">
                <div className="grid gap-1">
                  <label className="text-[11px] font-medium text-zinc-500">Select Month</label>
                  <select
                    name="month"
                    defaultValue={monthKey}
                    className="h-9 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 px-3 text-sm focus:outline-none"
                  >
                    {monthOptions.map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <Button type="submit">Show Month</Button>
              </form>

              <div className="grid gap-1">
                <label className="text-[11px] font-medium text-zinc-500">Pick Date</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      setPage(1);
                    }}
                    className="h-9 w-40 text-xs border-zinc-200 dark:border-zinc-800"
                  />
                  {selectedDate && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedDate("");
                        setPage(1);
                      }}
                      className="h-9 text-xs"
                    >
                      Reset Date
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Records List */}
      <Card className="shadow-none border-zinc-200 dark:border-zinc-800">
        <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <CardTitle className="text-base flex items-center gap-2 text-zinc-900 dark:text-zinc-50">
            <Home className="size-5 text-blue-700 dark:text-blue-400" />
            WFO & WFH Work Journal ({monthLabel})
          </CardTitle>
          <CardDescription className="text-zinc-500 dark:text-zinc-400">
            Found {filteredRecords.length} attendance & journal records.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {filteredRecords.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="size-8 text-zinc-300 dark:text-zinc-700 mx-auto mb-2" />
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">No attendance history found for this filter.</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {paginatedRecords.map((record) => {
                const isWfh = record.workMode === "WFH";
                const hasCheckOut = !!record.checkOutAt;
                const isNonWorking = ["ALPHA", "SICK", "LEAVE", "PERMISSION"].includes(record.status);

                return (
                  <div key={record.id} className="p-5 space-y-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 transition-colors">
                    {/* Date & Mode Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {formatDate(record.attendanceDate)}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            isWfh
                              ? "bg-blue-50/50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-900"
                              : "bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900"
                          }`}
                        >
                          {record.workMode}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            STATUS_COLORS[record.status] || "bg-zinc-100 text-zinc-800 border-zinc-200"
                          }`}
                        >
                          {STATUS_LABELS[record.status] || record.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 mr-2">
                          <span className="flex items-center gap-1">
                            <Clock className="size-3 text-zinc-400" />
                            In: <span className="font-semibold text-zinc-700 dark:text-zinc-300">{formatTime(record.checkInAt)}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="size-3 text-zinc-400" />
                            Out: <span className="font-semibold text-zinc-700 dark:text-zinc-300">{formatTime(record.checkOutAt)}</span>
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditModal(record)}
                          className="size-8 rounded border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent"
                          title={isNonWorking ? "Cannot edit journal on non-working days" : "Write/Edit Journal"}
                          disabled={isNonWorking}
                        >
                          <Edit2 className="size-3.5 text-blue-600 dark:text-blue-400" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(record.id)}
                          className="size-8 rounded border border-zinc-200 dark:border-zinc-800 hover:bg-red-50 hover:border-red-200 dark:hover:bg-red-950/20 disabled:opacity-30 disabled:hover:bg-transparent"
                          title={isNonWorking ? "Cannot delete journal on non-working days" : "Delete Journal"}
                          disabled={isNonWorking || (!record.wfhPlan && !record.wfhReport)}
                        >
                          <Trash2 className="size-3.5 text-red-600 dark:text-red-400" />
                        </Button>
                      </div>
                    </div>

                    {/* Content: Plan vs Report/Journal */}
                    <div className="grid gap-4 md:grid-cols-2">
                      {/* Left Block: Plan for WFH or Studio info for WFO */}
                      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/10 p-3.5 space-y-1.5">
                        {isWfh ? (
                          <>
                            <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                              <BookOpen className="size-3 text-zinc-400" />
                              MORNING WORK PLAN
                            </h4>
                            {isNonWorking ? (
                              record.wfhPlan ? (
                                <div className="space-y-2">
                                  <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-line leading-relaxed">
                                    {record.wfhPlan}
                                  </p>
                                  <span className="inline-flex items-center gap-1 text-xs text-zinc-400 italic">
                                    <AlertCircle className="size-3" /> Locked (Non-working day)
                                  </span>
                                </div>
                              ) : (
                                <p className="text-sm text-zinc-400 dark:text-zinc-500 italic">
                                  No work plan required.
                                </p>
                              )
                            ) : (
                              <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-line leading-relaxed">
                                {record.wfhPlan || "No work plan submitted."}
                              </p>
                            )}
                          </>
                        ) : (
                          <>
                            <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                              <Home className="size-3 text-zinc-400" />
                              ATTENDANCE LOCATION
                            </h4>
                            <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                              WFO attendance at <span className="font-semibold">{record.ownerStudio.name}</span>
                            </p>
                          </>
                        )}
                      </div>

                      {/* Right Block: Report/Journal */}
                      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/10 p-3.5 space-y-1.5">
                        <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                          <CheckCircle className="size-3 text-zinc-400" />
                          {isWfh ? "END-OF-DAY REPORT" : "WFO JOURNAL / REPORT"}
                        </h4>
                        {isNonWorking ? (
                          record.wfhReport ? (
                            <div className="space-y-2">
                              <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-line leading-relaxed">
                                {record.wfhReport}
                              </p>
                              <span className="inline-flex items-center gap-1 text-xs text-zinc-400 italic">
                                <AlertCircle className="size-3" /> Locked (Non-working day)
                              </span>
                            </div>
                          ) : (
                            <p className="text-sm text-zinc-400 dark:text-zinc-500 italic">
                              {getNonWorkingText(record.status)}
                            </p>
                          )
                        ) : isWfh && !hasCheckOut ? (
                          <div className="flex items-center gap-1.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 rounded px-2.5 w-fit">
                            <AlertCircle className="size-3.5" />
                            In Progress / Not Checked Out
                          </div>
                        ) : (
                          <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-line leading-relaxed">
                            {record.wfhReport || (isWfh ? "No end-of-day report submitted." : "No WFO journal submitted.")}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {filteredRecords.length > pageSize && (
            <div className="flex items-center justify-between p-4 border-t border-zinc-100 dark:border-zinc-800">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filteredRecords.length)} of {filteredRecords.length} entries
              </p>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-8 px-3 text-xs"
                >
                  <ChevronLeft className="size-3.5 mr-1" /> Prev
                </Button>
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 px-1">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="h-8 px-3 text-xs"
                >
                  Next <ChevronRight className="size-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal Dialog */}
      <Dialog open={!!editingRecord} onOpenChange={(open) => !open && closeEditModal()}>
        <DialogContent className="sm:max-w-[500px] border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
          <DialogHeader>
            <DialogTitle className="text-zinc-900 dark:text-zinc-50">Edit Work Journal</DialogTitle>
            <DialogDescription className="text-zinc-500 dark:text-zinc-400">
              Update your work plan or report for {editingRecord && formatDate(editingRecord.attendanceDate)}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {editingRecord?.workMode === "WFH" && (
              <div className="space-y-2">
                <Label htmlFor="client-plan" className="text-xs font-semibold text-zinc-650 dark:text-zinc-400">Morning Work Plan</Label>
                <Textarea
                  id="client-plan"
                  placeholder="Write your morning work plan..."
                  value={planVal}
                  onChange={(e) => setPlanVal(e.target.value)}
                  rows={4}
                  className="resize-none border-zinc-200 dark:border-zinc-800 text-zinc-850 dark:text-zinc-200 focus-visible:ring-blue-500"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="client-report" className="text-xs font-semibold text-zinc-650 dark:text-zinc-400">
                {editingRecord?.workMode === "WFH" ? "End-of-Day Report" : "WFO Journal / Report"}
              </Label>
              <Textarea
                id="client-report"
                placeholder={editingRecord?.workMode === "WFH" ? "Write your end-of-day report..." : "Write your WFO journal..."}
                value={reportVal}
                onChange={(e) => setReportVal(e.target.value)}
                rows={4}
                className="resize-none border-zinc-200 dark:border-zinc-800 text-zinc-850 dark:text-zinc-200 focus-visible:ring-blue-500"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeEditModal} disabled={isSubmitting} className="border-zinc-200 dark:border-zinc-800">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSubmitting} className="bg-blue-700 hover:bg-blue-800 text-white dark:bg-blue-600 dark:hover:bg-blue-700">
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
