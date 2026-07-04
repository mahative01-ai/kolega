"use client";

import { useState, useTransition } from "react";
import { Pencil, Plus, Trash2, Loader2 } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  createCalendarEventAction,
  updateCalendarEventAction,
  deleteCalendarEventAction,
} from "./actions";

type CalendarEventType =
  | "NATIONAL_HOLIDAY"
  | "COMPANY_LEAVE"
  | "REGULAR_OFF_DAY"
  | "REPLACEMENT_WORKDAY"
  | "STUDIO_EVENT";

type Studio = { id: string; name: string };

type ExistingEvent = {
  id: string;
  type: CalendarEventType;
  title: string;
  startDate: string;
  endDate: string;
  studioId: string | null;
  isReplacementRequired: boolean;
  replacementDate: string | null;
  isFinalHoliday: boolean;
  note: string | null;
};

type Props = {
  studios: Studio[];
  monthKey: string;
  existingEvent?: ExistingEvent;
  mode?: "add" | "edit";
};

const EVENT_TYPES = [
  { value: "NATIONAL_HOLIDAY", label: "🔴 Libur Nasional" },
  { value: "COMPANY_LEAVE", label: "🟠 Cuti Bersama" },
  { value: "REGULAR_OFF_DAY", label: "⚫ Libur Final" },
  { value: "REPLACEMENT_WORKDAY", label: "🟢 Hari Kerja Pengganti" },
  { value: "STUDIO_EVENT", label: "🔵 Kegiatan Studio" },
];

