"use client";

import { useState } from "react";
import { Send, FileText, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveWfoJournalAction } from "./actions";
import { toast } from "sonner";

type Props = {
  initialJournal?: string | null;
  hasCheckedIn?: boolean;
  hasCheckedOut?: boolean;
};

export function WfoJournalForm({ initialJournal, hasCheckedIn, hasCheckedOut }: Props) {
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [text, setText] = useState(initialJournal || "");
  const isJournalRequiredForCheckout = Boolean(hasCheckedIn && !hasCheckedOut && !initialJournal?.trim());

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setSaved(false);
    
    const formData = new FormData();
    formData.append("wfoJournal", text);

    try {
      await saveWfoJournalAction(formData);
      toast.success("WFO journal saved.");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save WFO journal.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="grid gap-3 font-sans">
      {isJournalRequiredForCheckout && !saved && (
        <div className="text-[11px] font-medium text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded p-2 flex items-center gap-1.5">
          <AlertCircle className="size-3.5 text-amber-600 shrink-0" />
          Please fill and save your WFO Journal before checking out.
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="wfoJournal" className="text-xs font-semibold text-zinc-500 flex items-center gap-1">
          <FileText className="size-3.5 text-zinc-400" />
          Work Result Report / Today&apos;s Journal
        </label>
        <textarea
          id="wfoJournal"
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write the work progress you completed today..."
          className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3 text-sm outline-none focus:border-zinc-950 dark:focus:border-zinc-300 focus:ring-1 focus:ring-zinc-950 dark:focus:ring-zinc-300 disabled:opacity-50"
          required
          disabled={loading}
        />
        <p className="text-[10px] text-zinc-450 dark:text-zinc-550 leading-relaxed">
          Keep today&apos;s work progress concise and clear. You can update it anytime.
        </p>
      </div>

      <Button type="submit" disabled={loading || !text.trim()} className="w-full sm:w-auto self-start flex items-center gap-1.5 h-9 text-xs">
        {loading ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : saved ? (
          <CheckCircle2 className="size-3.5 text-emerald-500" />
        ) : (
          <Send className="size-3.5" />
        )}
        {loading ? "Saving..." : saved ? "Saved!" : "Save WFO Journal"}
      </Button>
    </form>
  );
}
