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
      toast.success("Daily attendance mood saved successfully!");
      router.push(dashboardPath);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to save mood.");
      setLoading(false);
    }
  }

  return (
    <Card className="max-w-xl mx-auto border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-zinc-900 dark:text-zinc-50">
          <Smile className="size-6 text-blue-600 dark:text-blue-400" />
          How Are You Feeling & Focusing Today?
        </CardTitle>
        <CardDescription className="text-zinc-500 dark:text-zinc-400">
          Your attendance has been recorded. Select your mood and write a brief status message for your studio teammates.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              Select Attendance Mood
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
              Status Message / Focus Area (Optional)
            </Label>
            <Input
              id="mood-note"
              value={moodNote}
              onChange={(e) => setMoodNote(e.target.value)}
              placeholder="Example: Focusing on dashboard layout / Ready for client revision..."
              className="h-10"
              maxLength={280}
            />
            <p className="text-[11px] text-zinc-400 text-right">
              {moodNote.length}/280 characters
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
                  Saving...
                </>
              ) : (
                <>
                  <Send className="mr-2 size-4" />
                  Save & Continue to Dashboard
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
