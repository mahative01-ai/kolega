"use client";

import { useState, useTransition } from "react";
import { ArrowLeftRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { swapHolidayAction } from "./actions";

type Studio = { id: string; name: string };

type Props = {
  studios: Studio[];
  monthKey: string;
};

export function HolidaySwapFormClient({ studios, monthKey }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form State
  const [studioId, setStudioId] = useState("");
  const [holidayName, setHolidayName] = useState("");
  const [originalDate, setOriginalDate] = useState(monthKey + "-01");
  const [newDate, setNewDate] = useState(monthKey + "-01");

  function resetForm() {
    setStudioId("");
    setHolidayName("");
    setOriginalDate(monthKey + "-01");
    setNewDate(monthKey + "-01");
    setError("");
    setSuccess("");
  }

  function handleSubmit() {
    if (!holidayName.trim()) {
      setError("Nama libur wajib diisi.");
      return;
    }
    if (!originalDate || !newDate) {
      setError("Kedua tanggal wajib diisi.");
      return;
    }
    if (originalDate === newDate) {
      setError("Tanggal asal dan tanggal baru tidak boleh sama.");
      return;
    }

    startTransition(async () => {
      try {
        await swapHolidayAction({
          studioId: studioId || null,
          holidayName,
          originalDate,
          newDate,
        });
        setSuccess("Libur berhasil dialihkan/ditukar!");
        setTimeout(() => {
          setOpen(false);
          resetForm();
        }, 1500);
      } catch (error: unknown) {
        setError(error instanceof Error ? error.message : "Terjadi kesalahan saat memproses penukaran libur.");
      }
    });
  }

  return (
    <>
      <Button variant="outline" size="sm" className="w-full" onClick={() => setOpen(true)}>
        <ArrowLeftRight className="size-4" />
        Tukar Libur
      </Button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tukar / Alihkan Hari Libur</DialogTitle>
            <DialogDescription>
              Alihkan hari libur nasional ke tanggal lain khusus untuk studio terpilih.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Studio */}
            <div className="grid gap-1.5">
              <Label>Studio</Label>
              <Select value={studioId || "__global__"} onValueChange={(v) => setStudioId(v === "__global__" || !v ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih studio atau biarkan global" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__global__">🌐 Semua Studio (Global)</SelectItem>
                  {studios.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Nama Libur */}
            <div className="grid gap-1.5">
              <Label htmlFor="swap-name">Nama Libur Asal</Label>
              <Input
                id="swap-name"
                placeholder="Contoh: Tahun Baru Islam"
                value={holidayName}
                onChange={(e) => setHolidayName(e.target.value)}
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="swap-orig">Tanggal Libur Asal</Label>
                <Input
                  id="swap-orig"
                  type="date"
                  value={originalDate}
                  onChange={(e) => setOriginalDate(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="swap-new">Tanggal Libur Baru</Label>
                <Input
                  id="swap-new"
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                />
              </div>
            </div>

            <div className="rounded-lg bg-zinc-50 border border-zinc-200 p-3 text-xs text-zinc-600 leading-relaxed">
              💡 **Apa yang terjadi?**
              <ul className="list-disc pl-4 mt-1 space-y-1">
                <li>Tanggal Libur Asal akan diubah menjadi **Hari Kerja Pengganti** (Wajib Masuk).</li>
                <li>Tanggal Libur Baru akan diubah menjadi **Hari Libur Cuti Bersama** (Libur/Off).</li>
              </ul>
            </div>

            {error && <p className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</p>}
            {success && <p className="rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-700">{success}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Batal
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : "Proses Swap"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
