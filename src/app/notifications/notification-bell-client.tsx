"use client";

import { useState, useEffect, useTransition } from "react";
import { Bell, Check, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getUnreadCountAction, markNotificationReadAction, markAllNotificationsReadAction } from "./actions";
import Link from "next/link";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
};

type Props = {
  initialNotifications: NotificationItem[];
  initialUnreadCount: number;
};

export function NotificationBellClient({ initialNotifications, initialUnreadCount }: Props) {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [isPending, startTransition] = useTransition();

  // Periodically poll unread count (every 30s)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const count = await getUnreadCountAction();
        setUnreadCount(count);
      } catch (_) {}
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Update state when initial values change
  useEffect(() => {
    setNotifications(initialNotifications);
    setUnreadCount(initialUnreadCount);
  }, [initialNotifications, initialUnreadCount]);

  function handleMarkRead(id: string) {
    startTransition(async () => {
      try {
        await markNotificationReadAction(id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch (_) {}
    });
  }

  function handleMarkAllRead() {
    startTransition(async () => {
      try {
        await markAllNotificationsReadAction();
        setNotifications((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })));
        setUnreadCount(0);
      } catch (_) {}
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative rounded-full p-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
        aria-label="Notifikasi"
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white ring-2 ring-white dark:ring-zinc-950">
            {unreadCount}
          </span>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader className="flex-row items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
            <div>
              <DialogTitle className="text-base flex items-center gap-1.5 text-zinc-950 dark:text-zinc-50">
                <Bell className="size-4 text-blue-700 dark:text-blue-400" />
                Notifikasi
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400">
                Anda memiliki {unreadCount} pesan belum dibaca
              </DialogDescription>
            </div>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="h-8 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100" onClick={handleMarkAllRead} disabled={isPending}>
                <Check className="size-3 mr-1" />
                Semua Dibaca
              </Button>
            )}
          </DialogHeader>

          <div className="max-h-72 overflow-y-auto py-2 divide-y divide-zinc-100 dark:divide-zinc-800">
            {notifications.length === 0 ? (
              <p className="text-center py-8 text-xs text-zinc-400">Tidak ada notifikasi baru.</p>
            ) : (
              notifications.map((n) => {
                const dateStr = new Intl.DateTimeFormat("id-ID", {
                  dateStyle: "short",
                  timeStyle: "short",
                }).format(new Date(n.createdAt));

                return (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 p-3 transition-colors ${
                      !n.readAt ? "bg-blue-50/30 dark:bg-blue-500/5" : ""
                    }`}
                  >
                    <div className={`mt-0.5 rounded-full p-1.5 ${!n.readAt ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500"}`}>
                      <Mail className="size-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-zinc-950 dark:text-zinc-50">{n.title}</p>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5 leading-relaxed">{n.message}</p>
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">{dateStr}</p>
                    </div>
                    {!n.readAt && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded"
                        onClick={() => handleMarkRead(n.id)}
                        disabled={isPending}
                        title="Tandai dibaca"
                      >
                        <Check className="size-3" />
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex justify-center">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline"
            >
              Lihat Semua Notifikasi
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
