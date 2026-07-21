"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Smile, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { MOODS, type MoodKey } from "@/lib/moods";
import { submitAttendanceMoodAction } from "./actions";

type Props = {
  initialMood?: string | null;
  initialMoodNote?: string | null;
  dashboardPath: string;
};

export function MoodClient({ initialMood, initialMoodNote, dashboardPath }: Props) {
  const router = useRouter();
  const [selectedMood, setSelectedMood] = useState<MoodKey>(
    (initialMood as MoodKey) || "NEUTRAL"
  );
  const [moodNote, setMoodNote] = useState(initialMoodNote || "");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData();
    formData.append("mood", selectedMood);
    formData.append("moodNote", moodNote);

    try {
      await submitAttendanceMoodAction(formData);
      toast.success("Mood presensi harian berhasil disimpan!");
      router.push(dashboardPath);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan mood.");
      setLoading(false);
    }
  }

  return (
    <Card className="max-w-xl mx-auto border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-zinc-900 dark:text-zinc-50">
          <Smile className="size-6 text-blue-600 dark:text-blue-400" />
          Bagaimana Perasaan & Fokus Kerja Hari Ini?
        </CardTitle>
        <CardDescription className="text-zinc-500 dark:text-zinc-400">
          Presensi Anda telah berhasil dicatat. Pilih mood dan tulis status singkat untuk dibagikan ke rekan satu studio.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              Pilih Mood Presensi
            </Label>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
              {MOODS.map((m) => {
                const isSelected = selectedMood === m.key;
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setSelectedMood(m.key)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                      isSelected
                        ? `${m.bgColor} ${m.borderColor} ring-2 ring-blue-500 scale-[1.03] shadow-sm`
                        : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900/60"
                    }`}
                  >
                    <span className="text-2xl mb-1">{m.emoji}</span>
                    <span className="text-[11px] font-bold text-zinc-950 dark:text-zinc-50">
                      {m.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mood-note" className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              Status Singkat / Fokus Kerja (Opsional)
            </Label>
            <Input
              id="mood-note"
              value={moodNote}
              onChange={(e) => setMoodNote(e.target.value)}
              placeholder="Contoh: Fokus pengerjaan layout dashboard / Siap sprint revisi..."
              className="h-10"
              maxLength={280}
            />
            <p className="text-[11px] text-zinc-400 text-right">
              {moodNote.length}/280 karakter
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-650 hover:bg-blue-750 text-white w-full sm:w-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Send className="mr-2 size-4" />
                  Simpan & Lanjut ke Dashboard
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
