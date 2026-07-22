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
import { Megaphone, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type AnnouncementItem = {
  id: string;
  title: string;
  message: string;
  publishAt: Date | string;
  eventDate: Date | string | null;
  priority: number;
};

type Props = {
  announcements: AnnouncementItem[];
};

export function ActiveAnnouncementsClient({ announcements }: Props) {
  const [open, setOpen] = useState(false);

  if (announcements.length === 0) return null;

  const displayList = announcements.slice(0, 3);
  const hasMore = announcements.length > 3;

  const formatDate = (dateStr: Date | string | null) => {
    if (!dateStr) return "";
    return new Intl.DateTimeFormat("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(dateStr));
  };

  const primary = displayList[0];

  return (
    <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950 shadow-sm dark:border-blue-900 dark:bg-blue-950/20 dark:text-blue-200">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-blue-200 bg-white text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
            <Megaphone className="size-4" />
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-blue-950 dark:text-blue-200">Studio Announcements</h3>
              {announcements.length > 1 && (
                <Badge variant="outline" className="border-blue-200 bg-white/70 text-[10px] text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
                  {announcements.length} active
                </Badge>
              )}
            </div>
            <p className="font-semibold text-blue-900 dark:text-blue-200">{primary.title}</p>
            <p className="line-clamp-2 text-xs leading-relaxed text-blue-800/80 dark:text-blue-300/80">
              {primary.message}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px] text-blue-700/70 dark:text-blue-300/70">
              <span>Published: {formatDate(primary.publishAt)}</span>
              {primary.eventDate && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="size-3" />
                  Event: {formatDate(primary.eventDate)}
                </span>
              )}
            </div>
          </div>
        </div>
        {hasMore && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              render={
                <Button variant="outline" size="sm" className="h-8 shrink-0 border-blue-200 bg-white text-xs text-blue-700 hover:bg-blue-50 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-950/60 cursor-pointer">
                  View all ({announcements.length})
                </Button>
              }
            />
            <DialogContent className="max-w-lg p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-sans max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Megaphone className="size-5 text-blue-700 dark:text-blue-400" />
                  All Active Announcements
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {announcements.map((ann) => (
                  <div key={ann.id} className="p-3.5 rounded-lg border border-zinc-250 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/10 space-y-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h4 className="font-semibold text-zinc-900 dark:text-zinc-550 text-sm">{ann.title}</h4>
                      <div className="flex items-center gap-1.5">
                        {ann.priority > 0 && (
                          <Badge className="bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300 border-red-200 border text-[9px] font-bold">
                            High Priority
                          </Badge>
                        )}
                        {ann.eventDate && (
                          <Badge variant="outline" className="text-[9px] flex items-center gap-1">
                            <Calendar className="size-2.5" />
                            Event: {formatDate(ann.eventDate)}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-zinc-650 dark:text-zinc-350 whitespace-pre-wrap leading-relaxed">
                      {ann.message}
                    </p>
                    <span className="text-[10px] text-zinc-400 block pt-1">
                      Published: {formatDate(ann.publishAt)}
                    </span>
                  </div>
                ))}
              </div>

              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setOpen(false)} className="h-9 text-xs">
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
