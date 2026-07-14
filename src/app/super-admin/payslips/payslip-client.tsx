"use client";

import React, { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner"; // Wait, is sonner or toast imported? In roles-client.tsx it was imported from sonner or toast. Let's check!
import { createPayslip, deletePayslip, bulkGeneratePayslipsAction, updatePayslipAction, deleteAllPayslipsAction } from "./actions";
import { Plus, Trash2, Printer, Loader2, FileText, Pencil, RefreshCw } from "lucide-react";

type Member = {
  id: string;
  name: string;
  email: string;
  role: string;
  defaultStudioId: string | null;
  defaultStudio: { id: string; name: string } | null;
};

type Studio = {
  id: string;
  name: string;
};

type Payslip = {
  id: string;
  month: number;
  year: number;
  basicSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  notes: string | null;
  pdfFileName: string | null;
  pdfDataUrl: string | null;
  createdAt: Date;
  user: {
    name: string;
    email: string;
    defaultStudioId: string | null;
  };
};

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

function localFormatCurrency(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function PayslipClient({
  initialPayslips,
  members,
  studios,
}: {
  initialPayslips: Payslip[];
  members: Member[];
  studios: Studio[];
}) {
  const [payslips, setPayslips] = useState<Payslip[]>(initialPayslips);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Bulk Dialog State
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkMonth, setBulkMonth] = useState(new Date().getMonth() + 1);
  const [bulkYear, setBulkYear] = useState(new Date().getFullYear());
  const [isBulkPending, startBulkTransition] = useTransition();
  const [isDeleteAllPending, startDeleteAllTransition] = useTransition();

  const handleDeleteAll = async () => {
    if (!confirm("Apakah Anda yakin ingin menghapus SEMUA slip gaji yang ada di sistem? Tindakan ini tidak dapat dibatalkan!")) {
      return;
    }

    startDeleteAllTransition(async () => {
      try {
        const res = await deleteAllPayslipsAction();
        if (res.success) {
          setPayslips([]);
          toast.success("Semua slip gaji berhasil dihapus.");
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Gagal menghapus semua slip gaji.");
      }
    });
  };

  // Edit Dialog State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingPayslip, setEditingPayslip] = useState<Payslip | null>(null);
  const [editBasicSalary, setEditBasicSalary] = useState(0);
  const [editAllowances, setEditAllowances] = useState(0);
  const [editDeductions, setEditDeductions] = useState(0);
  const [editNotes, setEditNotes] = useState("");
  const [editPdfFile, setEditPdfFile] = useState<File | null>(null);
  const [isEditPending, startEditTransition] = useTransition();

  const handleBulkGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm(`Apakah Anda yakin ingin menggenerasi slip gaji default untuk semua staf TEAM pada periode ${MONTH_NAMES[bulkMonth - 1]} ${bulkYear}?`)) {
      return;
    }

    startBulkTransition(async () => {
      try {
        const res = await bulkGeneratePayslipsAction(bulkMonth, bulkYear);
        toast.success(`Berhasil! ${res.generatedCount} slip gaji baru berhasil digenerasi.`);
        setIsBulkOpen(false);
        window.location.reload();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Gagal menggenerasi slip gaji masal.");
      }
    });
  };

  const handleOpenEdit = (p: Payslip) => {
    setEditingPayslip(p);
    setEditBasicSalary(p.basicSalary);
    setEditAllowances(p.allowances);
    setEditDeductions(p.deductions);
    setEditNotes(p.notes || "");
    setEditPdfFile(null);
    setIsEditOpen(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayslip) return;

    if (editBasicSalary < 0) {
      toast.error("Gaji pokok tidak boleh negatif.");
      return;
    }

    startEditTransition(async () => {
      try {
        let pdfData: { name: string; type: string; dataUrl: string } | null = null;
        if (editPdfFile) {
          if (editPdfFile.type !== "application/pdf") {
            toast.error("File slip gaji harus berupa PDF.");
            return;
          }
          if (editPdfFile.size > 2 * 1024 * 1024) {
            toast.error("Ukuran PDF maksimal 2MB.");
            return;
          }
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(new Error("Gagal membaca file PDF."));
            reader.readAsDataURL(editPdfFile);
          });
          pdfData = {
            name: editPdfFile.name,
            type: editPdfFile.type,
            dataUrl,
          };
        }

        const updated = await updatePayslipAction(editingPayslip.id, {
          basicSalary: editBasicSalary,
          allowances: editAllowances,
          deductions: editDeductions,
          notes: editNotes,
          pdfFile: pdfData,
        });

        setPayslips(
          payslips.map((p) => {
            if (p.id === editingPayslip.id) {
              return {
                ...p,
                basicSalary: updated.basicSalary,
                allowances: updated.allowances,
                deductions: updated.deductions,
                netSalary: updated.netSalary,
                notes: updated.notes,
                pdfFileName: updated.pdfFileName,
                pdfDataUrl: updated.pdfDataUrl,
              };
            }
            return p;
          })
        );

        toast.success("Slip gaji berhasil diperbarui.");
        setIsEditOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Gagal memperbarui slip gaji.");
      }
    });
  };

  // Form State
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [basicSalary, setBasicSalary] = useState(0);
  const [allowances, setAllowances] = useState(0);
  const [deductions, setDeductions] = useState(0);
  const [notes, setNotes] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const netSalary = basicSalary + allowances - deductions;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId) {
      toast.error("Silakan pilih member terlebih dahulu.");
      return;
    }
    if (basicSalary <= 0) {
      toast.error("Gaji pokok harus lebih besar dari 0.");
      return;
    }
    if (!pdfFile) {
      toast.error("PDF slip gaji wajib diupload.");
      return;
    }
    if (pdfFile.type !== "application/pdf") {
      toast.error("File slip gaji harus berupa PDF.");
      return;
    }
    if (pdfFile.size > 2 * 1024 * 1024) {
      toast.error("Ukuran PDF maksimal 2MB.");
      return;
    }

    startTransition(async () => {
      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error("Gagal membaca file PDF."));
          reader.readAsDataURL(pdfFile);
        });

        const newPayslip = await createPayslip({
          userId: selectedMemberId,
          month,
          year,
          basicSalary,
          allowances,
          deductions,
          notes,
          pdfFile: {
            name: pdfFile.name,
            type: pdfFile.type,
            dataUrl,
          },
        });

        const member = members.find((m) => m.id === selectedMemberId);
        const addedPayslip: Payslip = {
          ...newPayslip,
          user: {
            name: member?.name || "",
            email: member?.email || "",
            defaultStudioId: member?.defaultStudioId ?? null,
          },
        };

        setPayslips([addedPayslip, ...payslips]);
        toast.success("Slip gaji berhasil dikirim ke member.");
        setIsOpen(false);
        // Reset form
        setSelectedMemberId("");
        setBasicSalary(0);
        setAllowances(0);
        setDeductions(0);
        setNotes("");
        setPdfFile(null);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Gagal membuat slip gaji.";
        toast.error(errMsg);
      }
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus slip gaji ini?")) return;

    try {
      await deletePayslip(id);
      setPayslips(payslips.filter((p) => p.id !== id));
      toast.success("Slip gaji berhasil dihapus.");
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Gagal menghapus slip gaji.";
      toast.error(errMsg);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Daftar Slip Gaji</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Kelola dan kirim rincian slip gaji tim bulanan.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {payslips.length > 0 && (
            <Button
              variant="destructive"
              onClick={handleDeleteAll}
              disabled={isDeleteAllPending}
              className="flex items-center gap-2"
            >
              {isDeleteAllPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Hapus Semua
            </Button>
          )}

          {/* Dialog Bulk Generate */}
          <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
            <Button
              variant="outline"
              onClick={() => setIsBulkOpen(true)}
              className="flex items-center gap-2 border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            >
              <RefreshCw className="size-4" />
              Generate Massal
            </Button>
            <DialogContent className="max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-sans">
              <DialogHeader>
                <DialogTitle>Generate Slip Gaji Massal</DialogTitle>
                <DialogDescription>
                  Buat slip gaji kosong periode tertentu untuk semua staf aktif berstatus TEAM secara massal.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleBulkGenerate} className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bulkMonth">Bulan</Label>
                    <select
                      id="bulkMonth"
                      className="w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-950 dark:focus:ring-zinc-100"
                      value={bulkMonth}
                      onChange={(e) => setBulkMonth(Number(e.target.value))}
                    >
                      {MONTH_NAMES.map((name, i) => (
                        <option key={i} value={i + 1}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bulkYear">Tahun</Label>
                    <select
                      id="bulkYear"
                      className="w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-950 dark:focus:ring-zinc-100"
                      value={bulkYear}
                      onChange={(e) => setBulkYear(Number(e.target.value))}
                    >
                      {[bulkYear - 1, bulkYear, bulkYear + 1].map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsBulkOpen(false)} disabled={isBulkPending}>
                    Batal
                  </Button>
                  <Button type="submit" disabled={isBulkPending} className="bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950">
                    {isBulkPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Memproses...
                      </>
                    ) : (
                      "Generate"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <Button
              className="bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 hover:opacity-90 flex items-center gap-2"
              render={<DialogTrigger />}
            >
              <Plus className="size-4" />
              Buat Slip Gaji
            </Button>
          <DialogContent className="max-w-md bg-white dark:bg-zinc-950 font-sans border border-zinc-200 dark:border-zinc-800">
            <DialogHeader>
              <DialogTitle>Buat Slip Gaji Baru</DialogTitle>
              <DialogDescription>
                Masukkan rincian gaji untuk member tim. Member akan menerima notifikasi otomatis.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="member">Pilih Member</Label>
                <select
                  id="member"
                  className="w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-950 dark:focus:ring-zinc-100"
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                >
                  <option value="">-- Pilih Anggota --</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.defaultStudio?.name ?? "Tanpa Studio"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="month">Bulan</Label>
                  <select
                    id="month"
                    className="w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-950 dark:focus:ring-zinc-100"
                    value={month}
                    onChange={(e) => setMonth(Number(e.target.value))}
                  >
                    {MONTH_NAMES.map((name, i) => (
                      <option key={i} value={i + 1}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year">Tahun</Label>
                  <select
                    id="year"
                    className="w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-950 dark:focus:ring-zinc-100"
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                  >
                    {[year - 1, year, year + 1].map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="basicSalary">Gaji Pokok (Rupiah)</Label>
                <Input
                  id="basicSalary"
                  type="number"
                  placeholder="Gaji Pokok"
                  value={basicSalary || ""}
                  onChange={(e) => setBasicSalary(Number(e.target.value))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="allowances">Total Tunjangan</Label>
                  <Input
                    id="allowances"
                    type="number"
                    placeholder="Makan, Transport, dll"
                    value={allowances || ""}
                    onChange={(e) => setAllowances(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deductions">Total Potongan</Label>
                  <Input
                    id="deductions"
                    type="number"
                    placeholder="Terlambat, Izin, dll"
                    value={deductions || ""}
                    onChange={(e) => setDeductions(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Catatan (Opsional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Misal: Bonus performa, keterlambatan 3x"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pdfFile">Upload PDF Slip Gaji</Label>
                <Input
                  id="pdfFile"
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
                />
                <p className="text-xs text-zinc-500">PDF maksimal 2MB. File akan tampil di halaman Slip Gaji Saya.</p>
              </div>

              <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1">
                <p className="text-xs text-zinc-500">Estimasi Kalkulasi Gaji Bersih:</p>
                <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  {localFormatCurrency(netSalary)}
                </p>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  disabled={isPending}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Mengirim...
                    </>
                  ) : (
                    "Kirim Slip"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Tabs defaultValue={studios[0]?.id ?? "all"} className="w-full">
        <TabsList className="mb-4 flex w-fit flex-wrap">
          {studios.map((studio) => (
            <TabsTrigger key={studio.id} value={studio.id}>
              {studio.name}
            </TabsTrigger>
          ))}
        </TabsList>
        {studios.map((studio) => {
          const studioMembers = members.filter((member) => member.defaultStudioId === studio.id);
          const studioPayslips = payslips.filter((payslip) => payslip.user.defaultStudioId === studio.id);

          return (
            <TabsContent key={studio.id} value={studio.id}>
              <div className="mb-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-300">
                {studioMembers.length} Team aktif di {studio.name}. {studioPayslips.length} slip sudah diterbitkan.
              </div>
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-950">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Anggota</TableHead>
              <TableHead>Periode</TableHead>
              <TableHead>Gaji Pokok</TableHead>
              <TableHead>Tunjangan</TableHead>
              <TableHead>Potongan</TableHead>
              <TableHead>Gaji Bersih</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {studioPayslips.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-zinc-500">
                  Belum ada data slip gaji yang diterbitkan.
                </TableCell>
              </TableRow>
            ) : (
              studioPayslips.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium text-zinc-950 dark:text-zinc-50">
                    {p.user.name}
                  </TableCell>
                  <TableCell>
                    {MONTH_NAMES[p.month - 1]} {p.year}
                  </TableCell>
                  <TableCell>{localFormatCurrency(p.basicSalary)}</TableCell>
                  <TableCell className="text-green-600 dark:text-green-400">
                    +{localFormatCurrency(p.allowances)}
                  </TableCell>
                  <TableCell className="text-red-600 dark:text-red-400">
                    -{localFormatCurrency(p.deductions)}
                  </TableCell>
                  <TableCell className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {localFormatCurrency(p.netSalary)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {p.pdfDataUrl ? (
                        <Button
                          size="icon"
                          variant="outline"
                          title="Lihat PDF"
                          onClick={() => window.open(`/payslip/${p.id}`, "_blank")}
                        >
                          <FileText className="size-4" />
                        </Button>
                      ) : null}
                      <Button
                        size="icon"
                        variant="outline"
                        title="Edit Slip Gaji"
                        onClick={() => handleOpenEdit(p)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        title="Cetak Slip Gaji"
                        onClick={() => window.open(`/payslip/${p.id}`, "_blank")}
                      >
                        <Printer className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                        title="Hapus Slip"
                        onClick={() => handleDelete(p.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Dialog Edit Slip Gaji */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-zinc-950 font-sans border border-zinc-200 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle>Edit Slip Gaji</DialogTitle>
            <DialogDescription>
              Ubah rincian gaji, catatan, atau lampiran PDF slip gaji untuk member tim.
            </DialogDescription>
          </DialogHeader>
          {editingPayslip && (
            <form onSubmit={handleEdit} className="space-y-4 py-2">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-zinc-500">Nama Anggota</p>
                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{editingPayslip.user.name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-zinc-500">Periode</p>
                <p className="text-sm font-medium text-zinc-850 dark:text-zinc-200">
                  {MONTH_NAMES[editingPayslip.month - 1]} {editingPayslip.year}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="editBasicSalary">Gaji Pokok (Rupiah)</Label>
                <Input
                  id="editBasicSalary"
                  type="number"
                  placeholder="Gaji Pokok"
                  value={editBasicSalary || ""}
                  onChange={(e) => setEditBasicSalary(Number(e.target.value))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="editAllowances">Total Tunjangan</Label>
                  <Input
                    id="editAllowances"
                    type="number"
                    placeholder="Tunjangan"
                    value={editAllowances || ""}
                    onChange={(e) => setEditAllowances(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editDeductions">Total Potongan</Label>
                  <Input
                    id="editDeductions"
                    type="number"
                    placeholder="Potongan"
                    value={editDeductions || ""}
                    onChange={(e) => setEditDeductions(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="editNotes">Catatan (Opsional)</Label>
                <Textarea
                  id="editNotes"
                  placeholder="Catatan slip gaji"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editPdfFile">Upload/Ganti PDF Slip Gaji</Label>
                <Input
                  id="editPdfFile"
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setEditPdfFile(e.target.files?.[0] ?? null)}
                />
                {editingPayslip.pdfFileName ? (
                  <p className="text-[10px] text-zinc-500">
                    File saat ini: <span className="font-semibold">{editingPayslip.pdfFileName}</span>
                  </p>
                ) : (
                  <p className="text-[10px] text-amber-600 dark:text-amber-500 font-semibold">
                    Belum ada lampiran PDF slip gaji (status: Draft).
                  </p>
                )}
              </div>

              <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1">
                <p className="text-xs text-zinc-500">Estimasi Kalkulasi Gaji Bersih:</p>
                <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  {localFormatCurrency(editBasicSalary + editAllowances - editDeductions)}
                </p>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} disabled={isEditPending}>
                  Batal
                </Button>
                <Button type="submit" disabled={isEditPending} className="bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950">
                  {isEditPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    "Simpan"
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
