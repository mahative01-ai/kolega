"use client";

import { useState, useTransition } from "react";
import { CalendarRange, UserCheck, HelpCircle, X, Edit2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { updateUserPicketDayAction } from "./actions";
import { getMood } from "@/lib/moods";

type Member = {
  id: string;
  name: string;
  email: string;
  role: string;
  memberStatus: string;
  picketDay: string | null;
  defaultStudioId: string | null;
  defaultStudio?: {
    id: string;
    name: string;
  } | null;
  currentMood?: string;
};

type Props = {
  members: Member[];
  isManager: boolean;
};

const DAYS = [
  { key: "SENIN", label: "Senin" },
  { key: "SELASA", label: "Selasa" },
  { key: "RABU", label: "Rabu" },
  { key: "KAMIS", label: "Kamis" },
  { key: "JUMAT", label: "Jumat" },
  { key: "SABTU", label: "Sabtu" },
  { key: "MINGGU", label: "Minggu" },
];

export function PicketBoardClient({ members, isManager }: Props) {
  const [isPending, startTransition] = useTransition();

  // Dialog Edit State
  const [editOpen, setEditOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  // Group members by picketDay (split by comma since one member can have multiple days)
  const grouped = DAYS.reduce((acc, day) => {
    acc[day.key] = members.filter((m) => {
      if (!m.picketDay) return false;
      const days = m.picketDay.split(",").map(d => d.trim().toUpperCase());
      return days.includes(day.key);
    });
    return acc;
  }, {} as Record<string, Member[]>);

  const unscheduled = members.filter((m) => !m.picketDay || m.picketDay.trim() === "");

  const handleOpenEdit = (member: Member) => {
    setEditingMember(member);
    if (member.picketDay && member.picketDay.trim() !== "") {
      setSelectedDays(member.picketDay.split(",").map(d => d.trim().toUpperCase()));
    } else {
      setSelectedDays([]);
    }
    setEditOpen(true);
  };

  const handleToggleDayCheckbox = (dayKey: string) => {
    if (!editingMember) return;
    
    const studioName = editingMember.defaultStudio?.name.toLowerCase() ?? "";
    const isKipa = studioName.includes("kipa");
    const limit = isKipa ? 2 : 1;

    if (selectedDays.includes(dayKey)) {
      setSelectedDays(selectedDays.filter(d => d !== dayKey));
    } else {
      if (selectedDays.length >= limit) {
        toast.warning(
          isKipa 
            ? `Batas maksimal hari piket studio Kipa adalah 2 hari.`
            : `Batas maksimal hari piket studio Mahative adalah 1 hari.`
        );
        return;
      }
      setSelectedDays([...selectedDays, dayKey]);
    }
  };

  const handleSavePicketDays = () => {
    if (!editingMember) return;
    const newValue = selectedDays.length > 0 ? selectedDays.join(",") : null;

    startTransition(async () => {
      try {
        const res = await updateUserPicketDayAction(editingMember.id, newValue);
        if (res.success) {
          toast.success(`Jadwal piket untuk ${editingMember.name} berhasil diperbarui.`);
          setEditOpen(false);
          setEditingMember(null);
        }
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Gagal memperbarui jadwal piket.");
      }
    });
  };

  // Remove only one specific day from user's picketDay
  const handleRemoveSingleDay = (member: Member, dayToRemove: string) => {
    if (!member.picketDay) return;
    const days = member.picketDay.split(",").map(d => d.trim().toUpperCase());
    const remainingDays = days.filter(d => d !== dayToRemove);
    const newValue = remainingDays.length > 0 ? remainingDays.join(",") : null;

    startTransition(async () => {
      try {
        const res = await updateUserPicketDayAction(member.id, newValue);
        if (res.success) {
          toast.success(`Berhasil menghapus hari ${DAYS.find(d => d.key === dayToRemove)?.label} dari jadwal.`);
        }
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Gagal memperbarui jadwal piket.");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* 📅 Weekly Picket Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
        {DAYS.map((day) => {
          const list = grouped[day.key] || [];
          return (
            <Card key={day.key} className="shadow-none border border-zinc-200 dark:border-zinc-800 flex flex-col h-full min-h-[300px]">
              <CardHeader className="p-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-zinc-900 dark:text-zinc-50">{day.label}</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {list.length} Orang
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-2 flex-grow space-y-2 overflow-y-auto">
                {list.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center text-zinc-400 dark:text-zinc-600">
                    <HelpCircle className="size-5 mb-1 opacity-50" />
                    <span className="text-[10px]">Belum ada jadwal</span>
                  </div>
                ) : (
                  list.map((m) => (
                    <div
                      key={`${m.id}-${day.key}`}
                      className="group rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-2 text-xs transition-all hover:shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-sm select-none" title={getMood(m.currentMood).label}>
                            {getMood(m.currentMood).emoji}
                          </span>
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100 break-words line-clamp-1" title={m.name}>
                            {m.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {isManager && (
                            <button
                              disabled={isPending}
                              onClick={() => handleOpenEdit(m)}
                              className="text-zinc-400 hover:text-blue-600 rounded p-0.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                              title="Ubah Hari Piket"
                            >
                              <Edit2 className="size-3" />
                            </button>
                          )}
                          {isManager && (
                            <button
                              disabled={isPending}
                              onClick={() => handleRemoveSingleDay(m, day.key)}
                              className="text-zinc-400 hover:text-red-500 rounded p-0.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                              title="Hapus hari ini dari Jadwal"
                            >
                              <X className="size-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ⚠️ Unscheduled Staff List */}
      <Card className="shadow-none border border-zinc-200 dark:border-zinc-800">
        <CardHeader className="pb-3 flex-row items-center gap-2">
          <CalendarRange className="size-5 text-zinc-500" />
          <div>
            <CardTitle className="text-sm">Staf Belum Terjadwal</CardTitle>
            <CardDescription className="text-xs">
              Daftar staf aktif yang belum ditugaskan ke jadwal piket mingguan.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {unscheduled.length === 0 ? (
            <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg p-3 border border-zinc-150 dark:border-zinc-800/80">
              <UserCheck className="size-4 text-emerald-600" />
              <span>Semua staf aktif telah dijadwalkan piket rutin.</span>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {unscheduled.map((m) => (
                <div
                  key={m.id}
                  className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-2.5 py-1.5 text-xs"
                >
                  <span className="text-sm select-none" title={getMood(m.currentMood).label}>
                    {getMood(m.currentMood).emoji}
                  </span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">{m.name}</span>
                  <Badge variant="outline" className="text-[9px] px-1 py-0">
                    {m.memberStatus === "INTERN" ? "Intern" : "Team"}
                  </Badge>
                  {isManager && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEdit(m)}
                      className="h-6 text-[10px] px-2"
                    >
                      + Jadwal Piket
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 📝 Dialog Edit Hari Piket */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Atur Hari Piket Staf</DialogTitle>
            <DialogDescription>
              Tentukan hari piket untuk <b>{editingMember?.name}</b> (Studio {editingMember?.defaultStudio?.name ?? "-"}).
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3">
            <p className="text-xs text-zinc-500 mb-1">
              Batas Maksimal: {editingMember?.defaultStudio?.name.toLowerCase().includes("kipa") ? "2 Hari (Studio Kipa)" : "1 Hari (Studio Mahative)"}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {DAYS.map((day) => (
                <label
                  key={day.key}
                  className="flex items-center gap-3 p-2 rounded-lg border border-zinc-200 dark:border-zinc-850 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 cursor-pointer text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selectedDays.includes(day.key)}
                    onChange={() => handleToggleDayCheckbox(day.key)}
                    className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500"
                  />
                  <span>{day.label}</span>
                </label>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Batal
            </Button>
            <Button 
              onClick={handleSavePicketDays} 
              disabled={isPending}
              className="bg-blue-700 hover:bg-blue-800 text-white"
            >
              Simpan Jadwal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
