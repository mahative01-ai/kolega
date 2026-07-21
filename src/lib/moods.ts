export type MoodKey =
  | "HAPPY"
  | "CALM"
  | "FOCUSED"
  | "ENERGETIC"
  | "TIRED"
  | "STRESSED"
  | "EXCITED"
  | "SAD"
  | "ANGRY"
  | "COOL"
  | "CAFFEINATED"
  | "NEUTRAL";

export type MoodDef = {
  key: MoodKey;
  label: string;
  emoji: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
};

export const MOODS: MoodDef[] = [
  { key: "HAPPY", label: "Happy", emoji: "😄", bgColor: "bg-yellow-100 dark:bg-yellow-950/40", textColor: "text-yellow-700 dark:text-yellow-400", borderColor: "border-yellow-250 dark:border-yellow-900" },
  { key: "CALM", label: "Calm", emoji: "😌", bgColor: "bg-teal-100 dark:bg-teal-950/40", textColor: "text-teal-700 dark:text-teal-400", borderColor: "border-teal-250 dark:border-teal-900" },
  { key: "FOCUSED", label: "Focused", emoji: "🧐", bgColor: "bg-blue-100 dark:bg-blue-950/40", textColor: "text-blue-700 dark:text-blue-400", borderColor: "border-blue-250 dark:border-blue-900" },
  { key: "ENERGETIC", label: "Energetic", emoji: "⚡", bgColor: "bg-orange-100 dark:bg-orange-950/40", textColor: "text-orange-700 dark:text-orange-400", borderColor: "border-orange-250 dark:border-orange-900" },
  { key: "TIRED", label: "Tired", emoji: "🥱", bgColor: "bg-zinc-100 dark:bg-zinc-800/40", textColor: "text-zinc-700 dark:text-zinc-400", borderColor: "border-zinc-250 dark:border-zinc-800" },
  { key: "STRESSED", label: "Stressed", emoji: "🤯", bgColor: "bg-rose-100 dark:bg-rose-950/40", textColor: "text-rose-700 dark:text-rose-400", borderColor: "border-rose-250 dark:border-rose-900" },
  { key: "EXCITED", label: "Excited", emoji: "🤩", bgColor: "bg-indigo-100 dark:bg-indigo-950/40", textColor: "text-indigo-700 dark:text-indigo-400", borderColor: "border-indigo-250 dark:border-indigo-900" },
  { key: "SAD", label: "Sad", emoji: "😢", bgColor: "bg-sky-100 dark:bg-sky-950/40", textColor: "text-sky-700 dark:text-sky-400", borderColor: "border-sky-250 dark:border-sky-900" },
  { key: "ANGRY", label: "Angry", emoji: "😡", bgColor: "bg-red-100 dark:bg-red-950/40", textColor: "text-red-700 dark:text-red-400", borderColor: "border-red-250 dark:border-red-900" },
  { key: "COOL", label: "Cool", emoji: "😎", bgColor: "bg-violet-100 dark:bg-violet-950/40", textColor: "text-violet-700 dark:text-violet-400", borderColor: "border-violet-250 dark:border-violet-900" },
  { key: "CAFFEINATED", label: "Caffeinated", emoji: "☕", bgColor: "bg-amber-100 dark:bg-amber-950/40", textColor: "text-amber-700 dark:text-amber-400", borderColor: "border-amber-250 dark:border-amber-900" },
  { key: "NEUTRAL", label: "Neutral", emoji: "😐", bgColor: "bg-slate-100 dark:bg-slate-800/40", textColor: "text-slate-700 dark:text-slate-400", borderColor: "border-slate-250 dark:border-slate-800" },
];

export function getMood(key?: string | null): MoodDef {
  const normKey = (key || "NEUTRAL").toUpperCase() as MoodKey;
  return MOODS.find((m) => m.key === normKey) || MOODS[11];
}

export function isValidMoodKey(key: string): key is MoodKey {
  return MOODS.some((m) => m.key === key.toUpperCase());
}

