import { CalendarDays, ChevronLeft, ChevronRight, ClipboardList, Trash2, UserPlus, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DashboardShell } from "@/components/dashboard-shell";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PicketFormClient } from "./piket-form-client";
import { deletePicketAction } from "./actions";
import { Label } from "@/components/ui/label";

export const dynamic = "force-dynamic";

const TZ = "Asia/Jakarta";

function getMonthKey(date = new Date()) {
  const p = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, year: "numeric", month: "2-digit",
  }).formatToParts(date);
  return `${p.find((x) => x.type === "year")?.value}-${p.find((x) => x.type === "month")?.value}`;
}

function parseMonthKey(key?: string) {
  const raw = key ?? getMonthKey();
  const [y, m] = raw.split("-").map(Number);
  const year = Number.isFinite(y) ? y : new Date().getFullYear();
  const month = Number.isFinite(m) && m >= 1 && m <= 12 ? m : new Date().getMonth() + 1;
  return { year, month };
}

function prevMonthKey(year: number, month: number) {
  const d = new Date(year, month - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function nextMonthKey(year: number, month: number) {
  const d = new Date(year, month, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(year: number, month: number) {
  return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(
    new Date(year, month - 1, 1)
  );
}

export default async function PicketPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; studioId?: string }>;
}) {
  const [user, params] = await Promise.all([getCurrentUser(), searchParams]);

  if (!user) redirect("/login");

  const { year, month } = parseMonthKey(params.month);
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 0));

  const isSuperAdmin = user.role === "SUPER_ADMIN";
  const isAdmin = user.role === "ADMIN";
  const isManager = isSuperAdmin || isAdmin;

  // Filter studio default untuk Admin
  const filterStudioId = isSuperAdmin
    ? params.studioId || ""
    : user.defaultStudioId ?? "__none__";

  const [studios, pickets, members] = await Promise.all([
    prisma.studio.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.picketSchedule.findMany({
      where: {
        picketDate: { gte: startDate, lte: endDate },
        ...(filterStudioId ? { studioId: filterStudioId } : {}),
      },
      include: {
        user: { select: { name: true, email: true } },
        studio: { select: { name: true } },
      },
      orderBy: { picketDate: "asc" },
    }),
    prisma.user.findMany({
      where: {
        accountStatus: "ACTIVE",
        role: { not: "SUPER_ADMIN" },
        ...(filterStudioId ? { defaultStudioId: filterStudioId } : {}),
      },
      select: { id: true, name: true, defaultStudioId: true },
      orderBy: { name: "asc" },
    }),
  ]);

  async function handleDeletePicket(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    if (id) await deletePicketAction(id);
  }

  // Tentukan studio aktif saat ini untuk context dropdown/tambah piket
  const activeStudioId = filterStudioId || (studios[0]?.id ?? "");

  return (
    <DashboardShell
      user={user}
      currentPath="/piket"
      badge="Piket"
      title="Jadwal Piket Studio"
      description="Lihat dan kelola pembagian tugas kebersihan & piket harian studio."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* ── main Column: Jadwal Bulanan ── */}
        <div className="space-y-6">
          {/* Studio Filter (Super Admin only) */}
          {isSuperAdmin && (
            <Card>
              <CardContent className="pt-6">
                <form className="flex flex-wrap items-center gap-3">
                  <input type="hidden" name="month" value={`${year}-${String(month).padStart(2, "0")}`} />
                  <Label htmlFor="studio-select" className="text-sm font-semibold">
                    Studio Aktif:
                  </Label>
                  <select
                    id="studio-select"
                    name="studioId"
                    defaultValue={filterStudioId}
                    className="h-9 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 px-3 text-sm focus:outline-none"
                  >
                    <option value="">🌐 Semua Studio</option>
                    {studios.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <Button type="submit" size="sm">
                    Tampilkan
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Monthly Pickets Card */}
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-2 pb-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="size-5 text-blue-700" />
                  {formatMonthLabel(year, month)}
                </CardTitle>
                <CardDescription>
                  Ada {pickets.length} jadwal tugas piket bulan ini
                </CardDescription>
              </div>
              <div className="flex items-center gap-1">
                <a
                  href={`?month=${prevMonthKey(year, month)}&studioId=${filterStudioId}`}
                  className={buttonVariants({ variant: "outline", size: "icon" })}
                >
                  <ChevronLeft className="size-4" />
                </a>
                <a
                  href={`?month=${nextMonthKey(year, month)}&studioId=${filterStudioId}`}
                  className={buttonVariants({ variant: "outline", size: "icon" })}
                >
                  <ChevronRight className="size-4" />
                </a>
              </div>
            </CardHeader>
            <CardContent>
              {pickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-500">
                  <ClipboardList className="size-10 text-zinc-300 mb-2" />
                  <p className="text-sm font-semibold">Tidak Ada Jadwal Piket</p>
                  <p className="text-xs text-zinc-400 mt-1">Belum ada petugas piket yang ditugaskan untuk bulan ini.</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border border-zinc-200">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-zinc-200">
                        <th className="p-3 font-semibold text-zinc-700">Tanggal</th>
                        <th className="p-3 font-semibold text-zinc-700">Petugas</th>
                        {isSuperAdmin && <th className="p-3 font-semibold text-zinc-700">Studio</th>}
                        <th className="p-3 font-semibold text-zinc-700">Catatan</th>
                        {isManager && <th className="p-3 text-right font-semibold text-zinc-700">Aksi</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {pickets.map((p) => {
                        const dateStr = new Intl.DateTimeFormat("id-ID", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          timeZone: TZ,
                        }).format(p.picketDate);

                        const isToday =
                          p.picketDate.toISOString().slice(0, 10) ===
                          new Date().toISOString().slice(0, 10);

                        return (
                          <tr key={p.id} className={isToday ? "bg-amber-500/10" : ""}>
                            <td className="p-3 font-medium whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                {dateStr}
                                {isToday && (
                                  <Badge className="bg-amber-500 text-white text-[10px] px-1 py-0 border-0">
                                    Hari Ini
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="p-3 font-semibold text-zinc-950 dark:text-zinc-50">{p.user.name}</td>
                            {isSuperAdmin && <td className="p-3 text-zinc-600 dark:text-zinc-400">{p.studio.name}</td>}
                            <td className="p-3 text-zinc-500 dark:text-zinc-400 italic max-w-xs truncate" title={p.note ?? ""}>
                              {p.note || "–"}
                            </td>
                            {isManager && (
                              <td className="p-3 text-right">
                                <form action={handleDeletePicket}>
                                  <input type="hidden" name="id" value={p.id} />
                                  <Button
                                    type="submit"
                                    variant="ghost"
                                    size="icon"
                                    className="text-zinc-400 hover:text-red-600 h-8 w-8"
                                    title="Hapus Penugasan"
                                  >
                                    <Trash2 className="size-3.5" />
                                  </Button>
                                </form>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Right Column: Assign form & Info ── */}
        <div className="space-y-4">
          {isManager && (
            <PicketFormClient
              members={members}
              studioId={activeStudioId}
              studios={studios}
              monthKey={`${year}-${String(month).padStart(2, "0")}`}
              isSuperAdmin={isSuperAdmin}
            />
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="size-4 text-blue-700" />
                Ketentuan Piket
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-zinc-600 space-y-2 leading-relaxed">
              <p>
                📌 **Penugasan**: Piket harian studio bertugas menjaga kerapian area kerja, ruang meeting, dan mematikan peralatan elektronik di akhir shift.
              </p>
              <p>
                🔔 **Notifikasi**: Anggota yang ditugaskan akan langsung menerima notifikasi dalam aplikasi, serta pengingat email otomatis di hari H pukul 07.00 WIB.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
