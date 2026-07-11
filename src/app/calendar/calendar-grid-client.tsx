"use client";

import React, { useState, useTransition } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ArrowLeftRight,
  Loader2,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { swapHolidayAction, deleteSwappedHolidayAction } from "./actions";
import { EVENT_TYPE_CONFIG } from "./page-config";
import { cn } from "@/lib/utils";

type Studio = { id: string; name: string };

type CalendarEvent = {
  id: string;
  type: string;
  title: string;
  startDate: Date;
  endDate: Date;
  studioId: string | null;
  studio: { name: string } | null;
};

type Props = {
  year: number;
  month: number;
  firstDay: number;
  totalDays: number;
  todayMonthKey: string;
  todayDay: number;
  dayEvents: Record<number, CalendarEvent[]>;
  studios: Studio[];
  isSuperAdmin: boolean;
  activeStudioId?: string;
  prevMonthKey: string;
  nextMonthKey: string;
  monthLabel: string;
};

export function CalendarGridClient({
  year,
  month,
  firstDay,
  totalDays,
  todayMonthKey,
  todayDay,
  dayEvents,
  studios,
  isSuperAdmin,
  activeStudioId,
  prevMonthKey,
  nextMonthKey,
  monthLabel,
}: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form State
  const [studioId, setStudioId] = useState(activeStudioId || "");
  const [holidayName, setHolidayName] = useState("");
  const [originalDate, setOriginalDate] = useState("");
  const [newDate, setNewDate] = useState("");

  const dayLabels = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

  const monthStr = String(month).padStart(2, "0");

  const [activeSwaps, setActiveSwaps] = useState<CalendarEvent[]>([]);

  function handleDayClick(dayNumber: number) {
    if (!isSuperAdmin) return;

    const clickedDateStr = `${year}-${monthStr}-${String(dayNumber).padStart(2, "0")}`;
    const cellEvents = dayEvents[dayNumber] ?? [];
    
    // Find if there's any holiday/leave on this day to prefill name
    const holidayEvent = cellEvents.find(
      (ev) => ev.type === "NATIONAL_HOLIDAY" || ev.type === "COMPANY_LEAVE"
    );

    // Filter swap events
    const swapEvents = cellEvents.filter(
      (ev) => ev.type === "REPLACEMENT_WORKDAY" || ev.type === "COMPANY_LEAVE"
    );
    setActiveSwaps(swapEvents);

    setStudioId(activeStudioId || "");
    setOriginalDate(clickedDateStr);
    setNewDate(clickedDateStr);
    setHolidayName(holidayEvent ? holidayEvent.title : "");
    setError("");
    setSuccess("");
    setDialogOpen(true);
  }

  function resetForm() {
    setStudioId(activeStudioId || "");
    setHolidayName("");
    setOriginalDate("");
    setNewDate("");
    setError("");
    setSuccess("");
    setActiveSwaps([]);
  }

  const handleDeleteSwap = async (eventId: string) => {
    if (
      !confirm(
        "Apakah Anda yakin ingin menghapus pengalihan libur ini? Seluruh jadwal kerja dan hari libur pengganti terkait akan dibatalkan."
      )
    ) {
      return;
    }

    startTransition(async () => {
      try {
        await deleteSwappedHolidayAction(eventId);
        setSuccess("Pengalihan libur berhasil dihapus!");
        setTimeout(() => {
          setDialogOpen(false);
          resetForm();
          window.location.reload();
        }, 1500);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan saat menghapus.");
      }
    });
  };

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
          setDialogOpen(false);
          resetForm();
          // Reload page to fetch updated events
          window.location.reload();
        }, 1500);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan saat memproses.");
      }
    });
  }

  // Count total events this month
  const totalEventsCount = Object.values(dayEvents).reduce((acc, curr) => acc + curr.length, 0);

  return (
    <>
      <Card className="shadow-none w-full">
        <CardHeader className="flex-row items-center justify-between gap-2 pb-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="size-5 text-blue-700 dark:text-blue-400" />
              {monthLabel}
            </CardTitle>
            <CardDescription className="mt-0.5">
              {totalEventsCount} agenda di bulan ini
            </CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <a
              href={`?month=${prevMonthKey}${activeStudioId ? `&studioId=${activeStudioId}` : ""}`}
              className={buttonVariants({ variant: "outline", size: "icon" })}
              aria-label="Bulan sebelumnya"
            >
              <ChevronLeft className="size-4" />
            </a>
            <a
              href={`?month=${nextMonthKey}${activeStudioId ? `&studioId=${activeStudioId}` : ""}`}
              className={buttonVariants({ variant: "outline", size: "icon" })}
              aria-label="Bulan berikutnya"
            >
              <ChevronRight className="size-4" />
            </a>
          </div>
        </CardHeader>
        <CardContent>
          {/* Day labels */}
          <div className="grid grid-cols-7 mb-1">
            {dayLabels.map((d) => (
              <div key={d} className="py-1 text-center text-xs font-semibold text-zinc-400">
                {d}
              </div>
            ))}
          </div>
          
          {/* Day cells */}
          <div className="grid grid-cols-7 gap-px rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-200 dark:bg-zinc-800">
            {/* Empty cells before first day */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-24 bg-zinc-50 dark:bg-zinc-900/50" />
            ))}
            
            {/* Day cells */}
            {Array.from({ length: totalDays }).map((_, i) => {
              const day = i + 1;
              const isToday =
                `${year}-${monthStr}` === todayMonthKey &&
                day === todayDay;
              const cellEvents = dayEvents[day] ?? [];
              const hasEvent = cellEvents.length > 0;

              return (
                <div
                  key={day}
                  onClick={() => handleDayClick(day)}
                  className={cn(
                    "min-h-24 p-2 bg-white dark:bg-zinc-950 transition-colors flex flex-col justify-between select-none",
                    isSuperAdmin ? "cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/30" : "",
                    hasEvent ? "bg-amber-50/20 dark:bg-amber-500/5" : ""
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "inline-flex size-6 items-center justify-center rounded-full text-xs font-medium",
                        isToday
                          ? "bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 font-bold"
                          : "text-zinc-700 dark:text-zinc-300"
                      )}
                    >
                      {day}
                    </span>
                  </div>
                  
                  <div className="flex flex-col gap-1 mt-1.5 flex-1 justify-end">
                    {cellEvents.slice(0, 3).map((ev) => {
                      const cfg = EVENT_TYPE_CONFIG[ev.type] || {
                        label: ev.type,
                        color: "text-zinc-600 dark:text-zinc-300",
                        bg: "bg-zinc-100 dark:bg-zinc-800",
                      };
                      return (
                        <div
                          key={ev.id}
                          className={cn(
                            "truncate rounded px-1.5 py-0.5 text-[9px] font-semibold leading-tight border transition-all",
                            cfg.color,
                            cfg.bg,
                            "border-transparent hover:border-current"
                          )}
                          title={`${ev.title}${ev.studio ? ` (${ev.studio.name})` : " (Global)"}`}
                        >
                          {ev.title}
                        </div>
                      );
                    })}
                    {cellEvents.length > 3 && (
                      <div className="text-[8px] text-zinc-400 font-bold text-right px-1">
                        +{cellEvents.length - 3} lainnya
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-5 flex flex-wrap gap-2 justify-center sm:justify-start">
            {Object.entries(EVENT_TYPE_CONFIG).map(([key, cfg]) => (
              <span key={key} className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border", cfg.color, cfg.bg, "border-transparent")}>
                <span className="size-2 rounded-full bg-current" />
                {cfg.label}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* dialog for Swap Holiday */}
      {isSuperAdmin && (
        <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) resetForm(); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ArrowLeftRight className="size-5 text-blue-600" />
                Tukar / Alihkan Hari Libur
              </DialogTitle>
              <DialogDescription>
                Alihkan hari libur nasional atau cuti bersama ke tanggal lain. Tanggal asal akan diubah menjadi **Hari Kerja Pengganti**, dan tanggal baru akan menjadi **Hari Libur Cuti Bersama**.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-2">
              {/* Studio */}
              <div className="grid gap-1.5">
                <Label>Studio Cabang</Label>
                <Select value={studioId || "__global__"} onValueChange={(v) => setStudioId(v === "__global__" || !v ? "" : v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih studio atau biarkan global">
                      {(val) => val === "__global__" || !val ? "🌐 Semua Studio (Global)" : (studios.find((s) => s.id === val)?.name || val)}
                    </SelectValue>
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

              {error && (
                <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 px-3 py-2.5 text-xs text-red-700 dark:text-red-400">
                  {error}
                </div>
              )}
              {success && (
                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 px-3 py-2.5 text-xs text-emerald-700 dark:text-emerald-400">
                  {success}
                </div>
              )}

              {/* Active Swaps on this Day */}
              {activeSwaps.length > 0 && (
                <div className="space-y-2 border-t border-zinc-200 dark:border-zinc-800 pt-4 mt-2">
                  <Label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    Daftar Pengalihan Libur Aktif di Hari Ini
                  </Label>
                  <div className="space-y-1.5">
                    {activeSwaps.map((ev) => (
                      <div
                        key={ev.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs"
                      >
                        <div className="flex-1 min-w-0 pr-2 text-left">
                          <p className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                            {ev.title}
                          </p>
                          <p className="text-[10px] text-zinc-500 truncate">
                            {ev.studio ? `Studio: ${ev.studio.name}` : "Semua Studio (Global)"}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 shrink-0"
                          title="Hapus Pengalihan"
                          onClick={() => handleDeleteSwap(ev.id)}
                          disabled={isPending}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isPending}>
                Batal
              </Button>
              <Button onClick={handleSubmit} disabled={isPending} className="bg-blue-700 hover:bg-blue-800 text-white dark:bg-blue-600 dark:hover:bg-blue-700">
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-1.5" />
                    Memproses...
                  </>
                ) : (
                  "Proses Alihkan"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
