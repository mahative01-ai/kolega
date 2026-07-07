import {
  CalendarDays,
  Clock,
  XCircle,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  User as UserIcon,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { DashboardShell } from "@/components/dashboard-shell";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { WorkdaySettingsClient } from "./workday-settings-client";
import { GeofenceSettingsClient } from "./geofence-settings-client";
import { createCalendarEventAction, deleteCalendarEventAction } from "../calendar/actions";
import { ProfileSettingsClient } from "./profile-settings-client";
import Link from "next/link";

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

const EVENT_TYPE_LABELS: Record<string, string> = {
  NATIONAL_HOLIDAY: "Libur Nasional",
  COMPANY_LEAVE: "Cuti Bersama",
  REGULAR_OFF_DAY: "Libur Final",
  REPLACEMENT_WORKDAY: "Hari Pengganti",
  STUDIO_EVENT: "Kegiatan Studio",
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  NATIONAL_HOLIDAY: "bg-red-100 text-red-700 border-red-200",
  COMPANY_LEAVE: "bg-orange-100 text-orange-700 border-orange-200",
  REGULAR_OFF_DAY: "bg-zinc-100 text-zinc-600 border-zinc-200",
  REPLACEMENT_WORKDAY: "bg-emerald-100 text-emerald-700 border-emerald-200",
  STUDIO_EVENT: "bg-blue-100 text-blue-700 border-blue-200",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; month?: string }>;
}) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const isSuperAdmin = user.role === "SUPER_ADMIN";
  const isGlobalSuperAdmin = user.role === "SUPER_ADMIN" && user.defaultStudioId === null;

  const activeTab = isSuperAdmin ? (params.tab ?? "profile") : "profile";

  const { year, month } = parseMonthKey(params.month);
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 0));

  // Only query system configurations if user is SUPER_ADMIN
  const [studios, daysOffEvents] = isSuperAdmin
    ? await Promise.all([
        prisma.studio.findMany({
          where: {
            isActive: true,
            ...(isGlobalSuperAdmin ? {} : { id: user.defaultStudioId ?? "__none__" })
          },
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            latitude: true,
            longitude: true,
            radiusMeters: true,
            weekStartDay: true,
            weeklyWorkRules: {
              select: {
                dayOfWeek: true,
                isWorkday: true,
                isOptional: true,
                workStartTime: true,
                workEndTime: true,
              },
              orderBy: { dayOfWeek: "asc" },
            },
            policies: {
              where: { isActive: true },
              select: {
                checkInTime: true,
                checkOutTime: true,
                graceMinutes: true,
                alphaCutoffTime: true,
              },
              take: 1,
            },
          },
        }),
        prisma.calendarEvent.findMany({
          where: {
            startDate: { lte: endDate },
            endDate: { gte: startDate },
            ...(isGlobalSuperAdmin
              ? {}
              : {
                  OR: [
                    { studioId: null },
                    { studioId: user.defaultStudioId ?? "__none__" }
                  ]
                }),
          },
          include: { studio: { select: { name: true } } },
          orderBy: { startDate: "asc" },
        }),
      ])
    : [[], []];

  // ── Days Off Add Action ──────────────────────────────────────────────────
  async function addDaysOffAction(formData: FormData) {
    "use server";
    const rawDate = formData.get("date") as string;
    const label = (formData.get("label") as string)?.trim() || "Hari Libur";
    const studioId = (formData.get("studioId") as string) || null;

    if (!rawDate) return;

    await createCalendarEventAction({
      type: "COMPANY_LEAVE",
      title: label,
      startDate: rawDate,
      endDate: rawDate,
      studioId,
    });
  }

  async function removeDaysOffAction(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    if (id) await deleteCalendarEventAction(id);
  }

  return (
    <DashboardShell
      user={user}
      currentPath="/settings"
      badge="Pengaturan"
      title="Pengaturan"
      description={
        isSuperAdmin
          ? "Kelola kata sandi profil, hari kerja, hari libur, dan geofence lokasi studio."
          : "Kelola profil pribadi dan kata sandi akun Kolega Anda."
      }
    >
      <Tabs defaultValue={activeTab}>
        {isSuperAdmin ? (
          <TabsList className="mb-6">
            <TabsTrigger
              value="profile"
              render={
                <a href="?tab=profile">
                  <UserIcon className="size-4 mr-1.5" />
                  Profil Saya
                </a>
              }
            />
            <TabsTrigger
              value="workday"
              render={
                <a href="?tab=workday">
                  <Clock className="size-4 mr-1.5" />
                  Hari Kerja
                </a>
              }
            />
            <TabsTrigger
              value="daysoff"
              render={
                <a href="?tab=daysoff">
                  <CalendarDays className="size-4 mr-1.5" />
                  Days Off
                </a>
              }
            />
            <TabsTrigger
              value="locations"
              render={
                <a href="?tab=locations">
                  <MapPin className="size-4 mr-1.5" />
                  Lokasi
                </a>
              }
            />
          </TabsList>
        ) : null}

        {/* ── Tab: Profil Saya ────────────────────────────────────────────── */}
        <TabsContent value="profile" className="mt-0">
          <ProfileSettingsClient initialUser={user} />
        </TabsContent>

        {isSuperAdmin ? (
          <>
            {/* ── Tab: Hari Kerja ────────────────────────────────────────────── */}
            <TabsContent value="workday" className="mt-0">
              <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-none">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-zinc-900 dark:text-zinc-50">
                    <Clock className="size-5 text-blue-700" />
                    Pengaturan Hari Kerja
                  </CardTitle>
                  <CardDescription>
                    Konfigurasikan hari mana yang dihitung sebagai hari kerja dan batas jam masuk/pulang.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <WorkdaySettingsClient studios={studios} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Tab: Days Off ──────────────────────────────────────────────── */}
            <TabsContent value="daysoff" className="mt-0">
              <div className="grid gap-6">
                {/* Add Day Off */}
                <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-none">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-zinc-900 dark:text-zinc-50">
                      <Plus className="size-5 text-red-600" />
                      Tambah Hari Libur
                    </CardTitle>
                    <CardDescription>
                      Tandai tanggal sebagai hari libur studio. Untuk libur nasional, gunakan halaman{" "}
                      <Link href="/calendar" className="text-blue-600 underline">
                        Kalender
                      </Link>.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form action={addDaysOffAction} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
                      <div className="grid gap-1.5">
                        <Label htmlFor="doff-date" className="text-zinc-700 dark:text-zinc-300">Tanggal</Label>
                        <Input id="doff-date" type="date" name="date" required />
                      </div>
                      <div className="grid gap-1.5">
                        <Label htmlFor="doff-label" className="text-zinc-700 dark:text-zinc-300">Label (opsional)</Label>
                        <Input
                          id="doff-label"
                          name="label"
                          placeholder="cth. Cuti Bersama"
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label htmlFor="doff-studio" className="text-zinc-700 dark:text-zinc-300">Studio</Label>
                        <Select name="studioId">
                          <SelectTrigger id="doff-studio">
                            <SelectValue placeholder="Pilih Studio">
                              {(val) => val ? (studios.find((s) => s.id === val)?.name || val) : (val === "" ? "🌐 Semua Studio (Global)" : undefined)}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {isGlobalSuperAdmin ? (
                              <SelectItem value="">🌐 Semua Studio (Global)</SelectItem>
                            ) : null}
                            {studios.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button type="submit">
                        <Plus className="size-4" />
                        Tambah Libur
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {/* Days Off List by Month */}
                <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-none">
                  <CardHeader className="flex-row items-center justify-between gap-2 pb-3">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-zinc-900 dark:text-zinc-50">
                        <XCircle className="size-5 text-red-500" />
                        {formatMonthLabel(year, month)}
                      </CardTitle>
                      <CardDescription className="mt-0.5">
                        {daysOffEvents.length} hari libur di bulan ini
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-1">
                      <a
                        href={`?tab=daysoff&month=${prevMonthKey(year, month)}`}
                        className={buttonVariants({ variant: "outline", size: "icon" })}
                      >
                        <ChevronLeft className="size-4" />
                      </a>
                      <a
                        href={`?tab=daysoff&month=${nextMonthKey(year, month)}`}
                        className={buttonVariants({ variant: "outline", size: "icon" })}
                      >
                        <ChevronRight className="size-4" />
                      </a>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {daysOffEvents.length === 0 ? (
                      <p className="py-6 text-center text-sm text-zinc-500">
                        Tidak ada hari libur di {formatMonthLabel(year, month)}.
                      </p>
                    ) : (
                      <div className="grid gap-2">
                        {daysOffEvents.map((ev) => {
                          const dateStr = new Intl.DateTimeFormat("id-ID", {
                            dateStyle: "full",
                            timeZone: TZ,
                          }).format(ev.startDate);
                          const colorClass = EVENT_TYPE_COLORS[ev.type] ?? "bg-zinc-100 text-zinc-600";
                          const isNational = ev.type === "NATIONAL_HOLIDAY";

                          return (
                            <div
                              key={ev.id}
                              className="flex items-center gap-3 rounded-lg border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3 shadow-sm"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{ev.title}</p>
                                <p className="text-xs text-zinc-500">{dateStr}</p>
                                <div className="mt-1 flex flex-wrap gap-1">
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] px-1.5 py-0 border ${colorClass}`}
                                  >
                                    {EVENT_TYPE_LABELS[ev.type] ?? ev.type}
                                  </Badge>
                                  {ev.studio ? (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                      {ev.studio.name}
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-zinc-400">
                                      Global
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              {!isNational && (
                                <form action={removeDaysOffAction}>
                                  <input type="hidden" name="id" value={ev.id} />
                                  <button
                                    type="submit"
                                    className="rounded p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                                    title="Hapus"
                                  >
                                    <Trash2 className="size-4" />
                                  </button>
                                </form>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <p className="mt-4 text-xs text-zinc-400">
                      {daysOffEvents.length} hari libur di {formatMonthLabel(year, month)}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ── Tab: Lokasi ────────────────────────────────────────────────── */}
            <TabsContent value="locations" className="mt-0">
              <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-none">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-zinc-900 dark:text-zinc-50">
                    <MapPin className="size-5 text-emerald-700" />
                    Studio & Geofence
                  </CardTitle>
                  <CardDescription>
                    Atur koordinat GPS dan radius geofence untuk studio Anda. Digunakan untuk validasi lokasi WFO.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <GeofenceSettingsClient studios={studios} />
                </CardContent>
              </Card>
            </TabsContent>
          </>
        ) : null}
      </Tabs>
    </DashboardShell>
  );
}
