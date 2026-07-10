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
import { createPayslip, deletePayslip } from "./actions";
import { Plus, Trash2, Printer, Loader2 } from "lucide-react";

type Member = {
  id: string;
  name: string;
  email: string;
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
  createdAt: Date;
  user: {
    name: string;
    email: string;
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
}: {
  initialPayslips: Payslip[];
  members: Member[];
}) {
  const [payslips, setPayslips] = useState<Payslip[]>(initialPayslips);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Form State
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [basicSalary, setBasicSalary] = useState(0);
  const [allowances, setAllowances] = useState(0);
  const [deductions, setDeductions] = useState(0);
  const [notes, setNotes] = useState("");

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

    startTransition(async () => {
      try {
        const newPayslip = await createPayslip({
          userId: selectedMemberId,
          month,
          year,
          basicSalary,
          allowances,
          deductions,
          notes,
        });

        const member = members.find((m) => m.id === selectedMemberId);
        const addedPayslip: Payslip = {
          ...newPayslip,
          user: {
            name: member?.name || "",
            email: member?.email || "",
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
                      {m.name} ({m.email})
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
            {payslips.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-zinc-500">
                  Belum ada data slip gaji yang diterbitkan.
                </TableCell>
              </TableRow>
            ) : (
              payslips.map((p) => (
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
    </div>
  );
}
