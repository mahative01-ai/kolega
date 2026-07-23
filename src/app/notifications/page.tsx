import { Bell, Check, Mail, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DashboardShell } from "@/components/dashboard-shell";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { markNotificationReadAction, markAllNotificationsReadAction } from "./actions";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  async function handleMarkReadServer(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    if (id) await markNotificationReadAction(id);
  }

  async function handleMarkAllReadServer() {
    "use server";
    await markAllNotificationsReadAction();
  }

  async function handleDeleteAll() {
    "use server";
    const u = await getCurrentUser();
    if (u) {
      await prisma.notification.deleteMany({ where: { userId: u.id } });
      revalidatePath("/notifications");
    }
  }

  return (
    <DashboardShell
      user={user}
      currentPath="/notifications"
      badge="Notifications"
      title="Notification Inbox"
      description="View all message history and notifications."
    >
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-zinc-950 dark:text-zinc-50">All Notifications</h2>
            {unreadCount > 0 && (
              <Badge className="bg-blue-600 text-white border-0">{unreadCount} unread</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <form action={handleMarkAllReadServer}>
                <Button type="submit" variant="outline" size="sm">
                  <Check className="size-4 mr-1.5" />
                  Mark All Read
                </Button>
              </form>
            )}
            {notifications.length > 0 && (
              <form action={handleDeleteAll}>
                <Button type="submit" variant="ghost" size="sm" className="text-zinc-500 dark:text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20">
                  <Trash2 className="size-4 mr-1.5" />
                  Delete All
                </Button>
              </form>
            )}
          </div>
        </div>

        <Card>
          <CardContent className="p-0 divide-y divide-zinc-100 dark:divide-zinc-800">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-500">
                <Bell className="size-10 text-zinc-300 dark:text-zinc-700 mb-2" />
                <p className="text-sm font-semibold">Inbox Empty</p>
                <p className="text-xs text-zinc-400 mt-1">You have no notifications at this time.</p>
              </div>
            ) : (
              notifications.map((n) => {
                const dateStr = new Intl.DateTimeFormat("id-ID", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(n.createdAt);

                return (
                  <div
                    key={n.id}
                    className={`flex items-start gap-4 p-4 transition-colors ${
                      !n.readAt ? "bg-blue-50/20 dark:bg-blue-950/10" : ""
                    }`}
                  >
                    <div className={`mt-0.5 rounded-full p-2 ${!n.readAt ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500"}`}>
                      <Mail className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-zinc-950 dark:text-zinc-100">{n.title}</p>
                      <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-0.5 leading-relaxed">{n.message}</p>
                      <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2">{dateStr}</p>
                    </div>
                    {!n.readAt && (
                      <form action={handleMarkReadServer}>
                        <input type="hidden" name="id" value={n.id} />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-zinc-400 hover:text-zinc-800 hover:bg-zinc-50 dark:hover:text-zinc-200 dark:hover:bg-zinc-900"
                          title="Mark as read"
                        >
                          <Check className="size-4" />
                        </Button>
                      </form>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
