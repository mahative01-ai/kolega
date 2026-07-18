"use client";

import { useState, useTransition } from "react";
import { ArrowLeftRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { swapHolidayAction } from "./actions";

type Studio = { id: string; name: string };

type Props = {
  studios: Studio[];
  monthKey: string;
};

export function HolidaySwapFormClient({ studios, monthKey }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form State
  const [studioId, setStudioId] = useState("");
  const [holidayName, setHolidayName] = useState("");
  const [originalDate, setOriginalDate] = useState(monthKey + "-01");
  const [newDate, setNewDate] = useState(monthKey + "-01");

  function resetForm() {
    setStudioId("");
    setHolidayName("");
    setOriginalDate(monthKey + "-01");
    setNewDate(monthKey + "-01");
    setError("");
    setSuccess("");
  }

  function handleSubmit() {
    if (!holidayName.trim()) {
      setError("Holiday name is required.");
      return;
    }
    if (!originalDate || !newDate) {
      setError("Both dates are required.");
      return;
    }
    if (originalDate === newDate) {
      setError("Original and new dates cannot be the same.");
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
        setSuccess("Holiday successfully swapped/transferred!");
        setTimeout(() => {
          setOpen(false);
          resetForm();
        }, 1500);
      } catch (error: unknown) {
        setError(error instanceof Error ? error.message : "An error occurred while processing the holiday swap.");
      }
    });
  }

  return (
    <>
      <Button variant="outline" size="sm" className="w-full" onClick={() => setOpen(true)}>
        <ArrowLeftRight className="size-4" />
        Swap Holiday
      </Button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Swap / Transfer Holiday</DialogTitle>
            <DialogDescription>
              Transfer a national holiday to another date for the selected studio.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Studio */}
            <div className="grid gap-1.5">
              <Label>Studio</Label>
              <Select value={studioId || "__global__"} onValueChange={(v) => setStudioId(v === "__global__" || !v ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select studio or leave global">
                    {(val) => val === "__global__" || !val ? "🌐 All Studios (Global)" : (studios.find((s) => s.id === val)?.name || val)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__global__">🌐 All Studios (Global)</SelectItem>
                  {studios.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Nama Libur */}
            <div className="grid gap-1.5">
              <Label htmlFor="swap-name">Original Holiday Name</Label>
              <Input
                id="swap-name"
                placeholder="Example: Islamic New Year"
                value={holidayName}
                onChange={(e) => setHolidayName(e.target.value)}
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="swap-orig">Original Holiday Date</Label>
                <Input
                  id="swap-orig"
                  type="date"
                  value={originalDate}
                  onChange={(e) => setOriginalDate(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="swap-new">New Holiday Date</Label>
                <Input
                  id="swap-new"
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                />
              </div>
            </div>

            <div className="rounded-lg bg-zinc-50 border border-zinc-200 p-3 text-xs text-zinc-650 leading-relaxed">
              💡 **What happens?**
              <ul className="list-disc pl-4 mt-1 space-y-1">
                <li>Original Holiday Date will become a **Replacement Workday** (Required attendance).</li>
                <li>New Holiday Date will become a **Company Joint Leave** (Holiday/Off).</li>
              </ul>
            </div>

            {error && <p className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</p>}
            {success && <p className="rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-700">{success}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : "Process Swap"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
