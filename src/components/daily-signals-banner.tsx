import React from "react";
import type { DailySignals } from "@/lib/daily-signals";
import { getMood } from "@/lib/moods";
import { Calendar, Smile, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ConfettiTrigger } from "@/components/confetti-trigger";

type Props = {
  signals: DailySignals;
  currentUserId?: string;
  className?: string;
};

const eventTypeLabels: Record<string, string> = {
  NATIONAL_HOLIDAY: "Hari Libur Nasional",
  COMPANY_LEAVE: "Cuti Bersama",
  REGULAR_OFF_DAY: "Hari Off Studio",
  REPLACEMENT_WORKDAY: "Hari Kerja Pengganti",
  STUDIO_EVENT: "Event Studio",
};

export function DailySignalsBanner({ signals, currentUserId, className }: Props) {
  const { birthdays: rawBirthdays, moodSummary, events } = signals;

  // Filter out current user to prevent duplicate birthday card if personal card is shown
  const filteredBirthdays = currentUserId
    ? rawBirthdays.filter((b) => b.id !== currentUserId)
    : rawBirthdays;

  const hasRawBirthdays = rawBirthdays.length > 0;
  const hasFilteredBirthdays = filteredBirthdays.length > 0;
  const hasEvents = events.length > 0;
  const hasMoodSummary = moodSummary.sharedMoodCount > 0 && moodSummary.mostCommonMood;

  if (!hasRawBirthdays && !hasEvents && !hasMoodSummary) {
    return null;
  }

  return (
    <div className={`space-y-3 mb-6 ${className ?? ""}`}>
      {/* Trigger confetti when any studio colleague has a birthday today */}
      {hasRawBirthdays && <ConfettiTrigger preset="fireworks" />}

      {/* Birthday Signal Banner for colleagues */}
      {hasFilteredBirthdays && (
        <div className="rounded-xl border border-pink-200 dark:border-pink-900/60 bg-pink-50/80 dark:bg-pink-950/30 p-4 text-sm text-pink-900 dark:text-pink-200 flex items-start gap-3.5 shadow-xs transition-all">
          <span className="text-2xl select-none leading-none pt-0.5">🎂</span>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-sm text-pink-950 dark:text-pink-100 flex items-center gap-1.5">
              <span>Birthdays Today!</span>
              <Sparkles className="size-3.5 text-pink-600 dark:text-pink-400" />
            </h4>
            <div className="mt-1 text-xs text-pink-800 dark:text-pink-300 space-y-0.5">
              {filteredBirthdays.map((b) => (
                <div key={b.id} className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-pink-950 dark:text-pink-100">{b.name}</span>
                  {b.defaultStudioName && (
                    <span className="text-[10px] bg-pink-100 dark:bg-pink-900/50 px-2 py-0.2 rounded-full font-medium text-pink-700 dark:text-pink-300">
                      {b.defaultStudioName}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <p className="text-[11px] text-pink-700 dark:text-pink-400 mt-1.5 italic">
              Jangan lupa berikan ucapan hangat untuk rekan kerja Anda hari ini! 🎉
            </p>
          </div>
        </div>
      )}

      {/* Event Studio Signal Banner */}
      {hasEvents && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/80 dark:bg-amber-950/30 p-4 text-sm text-amber-900 dark:text-amber-200 flex items-start gap-3.5 shadow-xs">
          <Calendar className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-sm text-amber-950 dark:text-amber-100">
              Agenda & Event Studio Hari Ini
            </h4>
            <div className="mt-1.5 space-y-1">
              {events.map((e) => (
                <div key={e.id} className="flex items-center gap-2 text-xs flex-wrap">
                  <span className="font-semibold text-amber-900 dark:text-amber-100">{e.title}</span>
                  <Badge variant="outline" className="text-[10px] bg-amber-100 dark:bg-amber-900/50 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300">
                    {eventTypeLabels[e.type] ?? e.type}
                  </Badge>
                  {e.studioName && (
                    <span className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                      ({e.studioName})
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mood Summary Signal */}
      {hasMoodSummary && moodSummary.mostCommonMood && (
        <div className="rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/20 p-3.5 text-xs text-blue-900 dark:text-blue-200 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <Smile className="size-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>
              <strong>{moodSummary.sharedMoodCount}</strong> dari {moodSummary.totalCheckedIn} rekan presensi telah membagikan mood.
            </span>
          </div>
          {(() => {
            const moodDef = getMood(moodSummary.mostCommonMood);
            return (
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-zinc-500 text-[10px] uppercase font-bold">Terbanyak:</span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-semibold ${moodDef.bgColor} ${moodDef.borderColor} ${moodDef.textColor}`}>
                  <span>{moodDef.emoji}</span>
                  <span>{moodDef.label}</span>
                </span>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
