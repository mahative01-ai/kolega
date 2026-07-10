"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 rounded-lg hover:opacity-90 transition-all font-medium shadow-sm text-sm"
    >
      <Printer className="size-4" />
      Cetak Slip Gaji
    </button>
  );
}
