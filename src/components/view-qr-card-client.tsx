"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eye, Download, Printer, QrCode } from "lucide-react";

export function ViewQrCardClient() {
  const [open, setOpen] = useState(false);

  const handlePrint = () => {
    const printWindow = window.open("/member/presensi/qr-card?format=html", "_blank");
    if (printWindow) {
      printWindow.focus();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="h-8 text-xs flex items-center gap-1.5 cursor-pointer">
            <Eye className="size-3.5" />
            View My Card
          </Button>
        }
      />
      <DialogContent className="max-w-2xl overflow-hidden p-0 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-sans">
        <DialogHeader className="px-6 pt-6 pb-3">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <QrCode className="size-5 text-zinc-700 dark:text-zinc-400" />
            My QR Card
          </DialogTitle>
        </DialogHeader>
        
        <div className="mx-6 mb-6 rounded-xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
          <iframe
            src="/member/presensi/qr-card?format=html&embed=1"
            className="h-[320px] w-full rounded-lg border-0 bg-transparent"
            title="My QR Card Preview"
            key={open ? "open" : "closed"}
          />
        </div>

        <DialogFooter className="flex flex-col gap-2 border-t border-zinc-100 bg-zinc-50 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900/30 sm:flex-row sm:flex-wrap sm:justify-end">
          <a
            href="/member/presensi/qr-card?format=png"
            download="my-qr-card.png"
            className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-900 shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900 cursor-pointer"
          >
            <Download className="size-3.5 mr-1.5" />
            Download PNG
          </a>
          <a
            href="/member/presensi/qr-card?format=jpeg"
            download="my-qr-card.jpg"
            className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-900 shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900 cursor-pointer"
          >
            <Download className="size-3.5 mr-1.5" />
            Download JPEG
          </a>
          <Button variant="outline" size="sm" onClick={handlePrint} className="h-9 text-xs cursor-pointer">
            <Printer className="size-3.5 mr-1.5" />
            Print
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)} className="h-9 text-xs cursor-pointer">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
