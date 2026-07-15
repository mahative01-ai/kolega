"use client";

import { useTransition } from "react";
import { CalendarRange, UserCheck, HelpCircle, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

  // Group members by picketDay
  const grouped = DAYS.reduce((acc, day) => {
    acc[day.key] = members.filter((m) => m.picketDay === day.key);
    return acc;
  }, {} as Record<string, Member[]>);

  const unscheduled = members.filter((m) => !m.picketDay);

  const handleDayChange = (userId: string, newDay: string) => {
    const val = newDay === "NONE" ? null : newDay;
    startTransition(async () => {
      try {
        const res = await updateUserPicketDayAction(userId, val);
        if (res.success) {
          toast.success("Jadwal hari piket berhasil diperbarui.");
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
                      key={m.id}
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
                          <Badge
                            variant="outline"
                            className={`text-[8px] px-1 py-0 scale-90 origin-right border shadow-none ${
                              m.memberStatus === "INTERN"
                                ? "bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900"
                                : "bg-blue-50 dark:bg-blue-950/20 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-900"
                            }`}
                          >
                            {m.memberStatus === "INTERN" ? "Intern" : "Team"}
                          </Badge>
                          {isManager && (
                            <button
                              disabled={isPending}
                              onClick={() => handleDayChange(m.id, "NONE")}
                              className="text-zinc-400 hover:text-red-500 rounded p-0.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                              title="Hapus dari Jadwal"
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
                    <select
                      value="NONE"
                      disabled={isPending}
                      onChange={(e) => handleDayChange(m.id, e.target.value)}
                      className="text-[10px] rounded border border-zinc-200 dark:border-zinc-800 p-0.5 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 outline-none cursor-pointer"
                    >
                      <option value="NONE" disabled>+ Hari Piket</option>
                      {DAYS.map((d) => (
                        <option key={d.key} value={d.key}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
