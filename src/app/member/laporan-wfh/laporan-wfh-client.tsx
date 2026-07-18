"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Home, Calendar, Clock, BookOpen, CheckCircle, AlertCircle, Edit2, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { updateOwnJournalAction, createOwnJournalAction, deleteOwnJournalAction } from "./actions";
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
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(dateStr));
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "full",
    timeZone: "Asia/Jakarta",
  }).format(new Date(dateStr));
}

export function LaporanWfhClient({ initialRecords, monthKey, monthOptions, monthLabel }: Props) {
  const [records, setRecords] = useState<SerializedRecord[]>(initialRecords);
  const [editingRecord, setEditingRecord] = useState<SerializedRecord | null>(null);
  const [planVal, setPlanVal] = useState("");
  const [reportVal, setReportVal] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create Modal State
  const [createOpen, setCreateOpen] = useState(false);
  const [createDate, setCreateDate] = useState(() => {
    const today = new Date();
    return today.toLocaleDateString("en-CA"); // YYYY-MM-DD format in local time
  });
  const [createMode, setCreateMode] = useState<"WFO" | "WFH">("WFO");
  const [createPlan, setCreatePlan] = useState("");
  const [createReport, setCreateReport] = useState("");

  const handleCreateSubmit = async () => {
    if (!createDate) {
      toast.error("Tanggal wajib dipilih.");
      return;
    }
    if (!createReport.trim()) {
      toast.error("Laporan / Jurnal wajib diisi.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await createOwnJournalAction(createDate, createMode, createPlan, createReport);
      if (res.success) {
        toast.success(res.message);
        setCreateOpen(false);
        setCreatePlan("");
        setCreateReport("");
        // Reload to update RSC query
        window.location.reload();
      } else {
        toast.error("Gagal membuat jurnal.");
      }
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (recordId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus jurnal untuk tanggal ini? Rencana dan hasil kerja akan dikosongkan.")) return;
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
        toast.error("Gagal menghapus jurnal.");
      }
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan.");
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
        toast.error("Gagal memperbarui jurnal.");
      }
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan.");
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
            Pilih Bulan Laporan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <form method="GET" className="flex flex-wrap items-end gap-3">
              <div className="grid gap-1.5">
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
              <Button type="submit">Tampilkan</Button>
            </form>
            <Button
              onClick={() => setCreateOpen(true)}
              className="bg-blue-700 hover:bg-blue-800 text-white dark:bg-blue-600 dark:hover:bg-blue-700"
            >
              + Buat Jurnal Baru
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Records List */}
      <Card className="shadow-none border-zinc-200 dark:border-zinc-800">
        <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <CardTitle className="text-base flex items-center gap-2 text-zinc-900 dark:text-zinc-50">
            <Home className="size-5 text-blue-700 dark:text-blue-400" />
            Riwayat Jurnal Kerja WFO & WFH ({monthLabel})
          </CardTitle>
          <CardDescription className="text-zinc-500 dark:text-zinc-400">
            Ditemukan {records.length} catatan presensi pada bulan ini.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {records.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="size-8 text-zinc-300 dark:text-zinc-700 mx-auto mb-2" />
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Tidak ada riwayat presensi pada bulan ini.</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {records.map((record) => {
                const isWfh = record.workMode === "WFH";
                const hasCheckOut = !!record.checkOutAt;

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
                          className="size-8 rounded border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          title="Tulis/Edit Jurnal"
                        >
                          <Edit2 className="size-3.5 text-blue-600 dark:text-blue-400" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(record.id)}
                          className="size-8 rounded border border-zinc-200 dark:border-zinc-800 hover:bg-red-50 hover:border-red-200 dark:hover:bg-red-950/20 disabled:opacity-30 disabled:hover:bg-transparent"
                          title="Hapus Jurnal"
                          disabled={!record.wfhPlan && !record.wfhReport}
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
                              RENCANA KERJA (PAGI)
                            </h4>
                            <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-line leading-relaxed">
                              {record.wfhPlan || "Tidak menuliskan rencana kerja."}
                            </p>
                          </>
                        ) : (
                          <>
                            <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                              <Home className="size-3 text-zinc-400" />
                              LOKASI PRESENSI
                            </h4>
                            <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                              Presensi WFO di <span className="font-semibold">{record.ownerStudio.name}</span>
                            </p>
                          </>
                        )}
                      </div>

                      {/* Right Block: Report/Journal */}
                      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/10 p-3.5 space-y-1.5">
                        <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                          <CheckCircle className="size-3 text-zinc-400" />
                          {isWfh ? "LAPORAN HASIL KERJA (SORE)" : "JURNAL WFO / HASIL KERJA"}
                        </h4>
                        {isWfh && !hasCheckOut ? (
                          <div className="flex items-center gap-1.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 rounded px-2.5 w-fit">
                            <AlertCircle className="size-3.5" />
                            Sedang Berjalan / Belum Check-out
                          </div>
                        ) : (
                          <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-line leading-relaxed">
                            {record.wfhReport || (isWfh ? "Tidak menuliskan laporan hasil kerja." : "Tidak menuliskan jurnal WFO.")}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal Dialog */}
      <Dialog open={!!editingRecord} onOpenChange={(open) => !open && closeEditModal()}>
        <DialogContent className="sm:max-w-[500px] border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
          <DialogHeader>
            <DialogTitle className="text-zinc-900 dark:text-zinc-50">Edit Jurnal Kerja</DialogTitle>
            <DialogDescription className="text-zinc-500 dark:text-zinc-400">
              Perbarui rencana atau laporan kerja Anda pada {editingRecord && formatDate(editingRecord.attendanceDate)}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {editingRecord?.workMode === "WFH" && (
              <div className="space-y-2">
                <Label htmlFor="client-plan" className="text-xs font-semibold text-zinc-650 dark:text-zinc-400">Rencana Kerja (Pagi)</Label>
                <Textarea
                  id="client-plan"
                  placeholder="Tulis rencana kerja pagi Anda..."
                  value={planVal}
                  onChange={(e) => setPlanVal(e.target.value)}
                  rows={4}
                  className="resize-none border-zinc-200 dark:border-zinc-800 text-zinc-850 dark:text-zinc-200 focus-visible:ring-blue-500"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="client-report" className="text-xs font-semibold text-zinc-650 dark:text-zinc-400">
                {editingRecord?.workMode === "WFH" ? "Laporan Hasil Kerja (Sore)" : "Jurnal WFO / Hasil Kerja"}
              </Label>
              <Textarea
                id="client-report"
                placeholder={editingRecord?.workMode === "WFH" ? "Tulis laporan hasil kerja sore Anda..." : "Tulis jurnal kegiatan WFO Anda..."}
                value={reportVal}
                onChange={(e) => setReportVal(e.target.value)}
                rows={4}
                className="resize-none border-zinc-200 dark:border-zinc-800 text-zinc-850 dark:text-zinc-200 focus-visible:ring-blue-500"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeEditModal} disabled={isSubmitting} className="border-zinc-200 dark:border-zinc-800">
              Batal
            </Button>
            <Button onClick={handleSave} disabled={isSubmitting} className="bg-blue-700 hover:bg-blue-800 text-white dark:bg-blue-600 dark:hover:bg-blue-700">
              {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Modal Dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => !open && setCreateOpen(false)}>
        <DialogContent className="sm:max-w-[500px] border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
          <DialogHeader>
            <DialogTitle className="text-zinc-900 dark:text-zinc-50">Buat Jurnal Kerja Baru</DialogTitle>
            <DialogDescription className="text-zinc-500 dark:text-zinc-400">
              Buat jurnal kerja untuk hari kemarin atau hari tertentu jika Anda lupa mengisi.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="create-date" className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Pilih Tanggal</Label>
              <Input
                id="create-date"
                type="date"
                value={createDate}
                onChange={(e) => setCreateDate(e.target.value)}
                className="border-zinc-200 dark:border-zinc-800 focus-visible:ring-blue-500"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-mode" className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Mode Kerja</Label>
              <select
                id="create-mode"
                value={createMode}
                onChange={(e) => setCreateMode(e.target.value as "WFO" | "WFH")}
                className="h-9 w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 px-3 text-sm focus:outline-none"
              >
                <option value="WFO">WFO (Work From Office)</option>
                <option value="WFH">WFH (Work From Home)</option>
              </select>
            </div>
            {createMode === "WFH" && (
              <div className="space-y-2">
                <Label htmlFor="create-plan" className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Rencana Kerja (Pagi)</Label>
                <Textarea
                  id="create-plan"
                  placeholder="Tulis rencana kerja pagi..."
                  value={createPlan}
                  onChange={(e) => setCreatePlan(e.target.value)}
                  rows={3}
                  className="resize-none border-zinc-200 dark:border-zinc-800 text-zinc-850 dark:text-zinc-200 focus-visible:ring-blue-500"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="create-report" className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                {createMode === "WFH" ? "Laporan Hasil Kerja (Sore)" : "Jurnal WFO / Hasil Kerja"}
              </Label>
              <Textarea
                id="create-report"
                placeholder={createMode === "WFH" ? "Tulis laporan hasil kerja sore..." : "Tulis jurnal kegiatan WFO..."}
                value={createReport}
                onChange={(e) => setCreateReport(e.target.value)}
                rows={4}
                className="resize-none border-zinc-200 dark:border-zinc-800 text-zinc-850 dark:text-zinc-200 focus-visible:ring-blue-500"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={isSubmitting} className="border-zinc-200 dark:border-zinc-800">
              Batal
            </Button>
            <Button onClick={handleCreateSubmit} disabled={isSubmitting} className="bg-blue-700 hover:bg-blue-800 text-white dark:bg-blue-600 dark:hover:bg-blue-700">
              {isSubmitting ? "Menyimpan..." : "Simpan Jurnal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
