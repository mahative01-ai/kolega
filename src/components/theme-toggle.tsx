"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-9 rounded-lg border border-zinc-200 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      title={isDark ? "Aktifkan Mode Terang" : "Aktifkan Mode Gelap"}
    >
      {isDark ? (
        <Sun className="size-4 text-amber-500 fill-amber-500/20" />
      ) : (
        <Moon className="size-4 text-zinc-700" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
