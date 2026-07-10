"use client";

import { useState } from "react";
import { Megaphone, X } from "lucide-react";

type Props = {
  id: string;
  title: string;
  message: string;
};

export function AnnouncementBanner({ id, title, message }: Props) {
  const dismissedKey = `announcement_dismissed_${id}`;
  const [dismissed, setDismissed] = useState(() =>
    typeof window === "undefined" ? true : localStorage.getItem(dismissedKey) === "true"
  );

  function handleDismiss() {
    localStorage.setItem(dismissedKey, "true");
    setDismissed(true);
  }

  if (dismissed) return null;

  return (
    <div className="relative overflow-hidden mb-6 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20 p-4 shadow-sm animate-in slide-in-from-top-4 duration-300">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-blue-100 dark:bg-blue-950/80 p-2 text-blue-700 dark:text-blue-400 shrink-0">
          <Megaphone className="size-4 animate-bounce" />
        </div>
        <div className="flex-1 min-w-0 pr-6">
          <h4 className="text-sm font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
            {title}
          </h4>
          <p className="text-xs text-blue-700 dark:text-blue-400 mt-1 whitespace-pre-wrap leading-relaxed">
            {message}
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-blue-400 hover:text-blue-600 dark:hover:text-blue-200 transition-colors"
          title="Tutup"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
