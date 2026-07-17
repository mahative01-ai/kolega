"use client";

import { useState } from "react";
import { Send, FileText, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveWfoJournalAction } from "./actions";
import { toast } from "sonner";

type Props = {
  initialJournal?: string | null;
};

export function WfoJournalForm({ initialJournal }: Props) {
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [text, setText] = useState(initialJournal || "");

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setSaved(false);
    
    const formData = new FormData();
    formData.append("wfoJournal", text);

    try {
      await saveWfoJournalAction(formData);
      toast.success("Jurnal WFO berhasil disimpan.");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan jurnal WFO.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="grid gap-3 font-sans">
      <div className="flex flex-col gap-2">
        <label htmlFor="wfoJournal" className="text-xs font-semibold text-zinc-500 flex items-center gap-1">
          <FileText className="size-3.5 text-zinc-400" />
          Laporan Hasil Pekerjaan / Jurnal Hari Ini
        </label>
        <textarea
          id="wfoJournal"
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Tuliskan progress pekerjaan yang Anda lakukan hari ini..."
          className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3 text-sm outline-none focus:border-zinc-950 dark:focus:border-zinc-300 focus:ring-1 focus:ring-zinc-950 dark:focus:ring-zinc-300 disabled:opacity-50"
          required
          disabled={loading}
        />
        <p className="text-[10px] text-zinc-450 dark:text-zinc-550 leading-relaxed">
          Tulis progress kerja Anda hari ini secara ringkas dan jelas. Boleh diperbarui kapan saja.
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
        {loading ? "Menyimpan..." : saved ? "Tersimpan!" : "Simpan Jurnal WFO"}
      </Button>
    </form>
  );
}
