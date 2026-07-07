"use client";

import React, { useMemo, useState, useTransition } from "react";
import { Building2, Edit2, MapPin, Plus, Search } from "lucide-react";
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
import { createStudioAction, updateStudioAction, toggleStudioActiveAction } from "./actions";

type Studio = {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number;
  weekStartDay: number;
  isActive: boolean;
  createdAt: Date;
};

type Props = {
  initialStudios: Studio[];
};

const WEEKDAYS = [
  { value: 1, label: "Senin" },
  { value: 2, label: "Selasa" },
  { value: 3, label: "Rabu" },
  { value: 4, label: "Kamis" },
  { value: 5, label: "Jumat" },
  { value: 6, label: "Sabtu" },
  { value: 7, label: "Minggu" },
];

export function StudiosClient({ initialStudios }: Props) {
  const [studios, setStudios] = useState<Studio[]>(initialStudios);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  // Add Dialog State
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addSlug, setAddSlug] = useState("");
  const [addAddress, setAddAddress] = useState("");
  const [addLat, setAddLat] = useState("");
  const [addLng, setAddLng] = useState("");
  const [addRadius, setAddRadius] = useState("100");
  const [addWeekStart, setAddWeekStart] = useState("1");
  const [addError, setAddError] = useState("");

  // Edit Dialog State
  const [editOpen, setEditOpen] = useState(false);
  const [editingStudio, setEditingStudio] = useState<Studio | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editLat, setEditLat] = useState("");
  const [editLng, setEditLng] = useState("");
  const [editRadius, setEditRadius] = useState("100");
  const [editWeekStart, setEditWeekStart] = useState("1");
  const [editError, setEditError] = useState("");

  const filteredStudios = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return studios;
    return studios.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.slug.toLowerCase().includes(q) ||
        s.address?.toLowerCase().includes(q)
    );
  }, [searchQuery, studios]);

  const handleNameChange = (nameVal: string, isEdit: boolean) => {
    const slugVal = nameVal
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    if (isEdit) {
      setEditName(nameVal);
      setEditSlug(slugVal);
    } else {
      setAddName(nameVal);
      setAddSlug(slugVal);
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");

    startTransition(async () => {
      try {
        const res = await createStudioAction({
          name: addName,
          slug: addSlug,
          address: addAddress || null,
          latitude: addLat ? parseFloat(addLat) : null,
          longitude: addLng ? parseFloat(addLng) : null,
          radiusMeters: parseInt(addRadius) || 100,
          weekStartDay: parseInt(addWeekStart) || 1,
        });

        if (res.success) {
          setStudios([res.studio, ...studios]);
          setAddOpen(false);
          // reset fields
          setAddName("");
          setAddSlug("");
          setAddAddress("");
          setAddLat("");
          setAddLng("");
          setAddRadius("100");
          setAddWeekStart("1");
        }
      } catch (err: any) {
        setAddError(err.message || "Gagal menyimpan studio.");
      }
    });
  };

  const handleEditClick = (s: Studio) => {
    setEditingStudio(s);
    setEditName(s.name);
    setEditSlug(s.slug);
    setEditAddress(s.address || "");
    setEditLat(s.latitude !== null ? s.latitude.toString() : "");
    setEditLng(s.longitude !== null ? s.longitude.toString() : "");
    setEditRadius(s.radiusMeters.toString());
    setEditWeekStart(s.weekStartDay.toString());
    setEditError("");
    setEditOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudio) return;
    setEditError("");

    startTransition(async () => {
      try {
        const res = await updateStudioAction(editingStudio.id, {
          name: editName,
          slug: editSlug,
          address: editAddress || null,
          latitude: editLat ? parseFloat(editLat) : null,
          longitude: editLng ? parseFloat(editLng) : null,
          radiusMeters: parseInt(editRadius) || 100,
          weekStartDay: parseInt(editWeekStart) || 1,
        });

        if (res.success) {
          setStudios(
            studios.map((s) => (s.id === editingStudio.id ? res.studio : s))
          );
          setEditOpen(false);
          setEditingStudio(null);
        }
      } catch (err: any) {
        setEditError(err.message || "Gagal memperbarui studio.");
      }
    });
  };

  const handleToggleActive = (id: string, currentStatus: boolean) => {
    startTransition(async () => {
      try {
        const res = await toggleStudioActiveAction(id, currentStatus);
        if (res.success) {
          setStudios(studios.map((s) => (s.id === id ? res.studio : s)));
        }
      } catch (err: any) {
        alert(err.message || "Gagal mengubah status aktif studio.");
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
            placeholder="Cari nama, slug, atau alamat studio..."
            className="pl-9"
          />
        </div>
        <Button onClick={() => setAddOpen(true)} className="w-full sm:w-auto">
          <Plus className="size-4 mr-1.5" />
          Tambah Cabang Studio
        </Button>
      </div>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-zinc-900 dark:text-zinc-50">Daftar Cabang Studio</CardTitle>
          <CardDescription>Cabang fisik studio aktif untuk validasi Geofence GPS presensi.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Studio</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Alamat & Lokasi</TableHead>
                  <TableHead>Koordinat Geofence</TableHead>
                  <TableHead>Radius</TableHead>
                  <TableHead>Hari Mulai</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudios.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-zinc-500 text-sm">
                      Tidak ada data studio ditemukan.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudios.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {s.name}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{s.slug}</TableCell>
                      <TableCell className="max-w-[200px] truncate" title={s.address || "-"}>
                        {s.address || "-"}
                      </TableCell>
                      <TableCell>
                        {s.latitude !== null && s.longitude !== null ? (
                          <span className="text-xs font-mono">
                            {s.latitude.toFixed(6)}, {s.longitude.toFixed(6)}
                          </span>
                        ) : (
                          <Badge variant="outline" className="text-zinc-500 font-normal">
                            Belum Disetel
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-mono">{s.radiusMeters} meter</TableCell>
                      <TableCell className="text-xs">
                        {WEEKDAYS.find((wd) => wd.value === s.weekStartDay)?.label || "Senin"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isPending}
                          onClick={() => handleToggleActive(s.id, !s.isActive)}
                          className={cn(
                            "text-[10px] font-bold px-2 py-0.5 h-6 rounded-full shadow-none transition-all",
                            s.isActive
                              ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900"
                              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-800"
                          )}
                        >
                          {s.isActive ? "Aktif" : "Nonaktif"}
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditClick(s)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit2 className="size-3.5 text-zinc-500 hover:text-zinc-900" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add Studio Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Cabang Studio</DialogTitle>
            <DialogDescription>Daftarkan entitas studio cabang baru ke sistem.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div className="grid gap-1.5">
              <Label htmlFor="add-name">Nama Studio *</Label>
              <Input
                id="add-name"
                placeholder="misal: Studio Kipa"
                value={addName}
                onChange={(e) => handleNameChange(e.target.value, false)}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="add-slug">Slug Studio *</Label>
              <Input
                id="add-slug"
                placeholder="misal: studio-kipa"
                value={addSlug}
                onChange={(e) => setAddSlug(e.target.value)}
                required
              />
              <p className="text-[10px] text-zinc-500">Gunakan huruf kecil, angka, dan tanda hubung (-).</p>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="add-address">Alamat Fisik</Label>
              <Input
                id="add-address"
                placeholder="Alamat lengkap studio"
                value={addAddress}
                onChange={(e) => setAddAddress(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="add-lat">Latitude</Label>
                <Input
                  id="add-lat"
                  type="number"
                  step="any"
                  placeholder="-6.200000"
                  value={addLat}
                  onChange={(e) => setAddLat(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="add-lng">Longitude</Label>
                <Input
                  id="add-lng"
                  type="number"
                  step="any"
                  placeholder="106.816666"
                  value={addLng}
                  onChange={(e) => setAddLng(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="add-radius">Radius Absen (Meter)</Label>
                <Input
                  id="add-radius"
                  type="number"
                  placeholder="100"
                  value={addRadius}
                  onChange={(e) => setAddRadius(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="add-week">Hari Mulai Kerja Mingguan</Label>
                <select
                  id="add-week"
                  className="h-9 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-2.5 text-sm outline-none"
                  value={addWeekStart}
                  onChange={(e) => setAddWeekStart(e.target.value)}
                >
                  {WEEKDAYS.map((wd) => (
                    <option key={wd.value} value={wd.value}>
                      {wd.label}
                    </option>
                  ))}
                </select>
              </div>
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
                {isPending ? "Menyimpan..." : "Simpan Studio"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Studio Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Cabang Studio</DialogTitle>
            <DialogDescription>Perbarui informasi cabang studio terpilih.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-name">Nama Studio *</Label>
              <Input
                id="edit-name"
                placeholder="misal: Studio Kipa"
                value={editName}
                onChange={(e) => handleNameChange(e.target.value, true)}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-slug">Slug Studio *</Label>
              <Input
                id="edit-slug"
                placeholder="misal: studio-kipa"
                value={editSlug}
                onChange={(e) => setEditSlug(e.target.value)}
                required
              />
              <p className="text-[10px] text-zinc-500">Gunakan huruf kecil, angka, dan tanda hubung (-).</p>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-address">Alamat Fisik</Label>
              <Input
                id="edit-address"
                placeholder="Alamat lengkap studio"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="edit-lat">Latitude</Label>
                <Input
                  id="edit-lat"
                  type="number"
                  step="any"
                  placeholder="-6.200000"
                  value={editLat}
                  onChange={(e) => setEditLat(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="edit-lng">Longitude</Label>
                <Input
                  id="edit-lng"
                  type="number"
                  step="any"
                  placeholder="106.816666"
                  value={editLng}
                  onChange={(e) => setEditLng(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="edit-radius">Radius Absen (Meter)</Label>
                <Input
                  id="edit-radius"
                  type="number"
                  placeholder="100"
                  value={editRadius}
                  onChange={(e) => setEditRadius(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="edit-week">Hari Mulai Kerja Mingguan</Label>
                <select
                  id="edit-week"
                  className="h-9 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-2.5 text-sm outline-none"
                  value={editWeekStart}
                  onChange={(e) => setEditWeekStart(e.target.value)}
                >
                  {WEEKDAYS.map((wd) => (
                    <option key={wd.value} value={wd.value}>
                      {wd.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {editError && (
              <p className="text-xs text-red-600 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded p-2">
                {editError}
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)} disabled={isPending}>
                Batal
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
