"use client";

import { useTransition } from "react";
import { Loader2, Home, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setWfhScheduleAction, resetWfoScheduleAction } from "./actions";

type ToggleProps = {
  userId: string;
  workDate: string;
  isWfh: boolean;
};

export function ToggleScheduleButton({ userId, workDate, isWfh }: ToggleProps) {
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      try {
        if (isWfh) {
          await resetWfoScheduleAction(userId, workDate);
        } else {
          await setWfhScheduleAction(userId, workDate);
        }
      } catch (err: any) {
        alert(err.message || "Gagal mengubah jadwal.");
      }
    });
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="w-full h-8 flex items-center justify-center gap-1.5"
      onClick={handleToggle}
      disabled={isPending}
    >
      {isPending ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : isWfh ? (
        <RotateCcw className="size-3.5" />
      ) : (
        <Home className="size-3.5" />
      )}
      {isPending ? "Memproses..." : isWfh ? "Set WFO" : "Set WFH"}
    </Button>
  );
}
