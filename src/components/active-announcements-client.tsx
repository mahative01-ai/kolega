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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Megaphone, Calendar, ChevronRight } from "lucide-react";
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

  return (
    <Card className="shadow-none border border-zinc-200 dark:border-zinc-800">
      <CardHeader className="pb-3 border-b border-zinc-150 dark:border-zinc-800 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-zinc-900 dark:text-zinc-50">
            <Megaphone className="size-4 text-blue-700 dark:text-blue-400" />
            Studio Announcements
          </CardTitle>
          <CardDescription className="text-[10px] text-zinc-500">
            Active announcements and upcoming events.
          </CardDescription>
        </div>
        {hasMore && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              render={
                <Button variant="ghost" size="sm" className="h-7 text-xs text-blue-600 dark:text-blue-450 hover:underline cursor-pointer">
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
      </CardHeader>
      <CardContent className="pt-4 space-y-3">
        {displayList.map((ann) => (
          <div key={ann.id} className="text-xs border-b border-zinc-100 dark:border-zinc-800 pb-3 last:border-b-0 last:pb-0">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-zinc-900 dark:text-zinc-200">{ann.title}</span>
              <div className="flex items-center gap-1 shrink-0">
                {ann.priority > 0 && (
                  <span className="bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 border border-red-100 text-[8px] font-bold px-1 rounded">
                    High
                  </span>
                )}
                {ann.eventDate && (
                  <span className="text-[9px] text-zinc-400 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-1 rounded flex items-center gap-0.5">
                    <Calendar className="size-2.5" />
                    {formatDate(ann.eventDate)}
                  </span>
                )}
              </div>
            </div>
            <p className="text-zinc-600 dark:text-zinc-405 mt-1.5 leading-relaxed whitespace-pre-wrap">
              {ann.message}
            </p>
            <span className="text-[9px] text-zinc-400 block mt-1">
              Published: {formatDate(ann.publishAt)}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
