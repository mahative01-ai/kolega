"use client";

import React, { useState } from "react";
import { Paperclip, FileText, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type Props = {
  url: string | null;
  label?: string;
};

export function AttachmentViewer({ url, label = "View File" }: Props) {
  const [open, setOpen] = useState(false);

  if (!url) {
    return <span className="text-xs text-zinc-400">-</span>;
  }

  const handleOpenNewTab = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      if (url.startsWith("data:")) {
        const parts = url.split(";base64,");
        const contentType = parts[0].replace("data:", "") || "application/octet-stream";
        const base64Data = parts[1] || "";
        
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: contentType });
        const blobUrl = URL.createObjectURL(blob);
        
        window.open(blobUrl, "_blank");
      } else {
        window.open(url, "_blank");
      }
    } catch (err) {
      console.error("Failed to open attachment in new tab:", err);
      window.open(url, "_blank");
    }
  };

  const isImage = url.startsWith("data:image/");
  const isPdf = url.startsWith("data:application/pdf");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline font-medium cursor-pointer"
      >
        <Paperclip className="size-3" />
        {label}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-6 font-sans">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
              <Paperclip className="size-4 text-blue-600 dark:text-blue-400" />
              Attachment Preview
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              Supporting document attached to this request.
            </DialogDescription>
          </DialogHeader>

          <div className="my-2 min-h-[250px] max-h-[65vh] overflow-auto rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex flex-col items-center justify-center p-4">
            {isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={url}
                alt="Attachment Preview"
                className="max-h-[55vh] w-auto object-contain rounded shadow-sm"
              />
            ) : isPdf ? (
              <iframe
                src={url}
                title="PDF Document Preview"
                className="w-full h-[55vh] rounded border-0"
              />
            ) : (
              <div className="text-center p-6 space-y-3">
                <FileText className="size-12 text-zinc-400 mx-auto" />
                <p className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">
                  Document attached. Use the button below to open in a new tab.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-900">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenNewTab}
              className="text-xs flex items-center gap-1.5"
            >
              <ExternalLink className="size-3.5" />
              Open in New Tab
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
