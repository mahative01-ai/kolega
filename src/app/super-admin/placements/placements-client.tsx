"use client";

import React, { useMemo, useState, useTransition } from "react";
import { Plus, Search, Check, X, Milestone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { createPlacementAction, updatePlacementStatusAction } from "./actions";

type Placement = {
  id: string;
  userId: string;
  user: { name: string; email: string };
  studioId: string;
  studio: { name: string };
  startDate: Date;
  endDate: Date | null;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  reason: string | null;
  createdAt: Date;
};

type Props = {
  initialPlacements: Placement[];
  users: Array<{ id: string; name: string; email: string }>;
  studios: Array<{ id: string; name: string }>;
};

const statusLabel: Record<string, string> = {
  ACTIVE: "Aktif",
  COMPLETED: "Selesai",
  CANCELLED: "Batal",
};

const statusColor: Record<string, string> = {
  ACTIVE: "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900",
  COMPLETED: "bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900",
  CANCELLED: "bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900",
};

export function PlacementsClient({ initialPlacements, users, studios }: Props) {
  const [placements, setPlacements] = useState<Placement[]>(initialPlacements);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  // Add Dialog State
  const [addOpen, setAddOpen] = useState(false);
  const [addUserId, setAddUserId] = useState("");
  const [addStudioId, setAddStudioId] = useState("");
  const [addStartDate, setAddStartDate] = useState("");
  const [addEndDate, setAddEndDate] = useState("");
  const [addReason, setAddReason] = useState("");
  const [addError, setAddError] = useState("");

  const filteredPlacements = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return placements;
    return placements.filter(
      (p) =>
        p.user.name.toLowerCase().includes(q) ||
        p.user.email.toLowerCase().includes(q) ||
        p.studio.name.toLowerCase().includes(q) ||
        p.reason?.toLowerCase().includes(q)
    );
  }, [searchQuery, placements]);

  function formatDate(dVal: Date | string | null) {
    if (!dVal) return "-";
    const d = new Date(dVal);
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(d);
  }

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addUserId || !addStudioId || !addStartDate) {
      setAddError("Harap lengkapi semua bidang wajib.");
      return;
    }
    setAddError("");

    startTransition(async () => {
      try {
        const res = await createPlacementAction({
          userId: addUserId,
          studioId: addStudioId,
          startDate: addStartDate,
          endDate: addEndDate || null,
          reason: addReason || null,
        });

        if (res.success) {
          // Add locally to the state
          const newPl = {
            ...res.placement,
            startDate: new Date(res.placement.startDate),
            endDate: res.placement.endDate ? new Date(res.placement.endDate) : null,
            createdAt: new Date(res.placement.createdAt),
          } as Placement;

          setPlacements([newPl, ...placements]);
          setAddOpen(false);
          // reset fields
          setAddUserId("");
          setAddStudioId("");
          setAddStartDate("");
          setAddEndDate("");
          setAddReason("");
        }
      } catch (err: unknown) {
        setAddError(err instanceof Error ? err.message : "Gagal membuat penempatan.");
      }
    });
  };

  const handleUpdateStatus = (id: string, status: "COMPLETED" | "CANCELLED") => {
    if (!confirm(`Apakah Anda yakin ingin menandai penempatan ini sebagai ${statusLabel[status]}?`)) {
      return;
    }

    startTransition(async () => {
      try {
        const res = await updatePlacementStatusAction(id, status);
        if (res.success) {
          const updated = {
            ...res.placement,
            startDate: new Date(res.placement.startDate),
            endDate: res.placement.endDate ? new Date(res.placement.endDate) : null,
            createdAt: new Date(res.placement.createdAt),
          } as Placement;

          setPlacements(placements.map((p) => (p.id === id ? updated : p)));
        }
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : "Gagal memperbarui status penempatan.");
      }
    });
  };

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama anggota atau nama studio..."
            className="pl-9"
          />
        </div>
        <Button onClick={() => setAddOpen(true)} className="w-full sm:w-auto">
          <Plus className="size-4 mr-1.5" />
          Tambah Penempatan
        </Button>
      </div>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <Milestone className="size-5 text-blue-700 dark:text-blue-400" />
            Daftar Penempatan Staf/Magang
          </CardTitle>
          <CardDescription>
            Riwayat penugasan studio fisik sementara untuk validasi GPS WFO presensi harian anggota.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Anggota</TableHead>
                  <TableHead>Studio Penugasan</TableHead>
                  <TableHead>Tanggal Mulai</TableHead>
                  <TableHead>Tanggal Selesai</TableHead>
                  <TableHead>Keterangan / Alasan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlacements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-zinc-500 text-sm">
                      Tidak ada data penempatan ditemukan.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPlacements.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">{p.user.name}</span>
                          <span className="text-[10px] text-zinc-500">{p.user.email}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-zinc-800 dark:text-zinc-200">
                        {p.studio.name}
                      </TableCell>
                      <TableCell className="text-xs font-mono">{formatDate(p.startDate)}</TableCell>
                      <TableCell className="text-xs font-mono">
                        {p.endDate ? formatDate(p.endDate) : (
                          <span className="text-zinc-400 italic text-[11px]">Seterusnya</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs" title={p.reason || "-"}>
                        {p.reason || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-[10px] shadow-none", statusColor[p.status])}>
                          {statusLabel[p.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {p.status === "ACTIVE" ? (
                          <div className="flex justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isPending}
                              onClick={() => handleUpdateStatus(p.id, "COMPLETED")}
                              className="text-[10px] h-7 px-2 border-zinc-200 dark:border-zinc-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 hover:text-emerald-600 shadow-none"
                            >
                              <Check className="size-3 mr-1" />
                              Selesaikan
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isPending}
                              onClick={() => handleUpdateStatus(p.id, "CANCELLED")}
                              className="text-[10px] h-7 px-2 border-zinc-200 dark:border-zinc-800 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 shadow-none"
                            >
                              <X className="size-3 mr-1" />
                              Batalkan
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-400 italic">Selesai</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add Placement Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Penempatan (Placement)</DialogTitle>
            <DialogDescription>Tugaskan anggota ke studio cabang lain dalam masa penugasan tertentu.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div className="grid gap-1.5">
              <Label htmlFor="add-user">Anggota *</Label>
              <select
                id="add-user"
                className="h-9 w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-2.5 text-sm outline-none"
                value={addUserId}
                onChange={(e) => setAddUserId(e.target.value)}
                required
              >
                <option value="">Pilih Anggota</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="add-studio">Studio Tujuan *</Label>
              <select
                id="add-studio"
                className="h-9 w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-2.5 text-sm outline-none"
                value={addStudioId}
                onChange={(e) => setAddStudioId(e.target.value)}
                required
              >
                <option value="">Pilih Studio Cabang</option>
                {studios.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="add-start">Tanggal Mulai *</Label>
                <Input
                  id="add-start"
                  type="date"
                  value={addStartDate}
                  onChange={(e) => setAddStartDate(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="add-end">Tanggal Selesai (Opsional)</Label>
                <Input
                  id="add-end"
                  type="date"
                  value={addEndDate}
                  onChange={(e) => setAddEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="add-reason">Keterangan / Alasan Penempatan</Label>
              <Input
                id="add-reason"
                placeholder="misal: Diperbantukan untuk project X di cabang Bandung"
                value={addReason}
                onChange={(e) => setAddReason(e.target.value)}
              />
            </div>

            {addError && (
              <p className="text-xs text-red-600 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded p-2">
                {addError}
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)} disabled={isPending}>
                Batal
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Menyimpan..." : "Simpan Penempatan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