export function CalendarEventFormClient({ studios, monthKey, existingEvent, mode = "add" }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Form state
  const [type, setType] = useState(existingEvent?.type ?? "NATIONAL_HOLIDAY");
  const [title, setTitle] = useState(existingEvent?.title ?? "");
  const [startDate, setStartDate] = useState(existingEvent?.startDate ?? monthKey + "-01");
  const [endDate, setEndDate] = useState(existingEvent?.endDate ?? monthKey + "-01");
  const [studioId, setStudioId] = useState(existingEvent?.studioId ?? "");
  const [isReplacementRequired, setIsReplacementRequired] = useState(
    existingEvent?.isReplacementRequired ?? false
  );
  const [replacementDate, setReplacementDate] = useState(existingEvent?.replacementDate ?? "");
  const [isFinalHoliday, setIsFinalHoliday] = useState(existingEvent?.isFinalHoliday ?? false);
  const [note, setNote] = useState(existingEvent?.note ?? "");

  function resetForm() {
    if (mode === "add") {
      setType("NATIONAL_HOLIDAY");
      setTitle("");
      setStartDate(monthKey + "-01");
      setEndDate(monthKey + "-01");
      setStudioId("");
      setIsReplacementRequired(false);
      setReplacementDate("");
      setIsFinalHoliday(false);
      setNote("");
    }
    setError("");
    setDeleteConfirm(false);
  }

  function handleSubmit() {
    if (!title.trim()) { setError("Judul event wajib diisi."); return; }
    if (!startDate || !endDate) { setError("Tanggal mulai dan selesai wajib diisi."); return; }
    if (startDate > endDate) { setError("Tanggal mulai tidak boleh setelah tanggal selesai."); return; }

    const input = {
      type,
      title,
      startDate,
      endDate,
      studioId: type === "NATIONAL_HOLIDAY" ? null : (studioId || null),
      isReplacementRequired,
      replacementDate: isReplacementRequired ? replacementDate : null,
      isFinalHoliday,
      note: note || null,
    };

    startTransition(async () => {
      try {
        if (mode === "edit" && existingEvent) {
          await updateCalendarEventAction(existingEvent.id, input);
        } else {
          await createCalendarEventAction(input);
        }
        setOpen(false);
        resetForm();
      } catch (error: unknown) {
        setError(error instanceof Error ? error.message : "Terjadi kesalahan.");
      }
    });
  }

  function handleDelete() {
    if (!existingEvent) return;
    startTransition(async () => {
      try {
        await deleteCalendarEventAction(existingEvent.id);
        setOpen(false);
      } catch (error: unknown) {
        setError(error instanceof Error ? error.message : "Gagal menghapus event.");
      }
    });
  }

  return (
    <>
      {mode === "edit" ? (
        <button
          onClick={() => setOpen(true)}
          className="shrink-0 rounded p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
          aria-label="Edit event"
        >
          <Pencil className="size-3.5" />
        </button>
      ) : (
        <Button size="sm" className="w-full" onClick={() => setOpen(true)}>
          <Plus className="size-4" />
          Tambah Event
        </Button>
      )}

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Edit Event Kalender" : "Tambah Event Kalender"}</DialogTitle>
          <DialogDescription>
            {mode === "edit"
              ? "Ubah detail event yang sudah ada."
              : "Tambahkan libur nasional, cuti bersama, atau kegiatan studio."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Type */}
          <div className="grid gap-1.5">
            <Label>Tipe Event</Label>
            <Select value={type} onValueChange={(val) => setType((val ?? "NATIONAL_HOLIDAY") as CalendarEventType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="grid gap-1.5">
            <Label htmlFor="ev-title">Judul</Label>
            <Input
              id="ev-title"
              placeholder="Contoh: Hari Raya Idul Fitri"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="ev-start">Tanggal Mulai</Label>
              <Input
                id="ev-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ev-end">Tanggal Selesai</Label>
              <Input
                id="ev-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Studio (hidden for national holiday) */}
          {type !== "NATIONAL_HOLIDAY" && (
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
          )}

          {/* Replacement */}
          {(type === "COMPANY_LEAVE" || type === "REGULAR_OFF_DAY") && (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 grid gap-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="ev-replacement"
                  checked={isReplacementRequired}
                  onCheckedChange={(v) => {
                    setIsReplacementRequired(!!v);
                    if (v) setIsFinalHoliday(false);
                  }}
                />
                <Label htmlFor="ev-replacement" className="cursor-pointer">Ada hari kerja pengganti</Label>
              </div>
              {isReplacementRequired && (
                <div className="grid gap-1.5">
                  <Label htmlFor="ev-repdate">Tanggal Pengganti</Label>
                  <Input
                    id="ev-repdate"
                    type="date"
                    value={replacementDate}
                    onChange={(e) => setReplacementDate(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          {/* Final holiday */}
          {type !== "REPLACEMENT_WORKDAY" && type !== "STUDIO_EVENT" && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="ev-final"
                checked={isFinalHoliday}
                onCheckedChange={(v) => {
                  setIsFinalHoliday(!!v);
                  if (v) setIsReplacementRequired(false);
                }}
              />
              <Label htmlFor="ev-final" className="cursor-pointer">Libur final (tidak perlu diganti)</Label>
            </div>
          )}

          {/* Note */}
          <div className="grid gap-1.5">
            <Label htmlFor="ev-note">Catatan (opsional)</Label>
            <Textarea
              id="ev-note"
              placeholder="Keterangan tambahan..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="resize-none"
              rows={2}
            />
          </div>

          {error && <p className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</p>}
        </div>

        <DialogFooter className="flex flex-wrap gap-2">
          {mode === "edit" && (
            <>
              {!deleteConfirm ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 mr-auto"
                  onClick={() => setDeleteConfirm(true)}
                  disabled={isPending}
                >
                  <Trash2 className="size-3.5" />
                  Hapus
                </Button>
              ) : (
                <div className="flex items-center gap-2 mr-auto">
                  <span className="text-xs text-red-600 font-medium">Yakin hapus?</span>
                  <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isPending}>
                    {isPending ? <Loader2 className="size-3.5 animate-spin" /> : "Hapus"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(false)}>
                    Batal
                  </Button>
                </div>
              )}
            </>
          )}
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : mode === "edit" ? "Simpan" : "Tambah"}
          </Button>
        </DialogFooter>
      </DialogContent>
      </Dialog>
    </>
  );
}
