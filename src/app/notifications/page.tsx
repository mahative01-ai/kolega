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
      badge="Notifikasi"
      title="Kotak Masuk Notifikasi"
      description="Lihat semua riwayat pesan dan pemberitahuan aktivitas Anda."
    >
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-zinc-950">Semua Notifikasi</h2>
            {unreadCount > 0 && (
              <Badge className="bg-blue-600 text-white border-0">{unreadCount} belum dibaca</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <form action={handleMarkAllReadServer}>
                <Button type="submit" variant="outline" size="sm">
                  <Check className="size-4 mr-1.5" />
                  Semua Dibaca
                </Button>
              </form>
            )}
            {notifications.length > 0 && (
              <form action={handleDeleteAll}>
                <Button type="submit" variant="ghost" size="sm" className="text-zinc-500 hover:text-red-600 hover:bg-red-50">
                  <Trash2 className="size-4 mr-1.5" />
                  Hapus Semua
                </Button>
              </form>
            )}
          </div>
        </div>

        <Card>
          <CardContent className="p-0 divide-y divide-zinc-100">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-500">
                <Bell className="size-10 text-zinc-300 mb-2" />
                <p className="text-sm font-semibold">Kotak Masuk Kosong</p>
                <p className="text-xs text-zinc-400 mt-1">Anda tidak memiliki pemberitahuan saat ini.</p>
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
                      !n.readAt ? "bg-blue-50/20" : ""
                    }`}
                  >
                    <div className={`mt-0.5 rounded-full p-2 ${!n.readAt ? "bg-blue-100 text-blue-700" : "bg-zinc-100 text-zinc-400"}`}>
                      <Mail className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-zinc-950">{n.title}</p>
                      <p className="text-sm text-zinc-700 mt-0.5 leading-relaxed">{n.message}</p>
                      <p className="text-xs text-zinc-400 mt-2">{dateStr}</p>
                    </div>
                    {!n.readAt && (
                      <form action={handleMarkReadServer}>
                        <input type="hidden" name="id" value={n.id} />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-zinc-400 hover:text-zinc-800 hover:bg-zinc-50"
                          title="Tandai dibaca"
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
